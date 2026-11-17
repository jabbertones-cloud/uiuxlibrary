import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { siteFor, CAPTURE_SIZES, captureGate } from '../cloudflare/capture-policy.mjs';
import { installCaptureRoutes } from '../cloudflare/capture-route.mjs';

test('hosted capture only addresses source-controlled owned sites', () => {
  assert.equal(siteFor('aiscent').origin, 'https://aiscentmcp.com');
  assert.equal(siteFor('claimfix').origin, 'https://claimfix.smatdesigns.com');
  for (const invalid of ['http://169.254.169.254', 'https://example.org', '../secrets', 'not-a-site'])
    assert.throws(() => siteFor(invalid), /SITE_NOT_AUTHORIZED/);
  assert.deepEqual(CAPTURE_SIZES.phone, { width: 390, height: 844 });
  assert.deepEqual(CAPTURE_SIZES.desktop, { width: 1440, height: 900 });
});
test('Cloudflare resource gate rejects missing bindings and rate-limit refusal', async () => {
  await assert.rejects(captureGate({}), /CAPTURE_BINDING_MISSING/);
  await assert.rejects(captureGate({ MYBROWSER: {} }), /CAPTURE_BINDING_MISSING/);
  let calls = 0;
  const env = { MYBROWSER: {}, CAPTURE_LIMITER: { limit: async ({key}) => {
    assert.equal(key, 'owner-capture-v1'); calls++; return {success:false};
  }}};
  await assert.rejects(captureGate(env), /CAPTURE_RATE_LIMITED/);
  assert.equal(calls, 1);
  env.CAPTURE_LIMITER.limit = async () => ({success:true});
  await captureGate(env);
});
test('browser policy prevents cross-origin and non-GET traffic, retaining telemetry receipts', async () => {
  const counts = {blocked:0,telemetry:0,websocketBlocks:0,blockedHosts:new Set()};
  const ctx = {async route(pattern,fn){assert.equal(pattern,'**/*');this.accept=fn;},
    async routeWebSocket(pattern,fn){assert.equal(pattern,'**/*');this.acceptWs=fn;}};
  await installCaptureRoutes(ctx,'https://aiscentmcp.com',counts);
  const request = async(method,url)=>{
    let result='none';
    await ctx.accept({
      request:()=>({method:()=>method,url:()=>url}),
      continue:()=>{result='continued';},abort:()=>{result='blocked';}
    });
    return result;
  };
  assert.equal(await request('GET','https://aiscentmcp.com/'),'continued');
  assert.equal(await request('POST','https://aiscentmcp.com/auth'),'blocked');
  assert.equal(await request('GET','https://example.net/asset.js'),'blocked');
  assert.equal(await request('GET','https://static.cloudflareinsights.com/beacon.min.js/test'),'blocked');
  let wsClosed=false;ctx.acceptWs({close(){wsClosed=true;}});
  assert.equal(wsClosed,true);
  assert.equal(counts.blocked,2);
  assert.equal(counts.telemetry,1);
  assert.equal(counts.websocketBlocks,1);
  assert.deepEqual([...counts.blockedHosts],['aiscentmcp.com','example.net']);
});
test('WebSocket isolation is mandatory; no unguarded browser is allowed', async()=>{
  await assert.rejects(installCaptureRoutes({route:async()=>{}},'https://aiscentmcp.com',
    {blocked:0,telemetry:0,websocketBlocks:0,blockedHosts:new Set()}), /WEBSOCKET_CONTROL_UNAVAILABLE/);
});

test('hosted config declares distinct required public and owner secrets',()=>{
  const config = JSON.parse(readFileSync(new URL('../cloudflare/wrangler.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(config.secrets.required, ['MCP_BEARER_TOKEN', 'MCP_OWNER_TOKEN']);
  assert.equal(config.name, 'smat-uiux-mcp');
  assert.equal(config.routes.length, 1);
});
