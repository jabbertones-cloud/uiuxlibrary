import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
import { PNG } from 'pngjs';
import { withinWorkspace } from './receipt-gate.mjs';

const HASH = /^[0-9a-f]{64}$/;
export function verifyNativePng(shot, root) {
  if (typeof shot?.path !== 'string' || !HASH.test(shot.bytes_sha256 || ''))
    return { ok: false, reason: 'PNG_PROVENANCE_MISSING' };
  try {
    const rel = isAbsolute(shot.path) ? relative(root, shot.path) : shot.path;
    const file = withinWorkspace(rel, root);
    const size = statSync(file).size;
    if (size < 5000 || size > 50 * 1024 * 1024) return { ok: false, reason: 'PNG_SIZE_INVALID' };
    const bytes = readFileSync(file);
    if (createHash('sha256').update(bytes).digest('hex') !== shot.bytes_sha256)
      return { ok: false, reason: 'PNG_HASH_MISMATCH' };
    if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) || bytes.length < 24)
      return { ok: false, reason: 'PNG_HEADER_INVALID' };
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (width < 200 || height < 200 || width * height > 40000000)
      return { ok: false, reason: 'PNG_DIMENSIONS_INVALID' };
    const parsed = PNG.sync.read(bytes);
    if (parsed.width !== width || parsed.height !== height)
      return { ok: false, reason: 'PNG_DECODE_MISMATCH' };
    return { ok: true, width, height, sha256: shot.bytes_sha256 };
  } catch {
    return { ok: false, reason: 'PNG_MISSING_INVALID_OR_OUTSIDE_WORKSPACE' };
  }
}
