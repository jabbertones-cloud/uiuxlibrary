import { launch } from "@cloudflare/playwright";
const TARGET = "https://aiscentmcp.com/";
const NO_STORE = { "cache-control": "no-store" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({ service: "smat-uiux-browser-pilot", status: "isolated",
        version: env.PILOT_VERSION ?? "unversioned", target: "fixed-first-party" },
        { headers: NO_STORE });
    }
    if (url.pathname !== "/_internal/probe" || request.method !== "POST")
      return new Response("Not Found", { status: 404 });
    if (!env.PILOT_SECRET ||
        request.headers.get("Authorization") !== `Bearer ${env.PILOT_SECRET}`)
      return new Response("Unauthorized", { status: 401, headers: NO_STORE });
    if (!env.MYBROWSER)
      return Response.json({ status: "HOLD", reason: "browser_binding_missing" },
        { status: 503, headers: NO_STORE });

    let browser;
    try {
      browser = await launch(env.MYBROWSER);
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 15000 });
      const image = await page.screenshot({ type: "png", animations: "disabled" });
      const hash = await crypto.subtle.digest("SHA-256", image);
      const sha256 = [...new Uint8Array(hash)]
        .map(byte => byte.toString(16).padStart(2, "0")).join("");
      return new Response(image, { headers: {
        "content-type": "image/png", "x-uiux-sha256": sha256, ...NO_STORE } });
    } catch {
      return Response.json({ status: "HOLD", reason: "browser_runtime_unavailable" },
        { status: 503, headers: NO_STORE });
    } finally {
      await browser?.close().catch(() => {});
    }
  }
};
