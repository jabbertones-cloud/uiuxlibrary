import { launch } from '@cloudflare/playwright';
import { CAPTURE_SIZES, siteFor } from './capture-policy.mjs';
import { installCaptureRoutes } from './capture-route.mjs';
import { storeCaptureEvidence } from './capture-evidence.mjs';

export async function captureOwnedSite(env, siteId, size, reservationId) {
  const site = siteFor(siteId), viewport = CAPTURE_SIZES[size];
  if (!viewport) throw new Error('UNSUPPORTED_VIEWPORT');
  const counts = { blocked: 0, telemetry: 0, websocketBlocks: 0, blockedHosts: new Set() };
  let browser;
  try {
    browser = await launch(env.MYBROWSER);
    const context = await browser.newContext({ viewport, serviceWorkers: 'block', acceptDownloads: false, bypassCSP: true });
    await installCaptureRoutes(context, site.origin, counts);
    const page = await context.newPage();
    const response = await page.goto(site.origin + '/', {
      waitUntil: 'domcontentloaded', timeout: 15000
    });
    const facts = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.trim().slice(0, 160) ?? null
    }));
    let ariaSnapshot = null;
    try { ariaSnapshot = (await page.locator('body').ariaSnapshot()).slice(0, 4000); }
    catch { /* not all page/adapters support ARIA snapshots */ }
    const png = await page.screenshot({ type: 'png', animations: 'disabled' });
    const digest = await crypto.subtle.digest('SHA-256', png);
    const sha256 = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    const result = { siteId, origin: site.origin, width: viewport.width, height: viewport.height,
      httpStatus: response?.status() ?? null, ...facts, blockedRequests: counts.blocked,
      suppressedTelemetryRequests: counts.telemetry, blockedHosts: [...counts.blockedHosts],
      blockedWebSockets: counts.websocketBlocks, ariaSnapshot, ariaStatus: ariaSnapshot ? 'CAPTURED' : 'HOLD', sha256, imageBytes: png.byteLength,
      status: !response?.ok() || facts.documentWidth > viewport.width ? 'FAIL'
        : counts.blocked || counts.websocketBlocks || !ariaSnapshot ? 'HOLD' : 'CAPTURE_ONLY',
      notVerified: ['axe_rules', 'human_visual_review', 'customer_task', 'other_viewports'] };
    result.evidence = await storeCaptureEvidence(env, png, result, reservationId);
    return { content: [{ type: 'text', text: JSON.stringify(result) },
      { type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' }] };
  } finally { await browser?.close().catch(() => {}); }
}
