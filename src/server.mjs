#!/usr/bin/env node
/** Stdio-only MCP server. No HTTP listener, generic fetch tool, or code execution. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt, withinWorkspace } from './receipt-gate.mjs';
import { auditPage } from './browser-adapter.mjs';

const workspace = resolve(process.env.UIUX_WORKSPACE || process.cwd());
const output = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });

function readProjectJson(file) {
  return JSON.parse(readFileSync(withinWorkspace(file, workspace), 'utf8'));
}

function createServer() {
  const server = new McpServer({ name: 'smat-interface-lab', version: '0.1.0' });
  server.registerTool('uiux_audit_tokens', {
    description: 'Read a DTCG-format tokens file and enforce SMAT 3-tier token references. Structural only; never a WCAG contrast pass.',
    inputSchema: z.object({ file: z.string().min(1) })
  }, async ({ file }) => {
    try { return output(auditTokens(readProjectJson(file))); }
    catch (e) { return { ...output({ status: 'HOLD', error: e.message }), isError: true }; }
  });
  server.registerTool('uiux_audit_page', {
    description: 'Read-only Playwright/axe audit of allowlisted URL at phone/tablet/desktop sizes. Returns local evidence and explicit limitations.',
    inputSchema: z.object({ url: z.url(), theme: z.enum(['light', 'dark']).default('light') })
  }, async ({ url, theme }) => {
    try { return output(await auditPage(url, { theme })); }
    catch (e) { return { ...output({ status: 'HOLD', error: e.message }), isError: true }; }
  });
  server.registerTool('uiux_release_gate', {
    description: 'Validate SHA-bound evidence receipts and customer-outcome gates; NEVER independently certifies production or user testing.',
    inputSchema: z.object({ receipt: z.string().min(1), release: z.boolean().default(false) })
  }, async ({ receipt, release }) => {
    try { return output(assessReceipt(readProjectJson(receipt), workspace, { release })); }
    catch (e) { return { ...output({ status: 'HOLD', error: e.message }), isError: true }; }
  });
  server.registerTool('uiux_research_donors', {
    description: 'Read a pinned research-only donor catalogue with licenses, exact source refs, and adoption caveats. Does not invoke donors.',
    inputSchema: z.object({})
  }, async () => output(JSON.parse(readFileSync(new URL('../docs/donors.json', import.meta.url), 'utf8'))));
  return server;
}

serveStdio(createServer);
