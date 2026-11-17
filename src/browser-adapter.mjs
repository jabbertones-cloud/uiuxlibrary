import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

export const DEFAULT_VIEWPORTS = [
  { name: 'narrow-280', width: 280, height: 780 },
  { name: 'phone-small-320', width: 320, height: 568 },
  { name: 'phone-360', width: 360, height: 800 },
  { name: 'phone-375', width: 375, height: 812 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-large-414', width: 414, height: 896 },
  { name: 'compact-tablet-600', width: 600, height: 960 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
  { name: 'tablet-portrait-1024', width: 1024, height: 1366 },
  { name: 'tablet-landscape-1180', width: 1180, height: 820 },
  { name: 'tablet-landscape-1366', width: 1366, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 }
];

export function parseOrigins(value = '') {
  const origins = new Set();
  for (const raw of value.split(',').map(s => s.trim()).filter(Boolean)) {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash)
      throw new Error('Only exact HTTP(S) origins are permitted in allowlists');
    origins.add(url.origin);
  }
  return origins;
}

export function authorizedUrl(raw, origins) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !origins.has(url.origin))
    throw new Error('Origin not allowed. Set exact UIUX_ALLOW_ORIGINS explicitly, including localhost ports.');
  return url;
}

export function isNonUiTelemetryRequest(method, rawUrl, origins = new Set()) {
  let url;
  try { url = new URL(rawUrl); } catch { return false; }
  return (method === 'GET' && url.hostname === 'static.cloudflareinsights.com' && url.pathname.startsWith('/beacon.min.js')) ||
    (method === 'POST' && origins.has(url.origin) && url.pathname === '/cdn-cgi/rum');
}

export function pageAuditStatus({ httpOk, blockedRequests, consoleErrors, overflow, violations }) {
  const reasons = [];
  if (!httpOk) reasons.push('HTTP_RESPONSE_FAILED');
  if (overflow) reasons.push('HORIZONTAL_OVERFLOW');
  if (violations) reasons.push('ACCESSIBILITY_VIOLATIONS');
  if (blockedRequests) reasons.push('READ_ONLY_POLICY_BLOCKED_REQUESTS');
  if (consoleErrors) reasons.push('BROWSER_ERRORS_OBSERVED');
  const confirmedFailure = reasons.some(reason => [
    'HTTP_RESPONSE_FAILED', 'HORIZONTAL_OVERFLOW', 'ACCESSIBILITY_VIOLATIONS'
  ].includes(reason)) || (consoleErrors > 0 && blockedRequests === 0);
  return {
    status: confirmedFailure ? 'FAIL' : reasons.length ? 'HOLD' : 'PASS_AUTOMATED_ONLY',
    reasons
  };
}

export function installReadOnlyRoutes(context, origins, recordBlocked, { staging = false } = {}) {
  const record = request => recordBlocked(isNonUiTelemetryRequest(request.method(), request.url(), origins) ? 'telemetry' : 'blocked');
  // Playwright routing does not cover WebSockets. Block them separately.
  if (!staging && typeof context.routeWebSocket === 'function')
    context.routeWebSocket('**/*', ws => { recordBlocked('blocked'); ws.close(); });
  return context.route('**/*', route => {
    if (!staging && !['GET', 'HEAD'].includes(route.request().method())) {
      record(route.request());
      return route.abort('blockedbyclient');
    }
    try {
      const candidate = new URL(route.request().url());
      if (candidate.protocol === 'data:' || candidate.protocol === 'blob:' || origins.has(candidate.origin))
        return route.continue();
    } catch { /* fail closed */ }
    record(route.request());
    return route.abort('blockedbyclient');
  });
}

/** Read-only browser inspection using the maintained Playwright and axe libraries. */
export async function auditPage(rawUrl, opts = {}) {
  const origins = opts.allowedOrigins || parseOrigins(process.env.UIUX_ALLOW_ORIGINS || '');
  const url = authorizedUrl(rawUrl, origins);
  const { chromium } = await import('playwright');
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const browser = await chromium.launch({ headless: true });
  const evidenceDir = resolve(opts.evidenceDir || '.uiux-evidence');
  await mkdir(evidenceDir, { recursive: true });
  const runId = randomUUID();
  const results = [];
  try {
    for (const viewport of DEFAULT_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: opts.theme === 'dark' ? 'dark' : 'light',
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
        acceptDownloads: false
      });
      let blockedRequests = 0;
      let suppressedTelemetryRequests = 0;
      await installReadOnlyRoutes(context, origins, requestKind => {
        if (requestKind === 'telemetry') suppressedTelemetryRequests++;
        else blockedRequests++;
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', () => consoleErrors.push('uncaught_page_error'));
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('net::ERR_BLOCKED_BY_CLIENT'))
          consoleErrors.push('console_error');
      });
      const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000); // allow fonts and initial layout to settle; not a loading-state test
      const layout = await page.evaluate(() => ({
        measuredViewportWidth: window.innerWidth,
        bodyWidth: document.body?.scrollWidth || 0,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        focusableCount: document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length,
        documentTitlePresent: Boolean(document.title && document.title.trim())
      }));
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const violations = axe.violations.map(v => ({ id: v.id, impact: v.impact, affectedNodes: v.nodes.length, help: v.help, helpUrl: v.helpUrl, examples: v.nodes.slice(0, 3).map(n => ({ targets: n.target, failureSummary: n.failureSummary })) }));
      const overflow = layout.documentWidth > viewport.width + 1;
      const screenshot = resolve(evidenceDir, `${runId}-${viewport.name}-${opts.theme || 'light'}.png`);
      await page.screenshot({ path: screenshot, animations: 'disabled' });
      const sha256 = createHash('sha256').update(await readFile(screenshot)).digest('hex');
      const screenshotEvidence = { path: relative(process.cwd(), screenshot), sha256 };
      const judgment = pageAuditStatus({
        httpOk: response?.ok(), blockedRequests, consoleErrors: consoleErrors.length,
        overflow, violations: violations.length
      });
      results.push({
        viewport: viewport.name, width: viewport.width, height: viewport.height, theme: opts.theme || 'light',
        automatedStatus: judgment.status, statusReasons: judgment.reasons,
        httpStatus: response?.status() ?? null,
        overflow, blockedRequests, suppressedTelemetryRequests, consoleErrors: consoleErrors.length,
        ...layout,
        accessibilityViolations: violations,
        screenshot: screenshotEvidence,
        notVerified: ['keyboard_operation_of_every_control', 'human_visual_quality', 'below_fold_visual_quality', 'lazy_loaded_content_visual_review', 'real_customer_task_success', 'visual_regression_against_baseline']
      });
      await context.close();
    }
    return {
      status: results.some(r => r.automatedStatus === 'FAIL') ? 'FAIL'
        : results.some(r => r.automatedStatus === 'HOLD') ? 'HOLD' : 'PASS_AUTOMATED_ONLY',
      results
    };
  } finally {
    await browser.close();
  }
}
