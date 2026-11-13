/** Read-only summary of Apple XCTest audits, never an overall usability score. */
const TYPES = ['contrast', 'hitRegion', 'textClipped', 'elementDescription'];
export function summarizeNativeAccessibility(samples, expected, requested = false) {
  const counts = Object.fromEntries(TYPES.map(k => [k, 0]));
  let complete = 0, invalid = false;
  for (const sample of samples) {
    const audit = sample.audit;
    if (!audit) continue;
    if (audit.requested !== true || audit.completed !== true ||
        !audit.issue_counts || typeof audit.issue_counts !== 'object' ||
        Array.isArray(audit.issue_counts)) { invalid = true; continue; }
    if (Object.entries(audit.issue_counts).some(([key, n]) =>
        !TYPES.includes(key) || !Number.isSafeInteger(n) || n < 0 || n > 100000)) {
      invalid = true; continue;
    }
    complete++;
    for (const k of TYPES) counts[k] += audit.issue_counts[k] || 0;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const state = invalid || (requested && complete !== expected) ? 'UNVERIFIED' :
    complete === 0 ? 'NOT_RUN' :
    complete !== expected ? 'PARTIAL' :
    total > 0 ? 'FINDINGS_RECORDED' : 'NO_FINDINGS_RECORDED';
  return { state, source: 'Apple XCUIApplication.performAccessibilityAudit',
    auditedCells: complete, expectedCells: expected, issueCounts: counts, totalIssues: total,
    notProven: ['VoiceOver task completion', 'all accessibility barriers', 'overall UX score'] };
}
