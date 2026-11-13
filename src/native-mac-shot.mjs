import { verifyNativePng } from './native-image.mjs';

// Keep Mac capture provenance separate from simulator XCUITest proof.
const SOURCE = 'ApplicationServices.AXUIElement';
const MAC_SIZES = new Set(['1280x800', '1440x900', '2560x1600', '2880x1800']);
export function checkMacShot(row, cell, root) {
  if (!row || row.skipped || row.dry_run) return { ok: false, reason: 'SCREEN_NOT_CAPTURED' };
  if (row.wait_for !== cell.wait_for) return { ok: false, reason: 'SCREEN_ANCHOR_MISMATCH' };
  if (row.qa_ok !== true || row.settled !== true)
    return { ok: false, reason: 'SCREEN_IMAGE_QA_FAILED' };
  if (row.destination_verified !== true || row.page_identity_verified !== true)
    return { ok: false, reason: 'MAC_AX_IDENTITY_NOT_VERIFIED' };
  const w = row.ax_witness, before = w?.before, after = w?.after;
  if (!w || !before || !after || !Number.isSafeInteger(w.window_id) || w.window_id <= 0 ||
      w.png_sha256 !== row.bytes_sha256 ||
      !Number.isSafeInteger(before.pid) || before.pid < 2 || before.pid !== after.pid ||
      before.verified !== true || after.verified !== true ||
      before.source !== SOURCE || after.source !== SOURCE ||
      before.identifier !== cell.wait_for || after.identifier !== cell.wait_for)
    return { ok: false, reason: 'MAC_AX_WITNESS_BINDING_INVALID' };
  if (cell.required_visible_ids?.length)
    return { ok: false, reason: 'MAC_REQUIRED_VISIBLE_ELEMENT_UNVERIFIED' };
  const image = verifyNativePng(row, root);
  if (!image.ok) return image;
  if (!MAC_SIZES.has(cell.device))
    return { ok: false, reason: 'MAC_SCREEN_SIZE_INVALID' };
  const [expectedWidth, expectedHeight] = cell.device.split('x').map(Number);
  if (image.width !== expectedWidth || image.height !== expectedHeight)
    return { ok: false, reason: 'MAC_SCREEN_SIZE_MISMATCH' };
  if (Array.isArray(row.dimensions) &&
      (row.dimensions[0] !== image.width || row.dimensions[1] !== image.height))
    return { ok: false, reason: 'PNG_DIMENSIONS_NOT_RECEIPT_BOUND' };
  return { ok: true, image };
}
