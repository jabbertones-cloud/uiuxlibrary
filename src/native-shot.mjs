import { verifyNativePng } from './native-image.mjs';
export function checkNativeShot(row, cell, root) {
  if (!row || row.skipped === true || row.dry_run === true)
    return { ok: false, reason: 'SCREEN_NOT_CAPTURED' };
  if (row.wait_for !== cell.wait_for)
    return { ok: false, reason: 'SCREEN_ANCHOR_MISMATCH' };
  if (row.qa_ok !== true)
    return { ok: false, reason: 'SCREEN_IMAGE_QA_FAILED' };
  const witness = row.accessibility_witness;
  if (row.page_identity_verified !== true || !witness ||
      witness.page_identity_verified !== true ||
      witness.identifier !== cell.wait_for || witness.bundle_id !== cell.bundle_id ||
      typeof witness.element_type !== 'string' || !witness.element_type ||
      witness.element_type === 'any' ||
      witness.png_sha256 !== row.bytes_sha256 ||
      witness.simulator_udid !== row.simulator_udid ||
      typeof row.simulator_udid !== 'string' || !row.simulator_udid ||
      JSON.stringify(witness.tap_steps) !== JSON.stringify(cell.tap_steps) ||
      (cell.element_type && witness.element_type !== cell.element_type))
    return { ok: false, reason: 'XCUITEST_WITNESS_BINDING_INVALID' };
  const required = cell.required_visible_ids || [];
  const visible = witness.visible_requirements || [];
  if (!Array.isArray(visible) || visible.length !== required.length ||
      required.some((id, i) => visible[i]?.identifier !== id ||
        visible[i]?.hittable !== true ||
        typeof visible[i]?.label !== 'string' || !visible[i].label.trim()))
    return { ok: false, reason: 'XCUITEST_REQUIRED_VISIBLE_ELEMENT_MISSING' };
  if (row.destination_verified !== true)
    return { ok: false, reason: 'SCREEN_DESTINATION_UNVERIFIED' };
  const image = verifyNativePng(row, root);
  if (!image.ok) return image;
  if (Array.isArray(row.dimensions) && (row.dimensions[0] !== image.width || row.dimensions[1] !== image.height))
    return { ok: false, reason: 'PNG_DIMENSIONS_NOT_RECEIPT_BOUND' };
  return { ok: true, image };
}
