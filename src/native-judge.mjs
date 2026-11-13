import { nativeCellKey, nativeExpectedCells } from './native-plan.mjs';
import { checkNativeShot } from './native-shot.mjs';
import { recordedNativeRating } from './native-rating.mjs';
import { nativeRunContract } from './native-run-contract.mjs';
import { indexCaptureRows } from './native-index.mjs';
export function judgeNativeCapture(raw, plan, workspace, review) {
  const run = raw?.plan_results || raw;
  const expected = nativeExpectedCells(plan);
  const rows = Array.isArray(run?.results) ? run.results : [];
  const { issues: errors, platform } = nativeRunContract(run, plan);
  const indexed = indexCaptureRows(rows);
  const expectedKeys = new Set(expected.map(nativeCellKey));
  const verified = [], digests = new Map();
  for (const cell of expected) {
    const key = nativeCellKey(cell);
    const matched = indexed.get(key) || [];
    if (matched.length !== 1) { errors.push({ cell: key, code: 'MISSING_OR_DUPLICATE_CELL' }); continue; }
    const proof = checkNativeShot(matched[0], cell, workspace);
    if (!proof.ok) { errors.push({ cell: key, code: proof.reason }); continue; }
    if (digests.has(proof.image.sha256)) {
      errors.push({ cell: key, code: 'DUPLICATE_SCREEN_IMAGE', other: digests.get(proof.image.sha256) });
      continue;
    }
    digests.set(proof.image.sha256, key);
    verified.push({ cell: key, ...proof.image });
  }
  const unexpected = rows.filter(r => !expectedKeys.has(nativeCellKey(r)));
  if (unexpected.length) errors.push({ code: 'UNPLANNED_SCREEN_ROWS', count: unexpected.length });
  const rating = errors.length ? { score: null, state: 'NOT_RATED', reason: 'Capture evidence incomplete' }
    : recordedNativeRating(review, new Set(verified.map(v => v.cell)));
  return { status: errors.length ? 'HOLD' : 'SCREEN_CAPTURE_VERIFIED_ONLY', platform,
    bundleId: plan.app.bundle_id, matrixCells: expected.length, verifiedCells: verified.length,
    captureCoveragePercent: Number((100 * verified.length / expected.length).toFixed(1)),
    rating, findings: errors, screenshots: verified,
    notVerified: ['exact_testflight_binary', 'capture_provider_origin_independently_authenticated', 'visual_design_without_human_review',
      'accessibility_beyond_selected_anchor', 'user_task_success', 'production_readiness'] };
}
