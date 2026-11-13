/** Read-only summary of Apple XCTest audits, never an overall usability score. */
const TYPES = ['contrast', 'hitRegion', 'textClipped', 'elementDescription'];
const ROLES = ['staticText', 'button', 'other', 'navigationBar', 'textField', 'searchField'];
export function summarizeNativeAccessibility(samples, expected, requested = false) {
  const counts = Object.fromEntries(TYPES.map(k => [k, 0]));
  let complete = 0, invalid = false;
  const issueLocations = [];
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
    const positions = audit.issue_positions;
    if (positions !== undefined) {
      const totalCell = Object.values(audit.issue_counts).reduce((a, b) => a + b, 0);
      const locatedCounts = Object.fromEntries(TYPES.map(type => [type, 0]));
      if (Array.isArray(positions)) {
        for (const p of positions) {
          if (p && TYPES.includes(p.kind)) locatedCounts[p.kind]++;
        }
      }
      if (!Array.isArray(positions) || positions.length > Math.min(64, totalCell) ||
          TYPES.some(type => locatedCounts[type] > (audit.issue_counts[type] || 0)) ||
          positions.some(p => !p || !TYPES.includes(p.kind) ||
            !ROLES.includes(p.role) ||
            !Array.isArray(p.frame_points) || p.frame_points.length !== 4 ||
            p.frame_points.some((v, i) =>
              !Number.isSafeInteger(v) || v < 0 || v > 20000 ||
              (i >= 2 && v === 0)))) {
        invalid = true; continue;
      }
      for (const p of positions) issueLocations.push({
        cell: sample.cell, kind: p.kind, role: p.role, framePoints: p.frame_points
      });
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
    locatedIssues: issueLocations.length, issueLocations,
    locationsCoordinateSpace: 'iOS screen points, not PNG pixels',
    notProven: ['VoiceOver task completion', 'all accessibility barriers', 'overall UX score'] };
}
