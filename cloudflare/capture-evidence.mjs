const hex = buffer => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const noOverwrite = { onlyIf: { etagDoesNotMatch: '*' } };

export async function storeCaptureEvidence(env, png, facts, reservationId) {
  if (!env.CAPTURE_EVIDENCE) throw new Error('CAPTURE_BINDING_MISSING');
  if (png.byteLength < 64 || png.byteLength > 3000000) throw new Error('CAPTURE_IMAGE_SIZE');
  const shaBytes = await crypto.subtle.digest('SHA-256', png);
  const sha256 = hex(shaBytes);
  if (sha256 !== facts.sha256) throw new Error('CAPTURE_EVIDENCE_FAILURE');
  const key = 'owner/v1/' + reservationId, imageKey = key + '.png', receiptKey = key + '.json';
  const receipt = { schema: 'smat-capture-evidence/v1', scope: 'owner', capturedAt: new Date().toISOString(),
    reservationId, imageKey, sha256, facts };
  let imageCreated = false, receiptCreated = false;
  try {
    const image = await env.CAPTURE_EVIDENCE.put(imageKey, png, {
      ...noOverwrite, sha256: shaBytes, httpMetadata: { contentType: 'image/png', cacheControl: 'private, no-store' },
      customMetadata: { sha256, scope: 'owner' }
    });
    if (!image) throw new Error('CAPTURE_EVIDENCE_FAILURE');
    imageCreated = true;
    if (image.size !== png.byteLength) throw new Error('CAPTURE_EVIDENCE_FAILURE');
    const readback = await env.CAPTURE_EVIDENCE.get(imageKey);
    if (!readback?.body || hex(await crypto.subtle.digest('SHA-256', await readback.arrayBuffer())) !== sha256)
      throw new Error('CAPTURE_EVIDENCE_FAILURE');
    const record = await env.CAPTURE_EVIDENCE.put(receiptKey, JSON.stringify(receipt), {
      ...noOverwrite, httpMetadata: { contentType: 'application/json' }, customMetadata: { scope: 'owner', sha256 }
    });
    if (!record) throw new Error('CAPTURE_EVIDENCE_FAILURE');
    receiptCreated = true;
    if (!(await env.CAPTURE_EVIDENCE.head(receiptKey))) throw new Error('CAPTURE_EVIDENCE_FAILURE');
    return { scope: 'owner', imageKey, receiptKey, sha256, verifiedReadback: true, retentionDays: 7 };
  } catch {
    const ownedKeys = [imageCreated && imageKey, receiptCreated && receiptKey].filter(Boolean);
    if (ownedKeys.length) await env.CAPTURE_EVIDENCE.delete(ownedKeys).catch(() => {});
    throw new Error('CAPTURE_EVIDENCE_FAILURE');
  }
}
