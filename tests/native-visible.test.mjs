import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { nativeExpectedCells } from '../src/native-plan.mjs';
import { checkNativeShot } from '../src/native-shot.mjs';

function evidence() {
  const root=mkdtempSync(join(tmpdir(),'native-ui-'));
  const png=new PNG({width:600,height:800});
  for(let y=0;y<800;y++)for(let x=0;x<600;x++){
    const i=(y*600+x)*4,noise=((x*7+y*11)%29), v=y<300?205+noise%23:x<300?75+noise:150+noise;
    png.data[i]=v;png.data[i+1]=v;png.data[i+2]=v;png.data[i+3]=255;
  }
  const bytes=PNG.sync.write(png),sha=createHash('sha256').update(bytes).digest('hex');
  writeFileSync(join(root,'shot.png'),bytes);
  const row={name:'01-today',locale:'en-US',device:'iPhone 18 Pro',
    path:'shot.png',bytes_sha256:sha,simulator_udid:'sim-1',page_identity_verified:true,
    qa_ok:true,destination_verified:true,dimensions:[600,800],wait_for:'today.hero',
    accessibility_witness:{identifier:'today.hero',bundle_id:'com.smatdesigns.ezseller',
      element_type:'staticText',page_identity_verified:true,png_sha256:sha,
      simulator_udid:'sim-1',tap_steps:[],visible_requirements:[]}};
  const plan={version:1,app:{bundle_id:'com.smatdesigns.ezseller'},
    matrix:{locales:['en-US'],devices:['iPhone 18 Pro']},shots:[{name:'01-today',
    wait_for:'today.hero',required_visible_ids:['banner.reviewDemo']}]};
  return {root,row,plan};
}
test('requires same XCUITest witness to show sample badge',()=>{
  const {root,row,plan}=evidence();
  try{
    const cell=nativeExpectedCells(plan)[0];
    assert.equal(checkNativeShot(row,cell,root).reason,'XCUITEST_REQUIRED_VISIBLE_ELEMENT_MISSING');
    row.accessibility_witness.visible_requirements=[{identifier:'banner.reviewDemo',hittable:true,label:'Sample workspace'}];
    assert.equal(checkNativeShot(row,cell,root).ok,true);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects hidden, unlabeled, and mismatched sample identifiers',()=>{
  const {root,row,plan}=evidence(),cell=nativeExpectedCells(plan)[0];
  try{
    for(const proof of [{identifier:'banner.reviewDemo',hittable:false,label:'Sample'},
      {identifier:'banner.reviewDemo',hittable:true,label:' '},
      {identifier:'banner.other',hittable:true,label:'Sample'}]){
      row.accessibility_witness.visible_requirements=[proof];
      assert.equal(checkNativeShot(row,cell,root).reason,'XCUITEST_REQUIRED_VISIBLE_ELEMENT_MISSING');
    }
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('handles non-English labels and zero requirements',()=>{
  const {root,row,plan}=evidence();
  try{
    row.accessibility_witness.visible_requirements=[{identifier:'banner.reviewDemo',hittable:true,label:'サンプルワークスペース'}];
    assert.equal(checkNativeShot(row,nativeExpectedCells(plan)[0],root).ok,true);
    plan.shots[0].required_visible_ids=[];
    row.accessibility_witness.visible_requirements=[];
    assert.equal(checkNativeShot(row,nativeExpectedCells(plan)[0],root).ok,true);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('invalid visible-id plans fail before an evidence review',()=>{
  const {plan}=evidence();
  for(const bad of ['banner.reviewDemo',[42],[''],['dup','dup'],Array.from({length:13},(_,i)=>''+i)]){
    plan.shots[0].required_visible_ids=bad;
    assert.throws(()=>nativeExpectedCells(plan));
  }
});
