# Interface Lab fleet: operational truth and adversarial audit (2026-11-17)

Baseline: `uiuxlibrary@fc8cf8f438c0341dca116fc0ecb8f72b0ac6428b` with live v0.4.0 Cloudflare owner-only browser capture; the public `/mcp` has exactly two tools and the owner `/mcp-owner` exactly three.

## Independently observed before-state

Read-only M3 six-homepage `playwright@1.65.1` / `axe-core` 17-viewport per-site run: `7d15fef8-5c15-4cd4-b31a-aca857cc8acf`. Six sources, 102 viewport cells. Results: USIPE FAIL (13 widths overflow; one anomalous 1366px HTTP/axe capture); SMAT Designs HOLD (blocked cross-origin resources); Gurlbye FAIL (280px overflow); Hoppa HOLD (blocked resources); RentViet PASS_AUTOMATED_ONLY (17/17); WaitPay FAIL (280-600px overflow). Independent report SHA receipts (respectively) `9ec11f2be387ba6f84e8070c5cbdb6e3ccbb4406a26054fcd9ad2440dcbc6465`, `54795f6d817f99b1bd391bd1ebd81a0611b1638aecb8e0ea56fef15b3dfe97a0`, `d2e9bf3914bb3d9ad9bbb520539a5ea4041892673650725d2961f77266e0ef18`, `7c3d6011addfd8cc5d838f7b27c552043dda2d36e902d2bf9869029c401b0822`, `f537814a62848882e792a5c38cc0e9c04b9558b0edd650f1c0f8ae5358413f22`, `c13202dea8c761119119b554bbb7ff36de18bdfbcd8ff5243d5b6464f2370ffd`.

All reports/screenshot PNGs remain untracked on M3 under `.uiux-evidence/fleet/<runId>`; do not publish them or mistake the 102-capture matrix for a human review. A single HTTP failure at USIPE 1366 does not prove a persistent service outage without repetition.

## Product-truth guard

`src/operational-truth.mjs` adds explicit `ACTIVE/PARKED/API_ONLY/REDIRECT/UNKNOWN`, a dated exact-route observation and distinct customer-task outcome `NOT_TESTED/HOLD`. It validates the observed route and redirect target against the source-controlled manifest. `runFleetAudit` skips API-only and redirect origins instead of running irrelevant homepage capture, retains their report receipts, explicitly labels `EXACT_ROUTE_ONLY`, and never upgrades a parked product to a customer success. `src/browser-adapter.mjs` uses Playwright `Request.redirectedFrom()` and final page URL to retain redirect evidence.

`examples/smat-mcp-fleet-expanded.json` records the four existing sites plus seven observed candidate sites, including the parked WaitPay and redirected legacy EzAmazon alias. The original hosted site allowlist and live Worker remain unchanged. The new manifest is for local audited operations only; it is not a multi-tenant authorization grant.

Adversarial tests reject forged observation URLs, wrong dates, wrong source paths, redirect to self, or a fake 200-based customer success. An automated check cannot verify payment, signup, onboarding, API implementation, ownership/authorization or customer outcomes.

## Research provenance

- Existing SMAT Research README and Interface Lab issue #22 checked. A dedicated Pattern Card was added as `githubresearchmcp` PR #48, merged at `b796cf92920f533ba9b523de2de3aadad9bf797f`; it names this exact source/audit risk, Playwright's Apache-2.0 API and expected negative tests
- Research Fabric `uiuxlibrary` jobs `4d6bb70c-ada5-4a1a-a709-a89c16bc6f57` and `3ed60079-3e3a-4516-9f02-6ccf2171cebe`: reported/inferred only; Fabric's generic `githubresearchmcp/src/scoring.ts` donor was falsified for lacking feature terms. Do not reuse this donor for browser authorization.
- SMAT Expert corpus-only: `smat-expert-mcps/tools/app-improvement/pilots/cleanquest-evidence/screenshots-followup/CRITIQUE.md` independently emphasizes exact screenshot/build versus uncaptured state; NOT a live Expert MCP call
- Primary Playwright `v1.65.1` source commit `bbd948344ea9a60bf1e6f125c02ca99b2b51593b` exposes redirect chain API. No separate homegrown browser implementation is introduced.

## Release distinction

This change does NOT implement customer-specific billing, durable R2 screenshot storage, tenant OAuth, per-tenant usage caps, visual human judgments, or real customer tasks. Those remain separate commercial blockers. Any claimed product completion requires first-time signed customer task after-state, browser evidence, exact live source and independent reviewer.
