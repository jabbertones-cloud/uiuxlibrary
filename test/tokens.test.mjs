import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditTokens } from '../src/token-gate.mjs';
const load = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));

test('3-tier DTCG example passes structural checks only', () => {
  const x = auditTokens(load('../design-system/tokens.json'));
  assert.equal(x.status, 'PASS_STRUCTURAL_ONLY');
  assert.ok(x.tokenCount >= 10);
  assert.equal(x.errors.length, 0);
});
test('direct literal in semantic and wrong-tier component alias fail', () => {
  const x = auditTokens(load('../fixtures/bad-tokens.json'));
  assert.equal(x.status, 'FAIL');
  assert.ok(x.errors.some(e => e.code === 'MISSING_REQUIRED_REFERENCE'));
  assert.ok(x.errors.some(e => e.code === 'WRONG_TIER_REFERENCE'));
});
test('missing aliases and types fail', () => {
  const x = load('../design-system/tokens.json');
  x.semantic.surface.canvas.$value = '{primitive.color.deleted}';
  x.component.button.background.$type = 'dimension';
  const y = auditTokens(x);
  assert.equal(y.status, 'FAIL');
  assert.ok(y.errors.some(e => e.code === 'UNKNOWN_ALIAS'));
  assert.ok(y.errors.some(e => e.code === 'ALIAS_TYPE_MISMATCH'));
});
test('empty tiers and malformed docs fail closed', () => {
  for (const input of [null, { primitive: {}, semantic: {}, component: {} }, [], {}])
    assert.equal(auditTokens(input).status, 'FAIL');
});
