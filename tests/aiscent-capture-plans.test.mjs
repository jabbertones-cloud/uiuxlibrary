import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeExpectedCells} from '../src/native-plan.mjs';

function load(name) {
  return JSON.parse(readFileSync(new URL('../examples/'+name,import.meta.url),'utf8'));
}
test('AiSCent iPhone and iPad plan covers real five-tab interface',()=>{
  const plan=load('aiscent-ios-ipad-capture-plan.json');
  const cells=nativeExpectedCells(plan);
  assert.equal(plan.app.bundle_id,'com.smatdesign.localizeshots');
  assert.equal(cells.length,10);
  assert.deepEqual(new Set(cells.map(x=>x.wait_for)),new Set([
    'mobile.screen.today','mobile.screen.analytics','mobile.screen.apps',
    'mobile.screen.ask','mobile.screen.settings'
  ]));
  assert.deepEqual(cells[0].required_visible_ids,['mobile.today.connect.settings']);
});
test('AiSCent first-run plan enforces a tappable, enabled connection action',()=>{
  const plan=load('aiscent-ios-first-run-connection-plan.json');
  const cells=nativeExpectedCells(plan);
  assert.equal(cells.length,2);
  for (const cell of cells) {
    assert.equal(cell.wait_for,'mobile.today.connect.settings');
    assert.equal(cell.element_type,'button');
    assert.equal(cell.require_hittable,true);
  }
});
test('AiSCent macOS plan covers verified sidebar and page identities',()=>{
  const plan=load('aiscent-macos-capture-plan.json');
  const cells=nativeExpectedCells(plan);
  assert.equal(cells.length,12);
  assert.deepEqual(new Set(cells.map(x=>x.wait_for)),new Set([
    'screen.today','screen.growth','screen.metadata','screen.capture',
    'screen.translationReview','screen.agentActivity'
  ]));
  for(const shot of plan.shots) assert.ok(shot.reach.steps?.[0]?.tap?.id);
});

test('Mac agent-onboarding task checks destination after the tap, not button existence',()=>{
  const plan=load('aiscent-macos-agent-postaction-plan.json');
  const cells=nativeExpectedCells(plan);
  assert.equal(cells.length,2);
  for(const cell of cells) {
    assert.equal(cell.wait_for,'onboardingAgentPage');
    assert.deepEqual(cell.tap_steps,[{id:'today.open_agent'}]);
  }
});
test('a stale Welcome dialog cannot masquerade as successful agent setup',async()=>{
  const {checkMacShot}=await import('../src/native-mac-shot.mjs');
  const cell=nativeExpectedCells(load('aiscent-macos-agent-postaction-plan.json'))[0];
  const witness={pid:123,verified:true,source:'ApplicationServices.AXUIElement',identifier:'onboardingWelcomePage'};
  const row={wait_for:cell.wait_for,qa_ok:true,settled:true,
    destination_verified:true,page_identity_verified:true,bytes_sha256:'a'.repeat(64),
    ax_witness:{window_id:1,png_sha256:'a'.repeat(64),before:witness,after:witness}};
  assert.equal(checkMacShot(row,cell,'.').reason,'MAC_AX_WITNESS_BINDING_INVALID');
  assert.equal(checkMacShot({...row,wait_for:'onboardingWelcomePage'},cell,'.').reason,'SCREEN_ANCHOR_MISMATCH');
});
