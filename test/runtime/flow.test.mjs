import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { testStagingFlow } from '../../src/flow-adapter.mjs';

const good = readFileSync(new URL('fixtures/good.html', import.meta.url), 'utf8');
test('staging flow has explicit opt-in, observed success and a reproducible failure', { timeout: 90000 }, async () => {
  const server = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(good); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const options = { testMode: true, allowedOrigins: new Set([new URL(url).origin]), evidenceDir: mkdtempSync(join(tmpdir(), 'uiux-flow-')) };
  try {
    await assert.rejects(() => testStagingFlow(url, [{ action: 'assertText', text: 'First task' }]), /Scripted actions disabled/);
    const goodRun = await testStagingFlow(url, [
      { action: 'fill', label: 'Account', value: 'FAKE_LOCAL' },
      { action: 'click', role: 'button', name: 'Continue' },
      { action: 'assertText', text: 'Connected successfully' }
    ], options);
    assert.equal(goodRun.status, 'PASS_SCRIPTED_ONLY');
    assert.ok(goodRun.steps.every(s => s.result === 'PASS'));
    const badRun = await testStagingFlow(url, [{ action: 'assertText', text: 'Imaginary paid feature' }], options);
    assert.equal(badRun.status, 'FAIL');
    assert.equal(badRun.steps[0].result, 'FAIL');
    assert.ok(badRun.notVerified.includes('unassisted_human_task_success'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('staging flow never allows remote origin by accident', async () => {
  await assert.rejects(() => testStagingFlow('https://example.com', [{ action: 'assertText', text: 'Example' }], { testMode: true }), /Origin not allowed/);
});
