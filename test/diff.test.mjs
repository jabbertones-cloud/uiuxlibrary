import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';
import { diffScreenshots } from '../src/screenshot-diff.mjs';

function png(path, changed = false, width = 12) {
  const x = new PNG({ width, height: 12 });
  for (let i = 0; i < x.data.length; i += 4) {
    x.data[i] = 255; x.data[i + 1] = 255; x.data[i + 2] = 255; x.data[i + 3] = 255;
  }
  if (changed) { x.data[0] = 0; x.data[1] = 0; x.data[2] = 0; }
  writeFileSync(path, PNG.sync.write(x));
}
test('pixelmatch yields unchanged vs review-required artifacts, never automatic approval', () => {
  const root = mkdtempSync(join(tmpdir(), 'smat-uiux-diff-'));
  png(join(root, 'a.png')); png(join(root, 'b.png')); png(join(root, 'c.png'), true);
  const same = diffScreenshots('a.png', 'b.png', root);
  assert.equal(same.status, 'NO_PIXEL_DIFFERENCE');
  assert.equal(same.differentPixels, 0);
  assert.ok(existsSync(join(root, same.artifact.path)));
  const changed = diffScreenshots('a.png', 'c.png', root);
  assert.equal(changed.status, 'DIFFERENCE_REQUIRES_REVIEW');
  assert.ok(changed.differentPixels >= 1);
  assert.ok(changed.percentChanged > 0);
  assert.ok(changed.notVerified.includes('design_quality'));
});
test('different dimensions and workspace escape fail closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'smat-uiux-diff-'));
  png(join(root, 'a.png')); png(join(root, 'b.png'), false, 13);
  assert.equal(diffScreenshots('a.png', 'b.png', root).status, 'INCOMPARABLE');
  assert.throws(() => diffScreenshots('../../etc/passwd', 'b.png', root));
  assert.throws(() => diffScreenshots('a.png', 'b.png', root, { threshold: 5 }));
});
