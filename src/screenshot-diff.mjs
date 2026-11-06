import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { withinWorkspace } from './receipt-gate.mjs';

function screenshot(root, path) {
  const absolute = withinWorkspace(path, root);
  if (statSync(absolute).size > 50 * 1024 * 1024) throw new Error('PNG input exceeds 50 MiB limit');
  const img = PNG.sync.read(readFileSync(absolute));
  if (img.width * img.height > 40000000 || img.width === 0 || img.height === 0)
    throw new Error('Screenshot dimensions exceed audited limits');
  return img;
}

/** Pixelmatch is a regression signal, NOT evidence of design quality or correctness. */
export function diffScreenshots(before, after, root, { threshold = 0.1 } = {}) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 0.3)
    throw new Error('Pixel difference threshold must be between 0 and 0.3');
  const original = screenshot(root, before);
  const candidate = screenshot(root, after);
  if (original.width !== candidate.width || original.height !== candidate.height)
    return { status: 'INCOMPARABLE', reason: 'Screenshot dimensions differ', before: { width: original.width, height: original.height }, after: { width: candidate.width, height: candidate.height } };
  const diff = new PNG({ width: original.width, height: original.height });
  const mismatches = pixelmatch(original.data, candidate.data, diff.data, original.width, original.height, { threshold, includeAA: false });
  const outputDirectory = resolve(root, '.uiux-evidence');
  mkdirSync(outputDirectory, { recursive: true });
  const safeOutputDirectory = withinWorkspace('.uiux-evidence', root);
  const path = join(safeOutputDirectory, randomUUID() + '-diff.png');
  const bytes = PNG.sync.write(diff);
  writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
  return {
    status: mismatches === 0 ? 'NO_PIXEL_DIFFERENCE' : 'DIFFERENCE_REQUIRES_REVIEW',
    width: original.width, height: original.height, threshold,
    differentPixels: mismatches,
    percentChanged: Number((mismatches * 100 / (original.width * original.height)).toFixed(4)),
    artifact: { path: relative(root, path), sha256: createHash('sha256').update(bytes).digest('hex') },
    notVerified: ['intentional_change', 'semantic_behavior', 'design_quality', 'user_task_success']
  };
}

