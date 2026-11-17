#!/usr/bin/env node
/**
 * Full client -> stdio MCP -> real Playwright/axe -> local HTTP -> hash-bound
 * evidence acceptance. Zero external targets, identities, writes or Actions.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = mkdtempSync(join(tmpdir(), 'uiux-real-mcp-'));
const sum = bytes => createHash('sha256').update(bytes).digest('hex');
let hits = 0;
const server = createServer((req, res) => {
  hits++;
  if (req.method !== 'GET' || req.url !== '/') {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  return res.end('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Real Interface Lab MCP integration fixture</title>' +
    '<style>html{color:#18201e;background:#fff;font:16px system-ui}' +
    'body{max-width:720px;margin:0 auto;padding:24px}a{color:#154e90}</style></head><body>' +
    '<main><h1>Inspect a real customer page</h1>' +
    '<p>This local HTTP fixture is rendered by Chromium at 17 sizes.</p>' +
    '<a href="/">Learn more</a></main></body></html>');
});
let client;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = 'http://127.0.0.1:' + address.port;
  const manifest = {
    schema: 'smat-uiux-fleet/v1',
    sites: [
      { id: 'pilot', origin, routes: ['/'], themes: ['light'], job: 'Understand the sample and read the main link' },
      { id: 'unapproved', origin: 'https://example.com', routes: ['/'], themes: ['light'], job: 'Observe a forbidden origin before the browser runs' }
    ]
  };
  mkdirSync(join(workspace, 'configs'));
  writeFileSync(join(workspace, 'configs', 'fleet.json'), JSON.stringify(manifest));
  client = new Client({ name: 'uiux-fleet-real-proof', version: '1.0.0' }, { capabilities: {} });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [join(root, 'src', 'server.mjs')],
    env: { ...process.env, UIUX_WORKSPACE: workspace, UIUX_ALLOW_ORIGINS: origin }
  }));

  const catalog = await client.listTools();
  const tool = catalog.tools.find(item => item.name === 'uiux_audit_fleet');
  assert.ok(tool, 'Agent must discover the actual fleet audit tool');
  assert.ok(tool.inputSchema, 'Tool must expose a real input schema');

  const denied = await client.callTool({ name: tool.name,
    arguments: { manifest: 'configs/fleet.json', siteId: 'unapproved' } });
  assert.equal(denied.isError, true);
  const refusal = JSON.parse(denied.content[0].text);
  assert.equal(refusal.status, 'HOLD');
  assert.match(refusal.error, /not approved/i);
  assert.equal(hits, 0, 'Denied target must not trigger a browser request');

  const invalidPath = await client.callTool({ name: tool.name,
    arguments: { manifest: '/etc/passwd', siteId: 'pilot' } });
  assert.equal(invalidPath.isError, true);
  assert.equal(hits, 0, 'Path refusal must not trigger a browser request');

  const accepted = await client.callTool({ name: tool.name,
    arguments: { manifest: 'configs/fleet.json', siteId: 'pilot' } }, undefined,
    { timeout: 120000 });
  assert.notEqual(accepted.isError, true);
  const report = JSON.parse(accepted.content[0].text);
  assert.equal(report.status, 'PASS_AUTOMATED_ONLY');
  assert.equal(report.totals.siteCount, 1);
  assert.equal(report.totals.sampledViewports, 17);
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].status, 'PASS_AUTOMATED_ONLY');
  assert.equal(report.humanVisualReviewed, false);
  assert.equal(report.customerTasksObserved, false);
  assert.ok(hits >= 17, 'Expected at least 17 real HTTP page requests; saw ' + hits);

  const receipt = report.entries[0].evidence;
  const bytes = readFileSync(receipt.reportFile);
  assert.equal(sum(bytes), receipt.sha256, 'MCP output must match saved bytes');
  const raw = JSON.parse(bytes.toString());
  assert.equal(raw.results.length, 17);
  for (const viewport of raw.results) {
    assert.equal(viewport.automatedStatus, 'PASS_AUTOMATED_ONLY');
    assert.match(viewport.screenshot.sha256, /^[a-f0-9]{64}$/);
    const image = readFileSync(resolve(root, viewport.screenshot.path));
    assert.equal(sum(image), viewport.screenshot.sha256);
  }
  console.log(JSON.stringify({
    result: 'PASS', clientConnected: true, catalogTool: tool.name,
    refusedUnapprovedOrigin: true, refusedAbsoluteManifest: true,
    realHttpRequestCount: hits, realViewportCount: raw.results.length,
    rawReportHashVerified: true, screenshotHashesVerified: raw.results.length,
    status: report.status, humanApproved: false
  }));
} finally {
  await client?.close();
  await new Promise(ok => server.close(ok));
  rmSync(workspace, { recursive: true, force: true });
}
