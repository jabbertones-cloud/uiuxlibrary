import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { auditPage } from '../../src/browser-adapter.mjs';

const good = readFileSync(new URL('fixtures/good.html', import.meta.url), 'utf8');
const bad = readFileSync(new URL('fixtures/bad.html', import.meta.url), 'utf8');
async function fixtureServer() {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(req.url === '/bad' ? bad : good);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: 'http://127.0.0.1:' + server.address().port };
}
test('Chromium + axe accept readable fixture across five sampled viewports', { timeout: 90000 }, async () => {
  const { server, base } = await fixtureServer();
  try {
    const x = await auditPage(base + '/good', { allowedOrigins: new Set([base]), evidenceDir: mkdtempSync(join(tmpdir(), 'uiux-good-')) });
    assert.equal(x.status, 'PASS_AUTOMATED_ONLY');
    assert.deepEqual(x.results.map(y => y.width), [280, 320, 375, 768, 1440]);
    assert.ok(x.results.every(y => y.screenshot.sha256.length === 64));
    assert.ok(x.results.every(y => y.notVerified.includes('real_customer_task_success')));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('Chromium + axe reject accessibility violations and overflow with actionable evidence', { timeout: 90000 }, async () => {
  const { server, base } = await fixtureServer();
  try {
    const x = await auditPage(base + '/bad', { allowedOrigins: new Set([base]), evidenceDir: mkdtempSync(join(tmpdir(), 'uiux-bad-')) });
    assert.equal(x.status, 'FAIL');
    for (const y of x.results) {
      assert.equal(y.overflow, true);
      assert.ok(y.accessibilityViolations.some(v => v.id === 'button-name'));
      assert.ok(y.accessibilityViolations.some(v => v.id === 'color-contrast'));
      assert.ok(y.accessibilityViolations.some(v => v.helpUrl));
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('external and localhost origins blocked without explicit authorization', async () => {
  await assert.rejects(() => auditPage('https://example.com'), /Origin not allowed/);
  await assert.rejects(() => auditPage('http://127.0.0.1:3000'), /Origin not allowed/);
});

test('read-only inspection aborts same-origin POST attempts', { timeout: 90000 }, async () => {
  let mutations = 0;
  const html = good.replace('</body>', "<script>fetch('/mutate',{method:'POST'}).catch(()=>{});</script></body>");
  const server = createServer((req,res) => {
    if (req.method === 'POST') mutations++;
    res.writeHead(200, { 'content-type': 'text/html' }); res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const x = await auditPage(base, { allowedOrigins: new Set([base]), evidenceDir: mkdtempSync(join(tmpdir(), 'uiux-block-')) });
    assert.equal(x.status, 'FAIL');
    assert.ok(x.results.every(v => v.blockedRequests > 0));
    assert.equal(mutations, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
