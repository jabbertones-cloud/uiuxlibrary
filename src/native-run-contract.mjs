const XCUITEST = 'XCUITest accessibility identifier plus element attributes';
const MAC_AX = 'macOS AXUIElement identifier before and after screenshot';
export function nativeRunContract(run, plan) {
  const issues = [];
  const platform = run?.platform || (run?.screen_identity_source === XCUITEST ? 'ios' : null);
  if (run?.bundle_id !== plan.app.bundle_id) issues.push({ code: 'WRONG_APP_BUNDLE' });
  if (run?.dry_run !== false) issues.push({ code: 'DRY_RUN_NOT_EVIDENCE' });
  if (run?.completeness_gate?.pass !== true) issues.push({ code: 'AISCENT_COMPLETENESS_FAILED' });
  if (platform === 'mac') {
    if (run?.page_identity_verified !== true || run?.screen_identity_source !== MAC_AX)
      issues.push({ code: 'MAC_NATIVE_AX_WITNESS_MISSING' });
  } else if (!['ios', 'ipados'].includes(platform)) issues.push({ code: 'NOT_A_NATIVE_CAPTURE' });
  else if (run?.page_identity_verified !== true || run?.screen_identity_source !== XCUITEST)
    issues.push({ code: 'AISCENT_XCUITEST_WITNESS_MISSING' });
  return { issues, platform };
}
