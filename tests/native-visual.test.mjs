import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { nativeVisibleContent } from '../src/native-visual.mjs';
import { verifyNativePng } from '../src/native-image.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

function pngFixture(kind) {
  const img = new PNG({ width: 600, height: 800 });
  for (let y = 0; y < 800; y++) for (let x = 0; x < 600; x++) {
    const i = (y * 600 + x) * 4;
    let v = kind === 'white' ? 247 : 5;
    if (kind === 'header' && y < 120 && x > 100 && x < 350) v = 230;
    if (kind === 'dashboard' && y >= 150 && y < 700)
      v = x < 200 ? 40 : x < 400 ? 120 : 230;
    const noise = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
    v += noise % 7;
    img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
  }
  return PNG.sync.write(img);
}

for (const kind of ['black','white','header','dashboard']) {
  test('decoded native screen gate: '+kind, () => {
    const bytes=pngFixture(kind);
    const png=PNG.sync.read(bytes);
    const result=nativeVisibleContent(png);
    assert.equal(result.ok, kind==='dashboard', JSON.stringify(result));
    const root=mkdtempSync(join(tmpdir(),'uiux-visual-'));
    try {
      writeFileSync(join(root,'screen.png'),bytes);
      const r=verifyNativePng({path:'screen.png', bytes_sha256:createHash('sha256').update(bytes).digest('hex')},root);
      assert.equal(r.ok,kind==='dashboard',JSON.stringify(r));
      if(kind!=='dashboard')assert.equal(r.reason,'PNG_VISIBLE_CONTENT_EMPTY');
    } finally { rmSync(root,{recursive:true,force:true}); }
  });
}
