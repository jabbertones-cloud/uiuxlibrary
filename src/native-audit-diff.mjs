/** Compare only two independently verified native screenshot audit receipts. */
const CATEGORIES = ['contrast', 'hitRegion', 'textClipped', 'elementDescription'];
export function compareNativeAudits(before, after) {
  const eligible = r => r?.status === 'SCREEN_CAPTURE_VERIFIED_ONLY' &&
    ['FINDINGS_RECORDED', 'NO_FINDINGS_RECORDED'].includes(r.accessibilityAudit?.state) &&
    r.verifiedCells === r.matrixCells && r.verifiedCells > 0;
  if (!eligible(before) || !eligible(after) || before.bundleId !== after.bundleId ||
      before.platform !== after.platform || before.matrixCells !== after.matrixCells)
    return { status: 'HOLD', reason: 'UNVERIFIED_OR_INCOMPARABLE_CAPTURE' };
  const first = before.screenshots, second = after.screenshots;
  if (first.some((shot, i) => shot.cell !== second[i]?.cell))
    return { status: 'HOLD', reason: 'SCREEN_MATRIX_CHANGED' };
  if (first.every((shot, i) => shot.sha256 === second[i].sha256))
    return { status: 'HOLD', reason: 'IDENTICAL_SCREENSHOT_BYTES' };
  const changes = Object.fromEntries(CATEGORIES.map(key => [key, {
    before: before.accessibilityAudit.issueCounts[key] || 0,
    after: after.accessibilityAudit.issueCounts[key] || 0,
    delta: (after.accessibilityAudit.issueCounts[key] || 0) -
           (before.accessibilityAudit.issueCounts[key] || 0)
  }]));
  const regressionCategories = CATEGORIES.filter(key => changes[key].delta > 0);
  return { status: regressionCategories.length ? 'CATEGORY_REGRESSION' : 'NO_NEW_CATEGORY_FINDINGS',
    changeInTotalIssues: after.accessibilityAudit.totalIssues - before.accessibilityAudit.totalIssues,
    categories: changes, regressionCategories,
    notProven: ['causal UI improvement', 'human usability', 'TestFlight binary equivalence'] };
}
