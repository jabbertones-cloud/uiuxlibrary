import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { assessReceipt } from '../src/receipt-gate.mjs';

const SHA_1 = 'a'.repeat(40);
const SHA_2 = 'b'.repeat(40);
const gates = ['source_rights', 'tokens', 'component_behavior', 'accessibility', 'browser_responsive', 'visual_regression', 'human_visual', 'customer_task', 'production_proof'];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'smat-uiux-'));
  mkdirSync(join(root, 'proof'));
  const data = 'evidence: fixture only; not real customer proof';
  writeFileSync(join(root, 'proof', 'evidence.txt'), data);
  const ev = { path: 'proof/evidence.txt', sha256: createHash('sha256').update(data).digest('hex') };
  const rec = {
    schema: 'smat-uiux-receipt/v1', project: 'SMAT fixture', workType: 'redesign',
    baseline: { sha: SHA_1 }, candidate: { sha: SHA_2 },
    customerOutcome: { job: 'Import verified financial data', firstValue: 'See a reconciliation result' },
    gates: Object.fromEntries(gates.map(g => [g, { status: 'pass', evidence: [ev] }])),
    release: { mainSha: SHA_2, liveSha: SHA_2, url: 'https://example.com' }
  };
  rec.gates.human_visual.reviewer = { kind: 'human', id: 'fixture-reviewer' };
  rec.gates.customer_task.sessions = [1,2,3].map(n => ({ taskId: `task-${n}`, sessionProof: `fixture-${n}`, firstTime: true, success: true, operatorIntervention: false }));
  return { root, rec };
}

test('complete fixture produces only independent-review-required, not APPROVED', () => {
  const { root, rec } = fixture();
  const result = assessReceipt(rec, root, { release: true });
  assert.equal(result.status, 'EVIDENCE_COMPLETE_INDEPENDENT_REVIEW_REQUIRED');
  assert.equal(result.independentReviewerAuthenticated, false);
  assert.equal(result.liveDeploymentIndependentlyQueried, false);
});
test('missing browser evidence and deliberately stale files block', () => {
  const { root, rec } = fixture();
  rec.gates.browser_responsive.status = 'skip';
  assert.equal(assessReceipt(rec, root).status, 'HOLD');
  rec.gates.browser_responsive.status = 'pass';
  writeFileSync(join(root, 'proof/evidence.txt'), 'changed after audit');
  const result = assessReceipt(rec, root);
  assert.ok(result.errors.some(e => e.code === 'EVIDENCE_HASH_MISMATCH'));
});
test('fail closed without three first-time independent tasks', () => {
  const { root, rec } = fixture();
  rec.gates.customer_task.sessions[1].operatorIntervention = true;
  assert.ok(assessReceipt(rec, root).errors.some(e => e.code === 'TASK_OUTCOME_UNPROVEN'));
  rec.gates.customer_task.sessions = rec.gates.customer_task.sessions.slice(0, 2);
  assert.ok(assessReceipt(rec, root).errors.some(e => e.code === 'INSUFFICIENT_TASK_SESSIONS'));
});
test('model cannot self-approve human review', () => {
  const { root, rec } = fixture();
  rec.gates.human_visual.reviewer.kind = 'model';
  assert.ok(assessReceipt(rec, root).errors.some(e => e.code === 'HUMAN_VISUAL_UNVERIFIED'));
});
test('live SHA must match exact candidate and main', () => {
  const { root, rec } = fixture();
  rec.release.liveSha = SHA_1;
  assert.ok(assessReceipt(rec, root, { release: true }).errors.some(e => e.code === 'LIVE_SOURCE_MISMATCH'));
});
test('absolute evidence paths and symlink escapes are rejected', () => {
  const { root, rec } = fixture();
  rec.gates.tokens.evidence[0] = { ...rec.gates.tokens.evidence[0], path: '/etc/passwd' };
  assert.ok(assessReceipt(rec, root).errors.some(e => e.code === 'EVIDENCE_NOT_IN_WORKSPACE'));
  rec.gates.tokens.evidence[0].path = 'proof/escape';
  symlinkSync('/etc/passwd', join(root, 'proof/escape'));
  assert.ok(assessReceipt(rec, root).errors.some(e => e.code === 'EVIDENCE_NOT_IN_WORKSPACE'));
});
test('redesign cannot claim original SHA as its baseline', () => {
  const { root, rec } = fixture();
  rec.baseline.sha = SHA_2;
  assert.ok(assessReceipt(rec, root).errors.some(e => e.code === 'BASELINE_NOT_DISTINCT'));
});
