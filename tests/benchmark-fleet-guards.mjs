import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runFleetAudit as candidate } from '../src/fleet-audit.mjs';
import { DEFAULT_VIEWPORTS } from '../src/browser-adapter.mjs';

const base = 'ca971b85ae75b2a909ba5236bd28afffcb17d577';
const temp = mkdtempSync(resolve('tests', '.fleet-baseline-'));
const doc = {schema:'smat-uiux-fleet/v1', sites:[
  {id:'api-only',origin:'https://api-only.example.com',routes:['/'],themes:['light'],
    job:'Use the documented API endpoint and prove the user action',
    operational:{state:'API_ONLY',observedUrl:'https://api-only.example.com/',observedAt:'2026-11-17',claim:'A functional API route, not a human-facing app'}},
  {id:'redirect',origin:'https://redirect.example.com',routes:['/'],themes:['light'],
    job:'Complete the customer task on the destination site',
    operational:{state:'REDIRECT',observedUrl:'https://redirect.example.com/',observedAt:'2026-11-17',claim:'Root points at a distinct third-party service',redirectDestination:'https://external.example.com/'}}
]};
const fake = () => ({status:'PASS_AUTOMATED_ONLY',results:DEFAULT_VIEWPORTS.map(v=>({
  viewport:v.name,width:v.width,height:v.height,measuredViewportWidth:v.width,
  automatedStatus:'PASS_AUTOMATED_ONLY',httpStatus:200,overflow:false,
  blockedRequests:0,consoleErrors:0,accessibilityViolations:[] }))});
const auditCalls = [];
const audit = async url => {auditCalls.push(url);return fake();};
try{
  for(const path of ['fleet-audit.mjs','browser-adapter.mjs']){
    const source = execFileSync('git',['show',base+':src/'+path],{encoding:'utf8'});
    writeFileSync(join(temp,path),source);
  }
  const legacy=(await import(pathToFileURL(join(temp,'fleet-audit.mjs')).href)).runFleetAudit;
  const legacyReport=await legacy(doc,{outputDir:join(temp,'legacy'),audit});
  const baseline=auditCalls.length;
  assert.equal(baseline,2);
  auditCalls.length=0;
  const newReport=await candidate(doc,{outputDir:join(temp,'candidate'),audit});
  const promoted=auditCalls.length;
  assert.equal(promoted,0);
  assert.equal(newReport.totals.nonVisualRoutesSkipped,2);
  assert.ok(newReport.entries.every(x=>x.status==='HOLD'&&x.customerTaskStatus==='HOLD'));
  assert.ok(legacyReport.entries.every(x=>x.status==='PASS_AUTOMATED_ONLY'));
  console.log(JSON.stringify({metric:'non_visual_api_redirect_routes_submitted_to_visual_browser',
    baseline,candidate:promoted,direction:'lower',
    scenario:'same two API_ONLY/REDIRECT fixture sites; prior real git source vs candidate; injected identical 17-viewport audit'}));
}finally{rmSync(temp,{recursive:true,force:true})}
