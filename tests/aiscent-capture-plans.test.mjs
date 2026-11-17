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
