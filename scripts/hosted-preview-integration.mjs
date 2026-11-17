#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { PNG } from 'pngjs';

const bearer = process.env.UIUX_PREVIEW_TOKEN;
const url = new URL(process.env.UIUX_PREVIEW_URL || 'http://127.0.0.1:8841/mcp-owner');
if (!bearer || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/mcp-owner')
  throw new Error('Use an authorized loopback Wrangler preview and an explicit token');
const unauthorized = await fetch(url, { method: 'POST' });
assert.equal(unauthorized.status, 401, 'Owner MCP must require authorization');
const publicToken = process.env.UIUX_PREVIEW_PUBLIC_TOKEN;
if (!publicToken) throw new Error('Original public MCP [REDACTED] is required for compatibility testing');
const wrongToken = await fetch(url, { method: 'POST', headers: {
  Authorization: 'Bearer ' + publicToken
}});
assert.equal(wrongToken.status, 401, 'Public MCP token cannot access owner capture');
const publicUrl = new URL(url); publicUrl.pathname = '/mcp';
const publicClient = new Client({name:'uiux-public-compat', version:'1.0.0'}, {capabilities:{}});
try {
  await publicClient.connect(new StreamableHTTPClientTransport(publicUrl, {
    requestInit: {headers:{Authorization:'Bearer ' + publicToken}}
  }));
  const existingTools = await publicClient.listTools();
  assert.deepEqual(existingTools.tools.map(x=>x.name), ['uiux_audit_tokens','uiux_research_donors']);
} finally { await publicClient.close(); }
const client = new Client({ name:'uiux-hosted-capture-test', version:'1.0.0' }, { capabilities:{} });
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: 'Bearer ' + bearer } }
});
try {
  await client.connect(transport);
  const catalog = await client.listTools();
  assert.deepEqual(catalog.tools.map(x => x.name), [
    'uiux_audit_tokens', 'uiux_research_donors', 'uiux_capture_owned_site'
  ]);
  const response = await client.callTool({ name:'uiux_capture_owned_site',
    arguments:{siteId:'aiscent',viewport:'phone'} }, undefined, { timeout:60000 });
  assert.notEqual(response.isError, true);
  const facts = JSON.parse(response.content.find(x => x.type === 'text').text);
  const bytes = Buffer.from(response.content.find(x => x.type === 'image').data, 'base64');
  const png = PNG.sync.read(bytes);
  assert.deepEqual([png.width,png.height],[390,844]);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), facts.sha256);
  assert.equal(facts.siteId,'aiscent');
  assert.equal(facts.status,'CAPTURE_ONLY');
  assert.equal(facts.blockedRequests,0);
  assert.ok(facts.ariaSnapshot?.includes('navigation'));
  assert.ok(facts.notVerified.includes('axe_rules'));
  console.log(JSON.stringify({result:'PASS_REMOTE_PREVIEW',site:facts.siteId,
    size:[png.width,png.height],bytes:bytes.length,shaVerified:true,
    ariaLength:facts.ariaSnapshot.length,blockedRequests:facts.blockedRequests,
    suppressedTelemetry:facts.suppressedTelemetryRequests}));
} finally { await client.close(); }
