#!/usr/bin/env node
/** Stdio-only MCP server. No HTTP listener, generic fetch, or shell execution. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt, withinWorkspace } from './receipt-gate.mjs';
import { auditPage } from './browser-adapter.mjs';
import { diffScreenshots } from './screenshot-diff.mjs';
import { judgeNativeCapture } from './native-judge.mjs';
import { compareNativeAudits } from './native-audit-diff.mjs';
import { nativeBinaryProof } from './native-binary-proof.mjs';
import { testStagingFlow } from './flow-adapter.mjs';
import { registerNativeTools } from './native-tools.mjs';
import { registerNativeTranslationTools } from './native-translation-tools.mjs';

const workspace = resolve(process.env.UIUX_WORKSPACE || process.cwd());
const output = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });
const held = e => ({ ...output({ status: 'HOLD', error: String(e.message).slice(0, 400) }), isError: true });

function readProjectJson(file) {
  return JSON.parse(readFileSync(withinWorkspace(file, workspace), 'utf8'));
}

function createServer() {
  const server = new McpServer({ name: 'smat-interface-lab', version: '0.3.0' });
  server.registerTool('uiux_audit_tokens', {
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description: 'Read DTCG tokens and enforce SMAT 3-tier reference policy. Structural only; not WCAG contrast.',
    inputSchema: z.object({ file: z.string().min(1) })
  }, async ({ file }) => {
    try { return output(auditTokens(readProjectJson(file))); }
    catch (e) { return held(e); }
  });
  server.registerTool('uiux_audit_page', {
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description: 'Sample five real browser viewports with Playwright + axe, screenshot hashes and actionable failures. Requires exact UIUX_ALLOW_ORIGINS. Automated only.',
    inputSchema: z.object({ url: z.url(), theme: z.enum(['light', 'dark']).default('light') })
  }, async ({ url, theme }) => {
    try { return output(await auditPage(url, { theme, evidenceDir: resolve(workspace, '.uiux-evidence') })); }
    catch (e) { return held(e); }
  });
  server.registerTool('uiux_diff_screenshots', {
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    description: 'Compare same-size PNGs under workspace with pixelmatch and hash the diff artifact. Never claims visual improvement.',
    inputSchema: z.object({ before: z.string().min(1), after: z.string().min(1), threshold: z.number().min(0).max(0.3).default(0.1) })
  }, async ({ before, after, threshold }) => {
    try { return output(diffScreenshots(before, after, workspace, { threshold })); }
    catch (e) { return held(e); }
  });
  server.registerTool('uiux_review_aiscent_native', {
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description: 'Read AiSCent God Mode capture-plan results for native iOS/iPadOS/macOS. Verify XCUITest screen identity, PNG bytes, matrix completeness and optional human-anchored rubric. Fail closed; no automatic visual score or TestFlight claims.',
    inputSchema: z.object({ capture: z.string().min(1), plan: z.string().min(1),
      review: z.string().min(1).optional() })
  }, async ({ capture, plan, review }) => {
    try {
      const payload = judgeNativeCapture(readProjectJson(capture), readProjectJson(plan),
        workspace, review ? readProjectJson(review) : undefined);
      return output(payload);
    } catch (e) { return held(e); }
  });
  server.registerTool('uiux_compare_native_audits', {
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description: 'Compare two verified AiSCent native captures with Apple audit findings, fail on any worsened category even if total decreases. Not a UX rating.',
    inputSchema: z.object({ beforeCapture: z.string().min(1), afterCapture: z.string().min(1), plan: z.string().min(1),
      beforeBinary: z.string().min(1).optional(), afterBinary: z.string().min(1).optional() })
  }, async ({ beforeCapture, afterCapture, plan, beforeBinary, afterBinary }) => {
    try {
      const spec = readProjectJson(plan);
      const before = judgeNativeCapture(readProjectJson(beforeCapture), spec, workspace);
      const after = judgeNativeCapture(readProjectJson(afterCapture), spec, workspace);
      if (Boolean(beforeBinary) !== Boolean(afterBinary))
        throw new Error('Both native binary files are required for accessibility-only comparisons');
      const binaryProof = beforeBinary && afterBinary ? {
        beforeSha: nativeBinaryProof(beforeBinary, workspace).sha256,
        afterSha: nativeBinaryProof(afterBinary, workspace).sha256
      } : {};
      return output(compareNativeAudits(before, after, binaryProof));
    } catch (e) { return held(e); }
  });
  server.registerTool('uiux_test_staging_flow', {
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    description: 'Opt-in deterministic Playwright staging task with accessible roles and labels. DISABLED by default. Not a substitute for real first-time human testing.',
    inputSchema: z.object({
      url: z.url(), steps: z.array(z.discriminatedUnion('action', [
        z.object({ action: z.literal('click'), role: z.enum(['button', 'link', 'tab', 'menuitem']), name: z.string().min(1) }),
        z.object({ action: z.literal('fill'), label: z.string().min(1), value: z.string().max(512) }),
        z.object({ action: z.literal('assertText'), text: z.string().min(1) })
      ])).min(1).max(20)
    })
  }, async ({ url, steps }) => {
    try { return output(await testStagingFlow(url, steps, { evidenceDir: resolve(workspace, '.uiux-evidence') })); }
    catch (e) { return held(e); }
  });
  server.registerTool('uiux_release_gate', {
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description: 'Validate SHA-bound evidence receipts and customer-outcome gates; NEVER independently certifies production or user testing.',
    inputSchema: z.object({ receipt: z.string().min(1), release: z.boolean().default(false) })
  }, async ({ receipt, release }) => {
    try { return output(assessReceipt(readProjectJson(receipt), workspace, { release })); }
    catch (e) { return held(e); }
  });
  server.registerTool('uiux_research_donors', {
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description: 'Read pinned research-only donor catalogue with licenses, source refs, and adoption caveats. Does not invoke donors.',
    inputSchema: z.object({})
  }, async () => output(JSON.parse(readFileSync(new URL('../docs/donors.json', import.meta.url), 'utf8'))));
  registerNativeTools(server, workspace);
  registerNativeTranslationTools(server, workspace);
  return server;
}

serveStdio(createServer);
