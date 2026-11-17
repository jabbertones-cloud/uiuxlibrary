# Interface Lab hosted owner capture: measured pilot and release gates

**Scope:** A real, owner-authorized Browser Run screenshot and accessibility-tree tool on an independent `/mcp-owner` endpoint. This does **not** turn Interface Lab into a commercial multi-tenant SaaS or replace its local 17-viewport audit.

## Confirmed baseline

* Existing hosted `https://uiux.smatdesigns.com/health`: version 0.3.0, two advertised read-only tools, old source `6c54581ab1579bdd1be477592f0ff67bb68269eb`. Provider readback confirmed **zero configured secrets**, including the required `MCP_BEARER_TOKEN`; therefore its authenticated `/mcp` endpoint cannot serve callers. This is a measured production activation blocker, not a working two-tool client baseline.
* Local code after PR #18: full 17-viewport Playwright/axe fleet runner and local MCP with independent 17-image receipt proof, merged main `5912d324ab77a657bb522c3ada02cd6a48fae4e8`.
* Isolated Cloudflare Browser Run experiment PR #19 merged at `2a0972a75031e458edde326e96d244e5c985148f`. Official `@cloudflare/playwright@1.4.0` and Wrangler `4.164.0` imported; pilot captured actual AiSCent PNG on both local workerd and Cloudflare remote preview, digest independently matched. No production routes changed in that experiment.

## Exact donor choices

* Official Cloudflare [Browser Run source](https://github.com/cloudflare/browser-run/tree/6bcf8351eaf74a1269a4bee1dcd34b28220dfeef/packages/playwright-cloudflare) and [sample Worker](https://github.com/cloudflare/browser-run/blob/6bcf8351eaf74a1269a4bee1dcd34b28220dfeef/packages/playwright-cloudflare/examples/todomvc/src/index.ts), Apache-2.0.
* Official `@modelcontextprotocol/server@2.4.0`: preserve same HTTP MCP handler pattern and two established public tools.
* Official Browser Run [Playwright MCP](https://developers.cloudflare.com/browser-run/playwright/playwright-mcp/): ARIA snapshots are supported source-backed evidence, not a visual model verdict.
* Existing Interface Lab `src/browser-adapter.mjs`: adopt proven exact-origin GET/HEAD policy and Cloudflare telemetry classification; WebSocket requests and service workers are disabled.

## Cloudflare remote preview results (2026-11-17)

1. Direct REST Browser Rendering token verification returned 401 Invalid API Token, but Wrangler could establish a remote Browser Run preview with its authorized session. Do not conflate these access modes.
2. Previewing the production Worker identity was blocked by Cloudflare zone limit: 64 existing zone routes vs 50 allowed for edge preview (error 100325). No routes were removed. Route-free `cloudflare/wrangler.preview.jsonc` successfully exercised the same code.
3. The official MCP client connected through the remote preview; the public `/mcp` still listed **exactly two tools**. A public [REDACTED] was rejected at `/mcp-owner` with HTTP 401.
4. Owner `/mcp-owner` listed three tools and captured a live AiSCent homepage PNG **390×844**, 73,367 bytes, with verified SHA-256 and an actual ARIA tree containing navigation, links and the heading.
5. ClaimFix captured at **1440×900** through the cloud browser with 142,749 PNG bytes and hash parity.
6. Cross-origin telemetry `static.cloudflareinsights.com/beacon.min.js` was blocked and reported as suppressed telemetry, not silently treated as an image dependency.
7. Direct `axe-core` injection was attempted on Cloudflare Browser Run but failed (`window.axe` missing and a remote evaluate `__name` error). It was removed. **Do not claim hosted Axe execution**. Full Axe WCAG-tagged checks remain in the separate, previously proven M1 17-viewport runner.

## Product contract

* `/mcp`: original code/contract for `MCP_BEARER_TOKEN`, which is currently missing in production and must be provisioned for first actual authenticated usage; `uiux_audit_tokens` and `uiux_research_donors` only.
* `/mcp-owner`: independent `MCP_OWNER_TOKEN`; adds `uiux_capture_owned_site` to the two static tools.
* Inputs: `siteId` from four checked-in SMAT website IDs, and `viewport` `phone` (390×844) or `desktop` (1440×900). No arbitrary URL, query path, browser navigation input, cookies, login or browser actions.
* Server outbound requests: same HTTPS site origin only, GET/HEAD only, Service Workers blocked, downloads refused, WebSocket requests closed. Cloudflare analytics beacon is intentionally aborted and accounted separately. Unexpected dependencies return HOLD.
* Each result contains actual PNG image content plus digest, observed document width, HTTP status, first heading, bounded ARIA tree, blocked-request receipts and explicit `notVerified` exclusions. Overflow and failed navigation return FAIL; successful capture returns `CAPTURE_ONLY`, **not** a WCAG or UX certification.
* Cloudflare rate limiting: four captures per 60 seconds, **approximate per Cloudflare location**. This does not guarantee a strict cost ceiling; a global Durable Object reservation is required before paid multi-tenant sale.

## Owner release contract

1. Merge exact PR head only after clean M1 Node tests, Worker dry-run and real remote-preview MCP acceptance.
2. Pull exact merged main, rerun the same checks and capture Cloudflare script/settings/deployments and active version ID to a private rollback snapshot.
3. Stage a new Worker version with exact `GIT_SHA`. Use the official `--secrets-file` flow to **provision both missing credentials** (`MCP_BEARER_TOKEN` and `MCP_OWNER_TOKEN`) in the staged version, with separate private operator-owned values. Do not overwrite unknown existing credentials without re-checking provider bindings first. Never print or commit either secret. Check required secrets and binding metadata before any production traffic change.
4. Use the versioned rollout (not a blind `wrangler deploy`). Do not change zone triggers or existing routes. After release, verify health SHA, public two-tool compatibility, owner three-tool catalog and an authenticated actual cloud-browser capture with image hash and ARIA.
5. If any acceptance fails, roll back to the exact recorded previous provider version and re-verify its live health, then file the failure. Never enable GitHub Actions.
6. Even after live owner acceptance, customer-access, payment, tenant isolation, strict quota, durable R2 evidence, retention, screenshot visual judging, and unassisted customer flow remain **HOLD** until independently proven.

## Research-lane disclosure

SMAT Research file search, GitHub Research CLI Pattern Card/TaskMap search and Research Fabric job `3c75548c-5a0e-4a33-9b99-936ed0ad35de` were consulted. The generic TaskMap returned mostly irrelevant patterns and Fabric explicitly reported `sufficient:false`; these are **not** counted as hosted browser implementation evidence. The verified implementation rests on the independently inspected Cloudflare official source and directly reproduced local/remote Worker behavior. No domain Expert MCP execution was claimed.
