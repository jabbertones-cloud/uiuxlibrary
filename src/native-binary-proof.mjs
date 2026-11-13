/** Read-only evidence of current local binary bytes; not capture-time attestation. */
import { statSync } from 'node:fs';
import { withinWorkspace, sha256File } from './receipt-gate.mjs';
export function nativeBinaryProof(file, workspace) {
  const local = withinWorkspace(file, workspace);
  const stat = statSync(local);
  if (!stat.isFile() || stat.size < 1 || stat.size > 256 * 1024 * 1024)
    throw new Error('Native binary reference is not a bounded regular file');
  return { sha256: sha256File(local), bytes: stat.size };
}
