import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const portForTest = () => new Promise((resolve,reject)=>{
  const server=createServer();server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});
});
const start = async (port,dir) => {
  const args=['dev','--local','--port',String(port),'--ip','127.0.0.1',
    '--persist-to',dir,'--config','fixtures/wrangler.quota.jsonc','--log-level','error'];
  const child=spawn(join(root,'node_modules/.bin/wrangler'),args,{cwd:root,stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',b=>{logs=(logs+b).slice(-2000)});
  child.stderr.on('data',b=>{logs=(logs+b).slice(-2000)});
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('Wrangler exited: '+logs);
    try{const r=await fetch('http://127.0.0.1:'+port+'/health');if(r.ok)return child}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  child.kill();throw Error('Wrangler did not start: '+logs);
};
const stop = async child => {
  if(!child||child.exitCode!==null)return;
  const closed=new Promise(resolve=>child.once('exit',resolve));
  child.kill('SIGTERM');await closed;
};

test('Cloudflare SQLite Durable Object permits only four of 100 parallel captures and persists after restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'uiux-do-quota-')),port=await portForTest();
  let child;
  try{
    child=await start(port,dir);
    const url='http://127.0.0.1:'+port+'/reserve';
    const values=await Promise.all(Array.from({length:100},async()=>{
      const r=await fetch(url);assert.equal(r.status,200);return r.json();
    }));
    assert.equal(values.filter(x=>x.allowed).length,4);
    assert.equal(new Set(values.filter(x=>x.allowed).map(x=>x.id)).size,4);
    assert.ok(values.filter(x=>!x.allowed).every(x=>x.reason==='CAPTURE_QUOTA_EXCEEDED'));
    await stop(child);child=await start(port,dir);
    const next=await(await fetch(url)).json();
    assert.equal(next.allowed,false,'SQLite reservation must persist across process restart');
  } finally {await stop(child);rmSync(dir,{recursive:true,force:true})}
},{timeout:65000});
