import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const serverPath = fileURLToPath(new URL('../../src/server.mjs', import.meta.url));
async function withServer(fn) {
  const child = spawn(process.execPath, [serverPath], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { ...process.env, UIUX_WORKSPACE: fileURLToPath(new URL('../../', import.meta.url)) },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const pending = new Map();
  const stderr = [];
  child.stderr.on('data', chunk => stderr.push(chunk.toString()));
  const reader = createInterface({ input: child.stdout });
  reader.on('line', line => {
    try {
      const obj = JSON.parse(line);
      const x = pending.get(obj.id);
      if (x) { pending.delete(obj.id); x.resolve(obj); }
    } catch { /* stdout non-JSON cannot satisfy a request */ }
  });
  let id = 0;
  async function call(method, params = {}) {
    const requestId = ++id;
    const result = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('MCP timed out: ' + method + ' ' + stderr.join('')));
      }, 20000);
      pending.set(requestId, { resolve: obj => { clearTimeout(timeout); resolve(obj); } });
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n');
    return result;
  }
  try { await fn({ child, call }); }
  finally {
    reader.close(); child.stdin.end(); child.kill();
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 500))]);
  }
}
test('MCP initializes, lists six tools, runs token check and rejects unverified release/actions', { timeout: 60000 }, async () => {
  await withServer(async ({ child, call }) => {
    const init = await call('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smat-test', version: '1.0' } });
    assert.equal(init.result.serverInfo.name, 'smat-interface-lab');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const tools = await call('tools/list');
    assert.deepEqual(tools.result.tools.map(t => t.name).sort(), ['uiux_audit_page', 'uiux_audit_tokens', 'uiux_diff_screenshots', 'uiux_test_staging_flow', 'uiux_release_gate', 'uiux_research_donors'].sort());
    const token = await call('tools/call', { name: 'uiux_audit_tokens', arguments: { file: 'design-system/tokens.json' } });
    assert.equal(JSON.parse(token.result.content[0].text).status, 'PASS_STRUCTURAL_ONLY');
    const bad = await call('tools/call', { name: 'uiux_release_gate', arguments: { receipt: 'missing.json' } });
    assert.equal(bad.result.isError, true);
    assert.equal(JSON.parse(bad.result.content[0].text).status, 'HOLD');
    const action = await call('tools/call', { name: 'uiux_test_staging_flow', arguments: { url: 'http://127.0.0.1:3000', steps: [{ action: 'assertText', text: 'Test' }] } });
    assert.equal(action.result.isError, true);
    assert.match(JSON.parse(action.result.content[0].text).error, /Scripted actions disabled/);
    const page = await call('tools/call', { name: 'uiux_audit_page', arguments: { url: 'http://127.0.0.1:3000' } });
    assert.equal(page.result.isError, true);
    assert.match(JSON.parse(page.result.content[0].text).error, /Origin not allowed/);
    const donors = await call('tools/call', { name: 'uiux_research_donors', arguments: {} });
    assert.ok(JSON.parse(donors.result.content[0].text).sources.length >= 15);
  });
});
