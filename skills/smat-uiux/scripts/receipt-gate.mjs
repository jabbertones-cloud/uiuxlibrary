import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const COMMIT = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const DESIGN_GATES = ['source_rights', 'tokens', 'component_behavior', 'accessibility', 'browser_responsive', 'visual_regression', 'human_visual', 'customer_task'];

export function withinWorkspace(path, root) {
  const realRoot = realpathSync(root);
  const candidate = resolve(realRoot, path);
  if (isAbsolute(path)) throw new Error('Absolute evidence paths are forbidden');
  const realCandidate = realpathSync(candidate);
  const rel = relative(realRoot, realCandidate);
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Evidence escapes workspace');
  return realCandidate;
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Verifies evidence existence and *local file bytes*. It does NOT authenticate
 * the person who filled the receipt or independently verify live deployments.
 */
export function assessReceipt(receipt, root, { release = false } = {}) {
  const errors = [];
  const fail = (code, field) => errors.push({ code, field });
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt))
    return { status: 'HOLD', errors: [{ code: 'INVALID_RECEIPT', field: '$' }] };
  if (receipt.schema !== 'smat-uiux-receipt/v1') fail('WRONG_SCHEMA', 'schema');
  if (!receipt.project || typeof receipt.project !== 'string') fail('PROJECT_MISSING', 'project');
  if (!COMMIT.test(receipt.candidate?.sha || '')) fail('CANDIDATE_SHA_MISSING', 'candidate.sha');
  if (!['new', 'redesign'].includes(receipt.workType)) fail('WORK_TYPE_MISSING', 'workType');
  if (receipt.workType === 'redesign') {
    if (!COMMIT.test(receipt.baseline?.sha || '')) fail('BASELINE_SHA_MISSING', 'baseline.sha');
    if (receipt.baseline?.sha === receipt.candidate?.sha) fail('BASELINE_NOT_DISTINCT', 'baseline.sha');
  }
  if (!receipt.customerOutcome?.job || !receipt.customerOutcome?.firstValue)
    fail('CUSTOMER_OUTCOME_MISSING', 'customerOutcome');
  const required = release ? [...DESIGN_GATES, 'production_proof'] : DESIGN_GATES;
  for (const gate of required) {
    const item = receipt.gates?.[gate];
    if (!item || item.status !== 'pass') { fail('GATE_NOT_PASSED', `gates.${gate}`); continue; }
    if (!Array.isArray(item.evidence) || !item.evidence.length) {
      fail('NO_EVIDENCE', `gates.${gate}.evidence`); continue;
    }
    for (let i = 0; i < item.evidence.length; i++) {
      const ev = item.evidence[i];
      const field = `gates.${gate}.evidence.${i}`;
      if (!ev || typeof ev.path !== 'string' || !HASH.test(ev.sha256 || '')) { fail('BAD_EVIDENCE_REFERENCE', field); continue; }
      try {
        const verifiedPath = withinWorkspace(ev.path, root);
        if (sha256File(verifiedPath) !== ev.sha256) fail('EVIDENCE_HASH_MISMATCH', field);
      } catch { fail('EVIDENCE_NOT_IN_WORKSPACE', field); }
    }
  }
  const visual = receipt.gates?.human_visual;
  if (visual?.status === 'pass' && (visual.reviewer?.kind !== 'human' || !visual.reviewer?.id))
    fail('HUMAN_VISUAL_UNVERIFIED', 'gates.human_visual.reviewer');
  const task = receipt.gates?.customer_task;
  if (task?.status === 'pass') {
    const sessions = task.sessions;
    if (!Array.isArray(sessions) || sessions.length < 3) fail('INSUFFICIENT_TASK_SESSIONS', 'gates.customer_task.sessions');
    else if (sessions.some(s => s.firstTime !== true || s.success !== true || s.operatorIntervention !== false || !s.taskId || !s.sessionProof))
      fail('TASK_OUTCOME_UNPROVEN', 'gates.customer_task.sessions');
  }
  if (release) {
    if (!receipt.release || receipt.release.mainSha !== receipt.candidate?.sha || receipt.release.liveSha !== receipt.candidate?.sha)
      fail('LIVE_SOURCE_MISMATCH', 'release');
    if (!/^https:\/\//.test(receipt.release?.url || '')) fail('LIVE_URL_MISSING', 'release.url');
  }
  return {
    status: errors.length ? 'HOLD' : 'EVIDENCE_COMPLETE_INDEPENDENT_REVIEW_REQUIRED',
    evaluatedGates: required.length,
    evidenceIntegrityChecked: true,
    independentReviewerAuthenticated: false,
    liveDeploymentIndependentlyQueried: false,
    errors
  };
}
