import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNativeAccessibility } from '../src/native-accessibility.mjs';

test('no native audit is not a pass', () => {
  assert.equal(summarizeNativeAccessibility([{cell:'today'}], 1).state,'NOT_RUN');
  assert.equal(summarizeNativeAccessibility([{cell:'today'}], 1, true).state,'UNVERIFIED');
});
test('Apple contrast issues report facts, not a UX score', () => {
  const x=summarizeNativeAccessibility([{audit:{
    requested:true,completed:true,issue_counts:{contrast:2,hitRegion:1}}}],1,true);
  assert.equal(x.state,'FINDINGS_RECORDED');
  assert.deepEqual([x.issueCounts.contrast,x.issueCounts.hitRegion,x.totalIssues],[2,1,3]);
  assert.equal(x.score,undefined);
});
test('empty audit finding list is limited, not full accessibility', () => {
  const x=summarizeNativeAccessibility([{audit:{
    requested:true,completed:true,issue_counts:{}}}],1,true);
  assert.equal(x.state,'NO_FINDINGS_RECORDED');
  assert.ok(x.notProven.includes('VoiceOver task completion'));
});
test('incomplete and poisoned receipts never masquerade as quality', () => {
  const valid={audit:{requested:true,completed:true,issue_counts:{contrast:1}}};
  const failed={audit:{requested:true,completed:false,issue_counts:{contrast:0}}};
  assert.equal(summarizeNativeAccessibility([valid,failed],2,true).state,'UNVERIFIED');
  assert.equal(summarizeNativeAccessibility([valid],2,true).state,'UNVERIFIED');
  assert.equal(summarizeNativeAccessibility([valid,{}],2,false).state,'PARTIAL');
  assert.equal(summarizeNativeAccessibility([{audit:{
    requested:true,completed:true,issue_counts:{contrast:-1}}}],1,true).state,'UNVERIFIED');
  assert.equal(summarizeNativeAccessibility([{audit:{
    requested:true,completed:true,issue_counts:{unknown:1}}}],1,true).state,'UNVERIFIED');
});

test('real Apple audit locations have frame geometry, not private labels', () => {
  const x=summarizeNativeAccessibility([{cell:'en-US :: iPhone :: Today',audit:{
    requested:true,completed:true,issue_counts:{contrast:1,textClipped:1},
    issue_positions:[
      {kind:'contrast',role:'staticText',frame_points:[32,707,53,18]},
      {kind:'textClipped',role:'button',frame_points:[114,763,88,34]}]}}],1,true);
  assert.equal(x.state,'FINDINGS_RECORDED');
  assert.equal(x.locatedIssues,2);
  assert.deepEqual(x.issueLocations[0].framePoints,[32,707,53,18]);
  assert.equal(x.issueLocations[0].label,undefined);
});
test('invalid Apple audit coordinates fail closed without leaking labels', () => {
  const source = {requested:true,completed:true,issue_counts:{contrast:1}};
  for(const issue of [
    {kind:'contrast',role:'staticText',frame_points:[-1,2,30,17]},
    {kind:'contrast',role:'staticText',frame_points:[2,2,0,17]},
    {kind:'contrast',role:'staticText',frame_points:[2,2,'30',17]},
    {kind:'contrast',role:'private seller email',frame_points:[2,2,30,17]},
    {kind:'notAnAppleType',role:'staticText',frame_points:[2,2,30,17]},
    {kind:'textClipped',role:'staticText',frame_points:[2,2,30,17]}
  ]){
    const x=summarizeNativeAccessibility([{audit:{...source,issue_positions:[issue]}}],1,true);
    assert.equal(x.state,'UNVERIFIED');
    assert.equal(x.locatedIssues,0);
  }
});
