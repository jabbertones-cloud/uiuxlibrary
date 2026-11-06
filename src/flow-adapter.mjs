import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { authorizedUrl, installReadOnlyRoutes, parseOrigins } from './browser-adapter.mjs';

/** Deliberately limited to staging routes, and opted-in by server operator. */
export async function testStagingFlow(rawUrl, steps, opts = {}) {
  if (!opts.testMode && process.env.UIUX_ENABLE_FLOW_TESTING !== '1')
    throw new Error('Scripted actions disabled: set UIUX_ENABLE_FLOW_TESTING=1 for authorized staging only');
  const origins = opts.allowedOrigins || parseOrigins(process.env.UIUX_FLOW_ALLOW_ORIGINS || '');
  const url = authorizedUrl(rawUrl, origins);
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > 20)
    throw new Error('Flow must contain 1..20 declarative steps');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
  let blockedRequests = 0;
  await installReadOnlyRoutes(context, origins, () => { blockedRequests++; }, { staging: true });
  const page = await context.newPage();
  const outputDir = resolve(opts.evidenceDir || '.uiux-evidence');
  await mkdir(outputDir, { recursive: true });
  const observations = [];
  let status = 'PASS_SCRIPTED_ONLY';
  try {
    const first = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!first?.ok() || blockedRequests) throw new Error('Staging page failed to load with authorized assets');
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        if (step.action === 'click')
          await page.getByRole(step.role, { name: step.name, exact: true }).click({ timeout: 6000 });
        else if (step.action === 'fill')
          await page.getByLabel(step.label, { exact: true }).fill(step.value, { timeout: 6000 });
        else if (step.action === 'assertText')
          await page.getByText(step.text, { exact: true }).waitFor({ state: 'visible', timeout: 6000 });
        else throw new Error('Unsupported action');
        if (blockedRequests) throw new Error('Cross-origin request was blocked');
        observations.push({ step: i + 1, action: step.action, result: 'PASS' });
      } catch (e) {
        status = 'FAIL';
        observations.push({ step: i + 1, action: step?.action || 'unknown', result: 'FAIL', message: String(e.message).slice(0, 200) });
        break;
      }
    }
    const imagePath = resolve(outputDir, randomUUID() + '-flow.png');
    await page.screenshot({ path: imagePath, animations: 'disabled', fullPage: false });
    return {
      status, steps: observations, blockedRequests,
      screenshot: { path: relative(process.cwd(), imagePath), sha256: createHash('sha256').update(await readFile(imagePath)).digest('hex') },
      notVerified: ['unassisted_human_task_success', 'backend_side_effects', 'conversion', 'production_eligibility']
    };
  } finally { await context.close(); await browser.close(); }
}

