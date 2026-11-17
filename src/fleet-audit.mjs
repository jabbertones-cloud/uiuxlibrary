/**
 * Explicit-origin, read-only website fleet dogfood.
 * Runs the already-vetted Playwright/axe audit, not a second browser engine.
 * Evidence is local; no automatic publishing, account writes, or visual scoring.
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { auditPage, DEFAULT_VIEWPORTS } from './browser-adapter.mjs';

const ID = /^[a-z][a-z0-9-]{0,47}$/;
const ROUTE = /^\/[A-Za-z0-9._~/-]*$/;
const STATUS = new Set(['FAIL', 'HOLD', 'PASS_AUTOMATED_ONLY']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function exactOrigin(value) {
  if (typeof value !== 'string' || value.length > 220) throw new Error('Invalid site origin');
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.href !== url.origin + '/')
    throw new Error('Provide only an exact origin, not a path, userinfo or query');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(url.hostname)))
    throw new Error('Use HTTPS, except explicitly allowlisted loopback development');
  return url.origin;
}

function safeRoute(value) {
  if (typeof value !== 'string' || !ROUTE.test(value) || value.startsWith('//') ||
      value.split('/').some(part => part === '.' || part === '..'))
    throw new Error('Routes must be simple same-origin paths without queries, fragments or traversal');
  return value;
}

export function validateFleetManifest(document, { siteId } = {}) {
  if (!document || typeof document !== 'object' || Array.isArray(document) ||
      document.schema !== 'smat-uiux-fleet/v1' || !Array.isArray(document.sites) ||
      document.sites.length < 1 || document.sites.length > 16)
    throw new Error('Expected smat-uiux-fleet/v1 with 1-16 sites');
  const seen = new Set();
  const sites = document.sites.map(site => {
    if (!site || !ID.test(site.id || '') || seen.has(site.id))
      throw new Error('Site IDs must be unique lowercase slugs');
    seen.add(site.id);
    const origin = exactOrigin(site.origin);
    const routes = site.routes ?? ['/'];
    if (!Array.isArray(routes) || !routes.length || routes.length > 8)
      throw new Error('Each site must have 1-8 routes');
    const checkedRoutes = routes.map(safeRoute);
    if (new Set(checkedRoutes).size !== checkedRoutes.length)
      throw new Error('Duplicate routes are not allowed');
    const themes = site.themes ?? ['light'];
    if (!Array.isArray(themes) || !themes.length || themes.length > 2 ||
        themes.some(t => !['light', 'dark'].includes(t)) ||
        new Set(themes).size !== themes.length)
      throw new Error('Only unique light/dark themes are allowed');
    if (typeof site.job !== 'string' || site.job.length < 8 || site.job.length > 240)
      throw new Error('Each site requires a bounded real customer job');
    return { id: site.id, origin, routes: checkedRoutes, themes, job: site.job };
  });
  const selected = siteId ? sites.filter(site => site.id === siteId) : sites;
  if (selected.length === 0) throw new Error('Unknown site ID');
  if (selected.reduce((n, site) => n + site.routes.length * site.themes.length, 0) > 24)
    throw new Error('Fleet is limited to 24 route/theme runs per invocation');
  return { schema: 'smat-uiux-fleet/v1', sites: selected };
}

function statusFor(result) {
  if (!result || !Array.isArray(result.results) ||
      result.results.length !== DEFAULT_VIEWPORTS.length)
    return 'HOLD';
  const identities = result.results.map(cell => cell.viewport);
  const expected = new Map(DEFAULT_VIEWPORTS.map(v => [v.name, v]));
  if (new Set(identities).size !== identities.length ||
      DEFAULT_VIEWPORTS.some(viewport => !identities.includes(viewport.name)) ||
      result.results.some(cell => {
        const v = expected.get(cell.viewport);
        return !v || !STATUS.has(cell.automatedStatus) ||
          cell.width !== v.width || cell.height !== v.height ||
          cell.measuredViewportWidth !== v.width;
      }))
    return 'HOLD';
  if (result.results.some(cell => cell.automatedStatus === 'FAIL') || result.status === 'FAIL')
    return 'FAIL';
  if (result.results.some(cell => cell.automatedStatus === 'HOLD') || result.status !== 'PASS_AUTOMATED_ONLY')
    return 'HOLD';
  return 'PASS_AUTOMATED_ONLY';
}

export function summarizeAudit(result) {
  const status = statusFor(result);
  const cells = Array.isArray(result?.results) ? result.results : [];
  const findings = new Map();
  const add = (kind, severity, width, detail) => {
    const key = kind + ':' + (detail?.id ?? '');
    let finding = findings.get(key);
    if (!finding) {
      finding = { kind, severity, widths: [], ...(detail ? { detail } : {}) };
      findings.set(key, finding);
    }
    if (Number.isSafeInteger(width) && !finding.widths.includes(width))
      finding.widths.push(width);
  };
  for (const cell of cells) {
    if (cell.overflow) add('HORIZONTAL_OVERFLOW', 'P1', cell.width);
    if (cell.blockedRequests > 0) add('ORIGIN_POLICY_BLOCKED', 'HOLD', cell.width);
    if (cell.consoleErrors > 0) add('BROWSER_CONSOLE_ERRORS', 'INVESTIGATE', cell.width);
    if (cell.httpStatus && cell.httpStatus >= 400) add('HTTP_RESPONSE_FAILED', 'P0', cell.width);
    for (const violation of cell.accessibilityViolations ?? []) {
      if (typeof violation.id !== 'string') continue;
      add('AXE_VIOLATION', ['critical', 'serious'].includes(violation.impact) ? 'P1' : 'P2',
        cell.width, { id: violation.id, impact: violation.impact, helpUrl: violation.helpUrl });
    }
  }
  return {
    status, sampledViewports: cells.length, expectedViewports: DEFAULT_VIEWPORTS.length,
    counts: { fail: cells.filter(c => c.automatedStatus === 'FAIL').length,
      hold: cells.filter(c => c.automatedStatus === 'HOLD').length,
      automatedOnly: cells.filter(c => c.automatedStatus === 'PASS_AUTOMATED_ONLY').length },
    findings: Array.from(findings.values()),
    notVerified: ['human_visual_quality', 'first_time_customer_task', 'conversion_outcome',
      'whole_site_accessibility', 'exact_live_deployment_identity']
  };
}

export async function runFleetAudit(document, options = {}) {
  const manifest = validateFleetManifest(document, { siteId: options.siteId });
  const runId = randomUUID();
  const evidenceDir = resolve(options.outputDir ??
    join(process.cwd(), '.uiux-evidence', 'fleet', runId));
  const audit = options.audit ?? auditPage;
  await mkdir(evidenceDir, { recursive: true });
  const entries = [];
  for (const site of manifest.sites) {
    for (const route of site.routes) {
      for (const theme of site.themes) {
        const url = new URL(route, site.origin).toString();
        const fileId = sha256(route).slice(0, 10);
        const siteDir = join(evidenceDir, site.id, fileId + '-' + theme);
        let raw;
        let error = null;
        try {
          raw = await audit(url, { theme, allowedOrigins: new Set([site.origin]), evidenceDir: siteDir });
        } catch (e) {
          error = String(e?.message || e).slice(0, 220);
          raw = { status: 'HOLD', results: [], error };
        }
        const bytes = JSON.stringify(raw);
        await mkdir(siteDir, { recursive: true });
        const reportFile = join(siteDir, 'browser-audit.json');
        await writeFile(reportFile, bytes);
        entries.push({ siteId: site.id, job: site.job, route, theme, url,
          ...summarizeAudit(raw), ...(error ? { error } : {}),
          evidence: { reportFile, sha256: sha256(bytes), screenshotDirectory: siteDir } });
      }
    }
  }
  const status = entries.some(entry => entry.status === 'FAIL') ? 'FAIL' :
    entries.some(entry => entry.status === 'HOLD') ? 'HOLD' : 'PASS_AUTOMATED_ONLY';
  const summary = {
    schema: 'smat-uiux-fleet-report/v1', runId, status,
    originPolicy: 'exact_origin_read_only', humanVisualReviewed: false, customerTasksObserved: false,
    manifestSha256: sha256(JSON.stringify(manifest)), reportDirectory: evidenceDir,
    totals: { siteCount: manifest.sites.length, routeThemeRuns: entries.length,
      sampledViewports: entries.reduce((n, e) => n + e.sampledViewports, 0),
      failedRoutes: entries.filter(e => e.status === 'FAIL').length,
      heldRoutes: entries.filter(e => e.status === 'HOLD').length },
    entries
  };
  await writeFile(join(evidenceDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  return summary;
}
