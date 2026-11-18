import {test} from 'node:test';
import assert from 'node:assert/strict';
import {judgeNativeCapture} from '../src/native-judge.mjs';

test('native screen identity does not certify font glyph coverage across locales',()=>{
  const plan={version:1,app:{bundle_id:'com.smatdesign.localizeshots'},
    matrix:{locales:['en-US'],devices:['1280x800']},
    shots:[{name:'01-today',wait_for:'screen.today',reach:{steps:[{tap:{id:'sidebar.nav.today'}}]}}]};
  const result=judgeNativeCapture({bundle_id:plan.app.bundle_id,platform:'mac',
    dry_run:false,completeness_gate:{pass:false},results:[]},plan,'.');
  assert.equal(result.status,'HOLD');
  assert.ok(result.notVerified.includes('font_glyph_rendering_across_device_locales'));
  assert.equal(result.rating.state,'NOT_RATED');
});
