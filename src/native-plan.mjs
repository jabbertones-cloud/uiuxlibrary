const CELL = x => [x.locale, x.device, x.name].join(' :: ');
export const nativeCellKey = CELL;
export function nativeExpectedCells(plan) {
  if (plan?.version !== 1 || !/^[A-Za-z][A-Za-z0-9.-]+$/.test(plan?.app?.bundle_id || ''))
    throw new Error('Invalid AiSCent capture-plan v1 app identity');
  const { locales, devices } = plan.matrix || {};
  if (!Array.isArray(locales) || !locales.length || !Array.isArray(devices) || !devices.length ||
      !Array.isArray(plan.shots) || !plan.shots.length)
    throw new Error('Explicit locale x device x shot capture matrix required');
  if (![...locales, ...devices].every(x => typeof x === 'string' && x.length))
    throw new Error('Unresolved locale or device in capture matrix');
  const cells = locales.flatMap(locale => devices.flatMap(device =>
    plan.shots.map(shot => ({ locale, device, name: shot.name, wait_for: shot.wait_for,
      bundle_id: plan.app.bundle_id, tap_steps: (shot.reach?.steps || []).map(s => s.tap),
      element_type: shot.wait_for_traits?.element_type || '' }))));
  if (cells.length > 10000 || cells.some(x => !/^[0-9]{2}-[a-z0-9-]+$/.test(x.name || '') ||
      typeof x.wait_for !== 'string' || !x.wait_for))
    throw new Error('Invalid or oversized capture-plan matrix');
  if (new Set(cells.map(CELL)).size !== cells.length)
    throw new Error('Duplicate capture-plan cell');
  return cells;
}
