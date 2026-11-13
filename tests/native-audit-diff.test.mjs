import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareNativeAudits } from '../src/native-audit-diff.mjs';
function capture(sha, counts) {
  return { status:'SCREEN_CAPTURE_VERIFIED_ONLY', platform:'ios',
    bundleId:'com.smatdesigns.ezseller', matrixCells:1, verifiedCells:1,
    screenshots:[{cell:'en-US :: iPhone :: 01-today',sha256:sha}],
    accessibilityAudit:{state:'FINDINGS_RECORDED', issueCounts:counts,
      totalIssues:Object.values(counts).reduce((a,b)=>a+b,0)} };
}
const a=capture('a',{contrast:6,hitRegion:0,textClipped:6,elementDescription:3});
const b=capture('b',{contrast:6,hitRegion:1,textClipped:7,elementDescription:0});
const c=capture('c',{contrast:5,hitRegion:0,textClipped:7,elementDescription:0});
test('15 to 14 can still introduce new category regressions',()=>{
 const diff=compareNativeAudits(a,b);
 assert.equal(diff.status,'CATEGORY_REGRESSION');
 assert.equal(diff.changeInTotalIssues,-1);
 assert.deepEqual(diff.regressionCategories,['hitRegion','textClipped']);
 assert.equal(diff.score,undefined);
});
test('14 to 12 reduces audit findings with no newly worse category',()=>{
 const diff=compareNativeAudits(b,c);
 assert.equal(diff.status,'NO_NEW_CATEGORY_FINDINGS');
 assert.equal(diff.changeInTotalIssues,-2);
 assert.deepEqual(diff.regressionCategories,[]);
});
test('identical bytes and incompatible matrices fail closed',()=>{
 assert.equal(compareNativeAudits(a,a).reason,'IDENTICAL_SCREENSHOT_BYTES');
 assert.equal(compareNativeAudits({...a,bundleId:'other'},c).status,'HOLD');
 assert.equal(compareNativeAudits({...a,verifiedCells:0},c).status,'HOLD');
 assert.equal(compareNativeAudits({...a,accessibilityAudit:{state:'NOT_RUN'}},c).status,'HOLD');
 assert.equal(compareNativeAudits({...a,screenshots:[{cell:'other',sha256:'different'}]},c).reason,'SCREEN_MATRIX_CHANGED');
});
test('identical pixels with distinct local binaries are an accessibility-only candidate, not a UX score',()=>{
 const first=capture('same',{contrast:5,textClipped:7});
 const next=capture('same',{contrast:5,textClipped:0});
 const proof={beforeSha:'a'.repeat(64),afterSha:'b'.repeat(64)};
 assert.equal(compareNativeAudits(first,next).reason,'IDENTICAL_SCREENSHOT_BYTES');
 assert.equal(compareNativeAudits(first,next,{...proof,afterSha:proof.beforeSha}).status,'HOLD');
 assert.equal(compareNativeAudits(first,next,{beforeSha:'bad',afterSha:'c'.repeat(64)}).status,'HOLD');
 const diff=compareNativeAudits(first,next,proof);
 assert.equal(diff.status,'ACCESSIBILITY_ONLY_CANDIDATE');
 assert.equal(diff.sameScreenshotBytes,true);
 assert.equal(diff.changeInTotalIssues,-7);
 assert.deepEqual(diff.regressionCategories,[]);
 assert.ok(diff.notProven.includes('capture-time binary binding'));
 assert.equal(diff.score,undefined);
});
test('same pixels still flag worsened Apple categories with distinct local binary hashes',()=>{
 const before=capture('same',{contrast:3,textClipped:2});
 const after=capture('same',{contrast:3,textClipped:4});
 const diff=compareNativeAudits(before,after,{beforeSha:'a'.repeat(64),afterSha:'b'.repeat(64)});
 assert.equal(diff.status,'CATEGORY_REGRESSION');
 assert.deepEqual(diff.regressionCategories,['textClipped']);
});
