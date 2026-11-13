import { nativeCellKey } from './native-plan.mjs';
export function indexCaptureRows(rows) {
  const out = new Map();
  for (const row of rows) {
    const key = nativeCellKey(row);
    const prior = out.get(key) || [];
    prior.push(row);
    out.set(key, prior);
  }
  return out;
}
