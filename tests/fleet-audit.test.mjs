import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateFleetManifest, runFleetAudit, summarizeAudit } from '../src/fleet-audit.mjs';
import { DEFAULT_VIEWPORTS } from '../src/browser-adapter.mjs';

const site = { id:'pilot', origin:'https://example.com',
  job:'Find the real user onboarding task and finish it', routes:['/','/pricing'], themes:['light'] };
const manifest = { schema:'smat-uiux-fleet/v1', sites:[site] };
const cells = (mutate=()=>({})) => DEFAULT_VIEWPORTS.map((v,i)=>({
  viewport:v.name, width:v.width, height:v.height, measuredViewportWidth:v.width, automatedStatus:'PASS_AUTOMATED_ONLY',
  blockedRequests:0, consoleErrors:0, overflow:false, httpStatus:200,
  accessibilityViolations:[], ...mutate(v,i)
}));
const fake = (mutate) => ({ status:'PASS_AUTOMATED_ONLY', results:cells(mutate) });

test('manifest requires explicit HTTPS origins, real jobs and bounded route/theme runs', () => {
  assert.equal(validateFleetManifest(manifest).sites[0].origin,'https://example.com');
  for(const origin of ['http://example.com','https://example.com/pricing',
    'https://example.com?private=1','http://169.254.169.254','https://user:pass@example.com']) {
    assert.throws(()=>validateFleetManifest({ ...manifest, sites:[{ ...site, origin }] }));
  }
  assert.equal(validateFleetManifest({ ...manifest, sites:[{...site, origin:'http://127.0.0.1:8897'}] })
    .sites[0].origin,'http://127.0.0.1:8897');
  for(const route of ['//other.net','/../private','/x?token=secret','/%2e%2e/private','/x#frag']) {
    assert.throws(()=>validateFleetManifest({ ...manifest, sites:[{...site, routes:[route]}] }));
  }
  assert.throws(()=>validateFleetManifest({ ...manifest, sites:[site,{ ...site }] }));
  assert.throws(()=>validateFleetManifest(manifest,{siteId:'missing'}));
});

test('summaries preserve real FAIL even when a run is claimed green',()=>{
  const data = fake((v,i)=>i===0?{overflow:true,automatedStatus:'FAIL'}:{});
  const result = summarizeAudit(data);
  assert.equal(result.status,'FAIL');
  assert.deepEqual(result.findings.find(f=>f.kind==='HORIZONTAL_OVERFLOW').widths,[280]);
  const lying = fake();
  lying.results.pop();
  assert.equal(summarizeAudit(lying).status,'HOLD');
  const wrongSize = fake();
  wrongSize.results[0].measuredViewportWidth = 999;
  assert.equal(summarizeAudit(wrongSize).status,'HOLD');
  const numericViewport = fake();
  numericViewport.results[0].viewport = 280;
  assert.equal(summarizeAudit(numericViewport).status,'HOLD');
  const duplicate = fake();
  duplicate.results[1].viewport=duplicate.results[0].viewport;
  assert.equal(summarizeAudit(duplicate).status,'HOLD');
});

test('the fleet calls only the exact allowed origin, writes hashed reports, and never claims human review', async()=>{
  const dir = mkdtempSync(join(tmpdir(),'uiux-fleet-test-'));
  const observed = [];
  try{
    const summary=await runFleetAudit(manifest,{outputDir:dir,
      audit:async(url,options)=>{
        observed.push({url,origins:Array.from(options.allowedOrigins),theme:options.theme});
        return fake((v,i)=>i===3?{
          automatedStatus:'FAIL',
          accessibilityViolations:[{id:'color-contrast',impact:'serious',helpUrl:'https://dequeuniversity.com/rules/axe'}]
        }:{});
      }});
    assert.equal(summary.status,'FAIL');
    assert.equal(summary.totals.routeThemeRuns,2);
    assert.deepEqual(observed.map(x=>x.url),['https://example.com/','https://example.com/pricing']);
    assert.ok(observed.every(x=>JSON.stringify(x.origins)==='["https://example.com"]'));
    assert.equal(summary.entries[0].findings.find(x=>x.kind==='AXE_VIOLATION').severity,'P1');
    assert.equal(summary.humanVisualReviewed,false);
    assert.equal(summary.customerTasksObserved,false);
    for(const entry of summary.entries){
      const bytes=readFileSync(entry.evidence.reportFile);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.evidence.sha256);
    }
    assert.equal(existsSync(join(dir,'summary.json')),true);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('network/runtime errors and incomplete receipts become HOLD, not a false PASS', async()=>{
  const dir=mkdtempSync(join(tmpdir(),'uiux-fleet-failure-'));
  try{
    const result=await runFleetAudit({schema:'smat-uiux-fleet/v1',sites:[{...site,routes:['/']}]},
      {outputDir:dir,audit:async()=>{throw Error('browser launch failed')}});
    assert.equal(result.status,'HOLD');
    assert.equal(result.entries[0].error,'browser launch failed');
    assert.equal(result.entries[0].counts.automatedOnly,0);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
