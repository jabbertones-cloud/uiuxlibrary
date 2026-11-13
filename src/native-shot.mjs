import { verifyNativePng } from './native-image.mjs';
export function checkNativeShot(row, cell, root) {
  if (!row || row.skipped === true || row.dry_run === true)
    return { ok: false, reason: 'SCREEN_NOT_CAPTURED' };
  if (row.wait_for !== cell.wait_for)
    return { ok: false, reason: 'SCREEN_ANCHOR_MISMATCH' };
  if (row.qa_ok !== true)
    return { ok: false, reason: 'SCREEN_IMAGE_QA_FAILED' };
  if (row.page_identity_verified !== true ||
      !row.accessibility_witness || typeof row.accessibility_witness !== 'object')
    return { ok: false, reason: 'XCUITEST_IDENTITY_UNVERIFIED' };
  if (row.destination_verified !== true)
    return { ok: false, reason: 'SCREEN_DESTINATION_UNVERIFIED' };
  const image = verifyNativePng(row, root);
  if (!image.ok) return image;
  return { ok: true, image };
}
