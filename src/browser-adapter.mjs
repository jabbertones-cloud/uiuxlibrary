import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const DEFAULT_VIEWPORTS = [
  { name: 'narrow', width: 280, height: 780 },
  { name: 'small-phone', width: 320, height: 780 },
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
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

export function installReadOnlyRoutes(context, origins, recordBlocked, { staging = false } = {}) {
  // Playwright routing does not cover WebSockets. Block them separately.
  if (!staging && typeof context.routeWebSocket === 'function')
    context.routeWebSocket('**/*', ws => { recordBlocked(); ws.close(); });
  return context.route('**/*', route => {
    if (!staging && !['GET', 'HEAD'].includes(route.request().method())) {
      recordBlocked();
      return route.abort('blockedbyclient');
    }
    try {
      const candidate = new URL(route.request().url());
      if (candidate.protocol === 'data:' || candidate.protocol === 'blob:' || origins.has(candidate.origin))
        return route.continue();
    } catch { /* fail closed */ }
    recordBlocked();
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
      await installReadOnlyRoutes(context, origins, () => { blockedRequests++; });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', () => consoleErrors.push('uncaught_page_error'));
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push('console_error'); });
      const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(200); // settle immediate layout; not a complete loading-state test
      const layout = await page.evaluate(() => ({
        viewport: window.innerWidth,
        bodyWidth: document.body?.scrollWidth || 0,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        focusableCount: document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length,
        documentTitlePresent: Boolean(document.title && document.title.trim())
      }));
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const screenshot = resolve(evidenceDir, `${runId}-${viewport.name}-${opts.theme || 'light'}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
      const sha256 = createHash('sha256').update(await readFile(screenshot)).digest('hex');
      const violations = axe.violations.map(v => ({ id: v.id, impact: v.impact, affectedNodes: v.nodes.length, help: v.help, helpUrl: v.helpUrl, examples: v.nodes.slice(0, 3).map(n => ({ targets: n.target, failureSummary: n.failureSummary })) }));
      const overflow = layout.documentWidth > viewport.width + 1;
      const overHeightLimit = layout.documentHeight > 16000;
      const ok = response?.ok() && blockedRequests === 0 && consoleErrors.length === 0 && !overflow && !overHeightLimit && !violations.length;
      results.push({
        viewport: viewport.name, width: viewport.width, theme: opts.theme || 'light',
        automatedStatus: ok ? 'PASS_AUTOMATED_ONLY' : 'FAIL',
        httpStatus: response?.status() ?? null,
        overflow, overHeightLimit, blockedRequests, consoleErrors: consoleErrors.length,
        ...layout,
        accessibilityViolations: violations,
        screenshot: { path: relative(process.cwd(), screenshot), sha256 },
        notVerified: ['keyboard_operation_of_every_control', 'human_visual_quality', 'real_customer_task_success', 'visual_regression_against_baseline']
      });
      await context.close();
    }
    return { status: results.every(r => r.automatedStatus === 'PASS_AUTOMATED_ONLY') ? 'PASS_AUTOMATED_ONLY' : 'FAIL', results };
  } finally {
    await browser.close();
  }
}
