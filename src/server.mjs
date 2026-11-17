#!/usr/bin/env node
/** Stdio-only MCP server. No HTTP listener, generic fetch, or shell execution. */
import { readFileSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt, withinWorkspace } from './receipt-gate.mjs';
import { auditPage, parseOrigins } from './browser-adapter.mjs';
import { runFleetAudit, validateFleetManifest } from './fleet-audit.mjs';
import { diffScreenshots } from './screenshot-diff.mjs';
import { judgeNativeCapture } from './native-judge.mjs';
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
    description: 'Sample 17 phone, tablet portrait/landscape, laptop, and desktop browser sizes with Playwright + axe. Returns a viewport screenshot hash at each size; below-fold and lazy-loaded visual review is not included. Requires exact UIUX_ALLOW_ORIGINS. Automated only.',
    inputSchema: z.object({ url: z.url(), theme: z.enum(['light', 'dark']).default('light') })
  }, async ({ url, theme }) => {
    try { return output(await auditPage(url, { theme, evidenceDir: resolve(workspace, '.uiux-evidence') })); }
    catch (e) { return held(e); }
  });
  server.registerTool('uiux_audit_fleet', {
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description: 'Run real read-only Playwright/axe scans on 17 viewport sizes for up to two routes of one source-controlled SMAT site. Requires a workspace-local fleet manifest and the SERVER OPERATOR UIUX_ALLOW_ORIGINS. Writes SHA-bound local screenshots and evidence; returns FAIL/HOLD/PASS_AUTOMATED_ONLY, never a human visual verdict. This is LOCAL STDIO, not the hosted two-tool service.',
    inputSchema: z.object({
      manifest: z.string().min(1).max(260),
      siteId: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/).optional()
    })
  }, async ({ manifest, siteId }) => {
    try {
      const path = withinWorkspace(manifest, workspace);
      if (statSync(path).size > 32768) throw new Error('Fleet manifest exceeds 32 KiB');
      const payload = JSON.parse(readFileSync(path, 'utf8'));
      const selected = validateFleetManifest(payload, { siteId });
      const runs = selected.sites.reduce((n, site) => n + site.routes.length * site.themes.length, 0);
      if (runs > 2) throw new Error('Interactive MCP fleet audits are capped at two route/theme runs; use CLI for larger fleets');
      // This Set is configured by the service operator, never accepted from a model/tool argument.
      const approved = parseOrigins(process.env.UIUX_ALLOW_ORIGINS || '');
      const evidenceDir = resolve(workspace, '.uiux-evidence', 'fleet', randomUUID());
      const report = await runFleetAudit(payload, { siteId, allowedOrigins: approved, outputDir: evidenceDir });
      return output({ schema: report.schema, runId: report.runId, status: report.status,
        totals: report.totals, originPolicy: report.originPolicy,
        humanVisualReviewed: report.humanVisualReviewed, customerTasksObserved: report.customerTasksObserved,
        entries: report.entries.map(({ siteId, job, route, theme, status, counts, findings, evidence, notVerified }) =>
          ({ siteId, job, route, theme, status, counts, findings, evidence, notVerified })) });
    } catch (e) { return held(e); }
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
