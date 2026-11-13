import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { judgeNativeCapture } from '../src/native-judge.mjs';

const SOURCE='ApplicationServices.AXUIElement';
const MAC='macOS AXUIElement identifier before and after screenshot';
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'mac-native-ax-'));
  const png=new PNG({width:1280,height:800});
  for(let y=0;y<800;y++)for(let x=0;x<1280;x++){
    const i=(y*1280+x)*4,noise=(x*7+y*11)%29,v=y<300?205+noise%23:x<300?75+noise:150+noise;
    png.data[i]=v;png.data[i+1]=v;png.data[i+2]=v;png.data[i+3]=255;
  }
  const bytes=PNG.sync.write(png),sha=createHash('sha256').update(bytes).digest('hex');
  writeFileSync(join(root,'mac.png'),bytes);
  const witness={verified:true,source:SOURCE,pid:6123,identifier:'today.hero'};
  const row={name:'01-today',locale:'en-US',device:'1280x800',wait_for:'today.hero',
    path:'mac.png',bytes_sha256:sha,qa_ok:true,settled:true,
    page_identity_verified:true,destination_verified:true,
    ax_witness:{before:{...witness},after:{...witness},window_id:417,png_sha256:sha}};
  const plan={version:1,app:{bundle_id:'com.smatdesigns.ezseller'},
    matrix:{locales:['en-US'],devices:['1280x800']},
    shots:[{name:'01-today',wait_for:'today.hero'}]};
  const run={platform:'mac',bundle_id:'com.smatdesigns.ezseller',dry_run:false,
    page_identity_verified:true,screen_identity_source:MAC,
    completeness_gate:{pass:true},results:[row]};
  return {root,plan,run,row};
}
function withFixture(f) {const x=fixture();try{f(x);}finally{rmSync(x.root,{recursive:true,force:true});}}

test('macOS native AX and PNG proof: 1/1 accepted, audit remains unmeasured',()=>withFixture(({root,plan,run})=>{
  const r=judgeNativeCapture(run,plan,root);
  assert.equal(r.status,'SCREEN_CAPTURE_VERIFIED_ONLY',JSON.stringify(r.findings));
  assert.equal(r.verifiedCells,1);
  assert.ok(r.notVerified.includes('macos_accessibility_audit_not_run'));
}));

test('older mac window-only receipts remain on hold',()=>withFixture(({root,plan,run,row})=>{
  delete run.screen_identity_source;
  row.destination_verified=false;
  const r=judgeNativeCapture(run,plan,root);
  assert.equal(r.status,'HOLD');
  assert.ok(r.findings.some(f=>f.code==='MAC_NATIVE_AX_WITNESS_MISSING'));
}));

test('rejects lying AX witness process/identifier/source or image hash',()=>withFixture(({root,plan,run,row})=>{
  const mutations=[()=>{row.ax_witness.after.pid=7123;},()=>{row.ax_witness.before.identifier='orders.filter';},
    ()=>{row.ax_witness.before.source='untrusted';},()=>{row.ax_witness.png_sha256='0'.repeat(64);},
    ()=>{row.ax_witness.window_id=0;}];
  for(const mutate of mutations){
    const original=structuredClone(row.ax_witness);
    mutate();
    const r=judgeNativeCapture(run,plan,root);
    assert.equal(r.status,'HOLD');
    assert.ok(r.findings.some(f=>f.code==='MAC_AX_WITNESS_BINDING_INVALID'));
    row.ax_witness=original;
  }
}));

test('rejects Mac required-visible claims without matching same-capture proof',()=>withFixture(({root,plan,run})=>{
  plan.shots[0].required_visible_ids=['banner.reviewDemo'];
  const r=judgeNativeCapture(run,plan,root);
  assert.ok(r.findings.some(f=>f.code==='MAC_REQUIRED_VISIBLE_ELEMENT_UNVERIFIED'));
}));

test('rejects swapped screen bytes even with otherwise valid AX identifiers',()=>withFixture(({root,plan,run,row})=>{
  row.bytes_sha256='f'.repeat(64);row.ax_witness.png_sha256=row.bytes_sha256;
  const r=judgeNativeCapture(run,plan,root);
  assert.ok(r.findings.some(f=>f.code==='PNG_HASH_MISMATCH'));
}));

test('rejects duplicate screenshot bytes across different Mac desks',()=>withFixture(({root,plan,run,row})=>{
  plan.shots.push({name:'02-orders',wait_for:'orders.filter'});
  const other=structuredClone(row);other.name='02-orders';other.wait_for='orders.filter';
  other.ax_witness.before.identifier='orders.filter';other.ax_witness.after.identifier='orders.filter';
  run.results.push(other);
  const r=judgeNativeCapture(run,plan,root);
  assert.equal(r.status,'HOLD');
  assert.ok(r.findings.some(f=>f.code==='DUPLICATE_SCREEN_IMAGE'));
}));

test('fails closed when Mac PNG is the wrong requested screenshot size',()=>withFixture(({root,plan,run})=>{
  plan.matrix.devices=['1440x900'];run.results[0].device='1440x900';
  const r=judgeNativeCapture(run,plan,root);
  assert.ok(r.findings.some(f=>f.code==='MAC_SCREEN_SIZE_MISMATCH'));
}));

test('rejects unsupported Mac screenshot resolution even if pixels match',()=>withFixture(({root,plan,run})=>{
  plan.matrix.devices=['600x800'];run.results[0].device='600x800';
  const r=judgeNativeCapture(run,plan,root);
  assert.ok(r.findings.some(f=>f.code==='MAC_SCREEN_SIZE_INVALID'));
}));
