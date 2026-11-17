# Isolated Cloudflare Browser Run pilot

**Research-backed experiment, not a public Interface Lab feature.**

Purpose: prove that Cloudflare's maintained Playwright integration can render
one hardcoded first-party page and produce independently hash-verifiable PNG
bytes in a Worker. No customer URL, tenant identity, form, paid subscription,
site write, or production MCP routing is accepted.

## Donor provenance

- Official Cloudflare [Browser Run repository](https://github.com/cloudflare/browser-run)
  at pinned commit `6bcf8351eaf74a1269a4bee1dcd34b28220dfeef`
  and `packages/playwright-cloudflare/examples/todomvc/src/index.ts`.
- Package: `@cloudflare/playwright@1.4.0` (Apache-2.0) and
  `wrangler@4.164.0`. Pinned via `package-lock.json`.
- Official [Worker Playwright guide](https://developers.cloudflare.com/browser-run/playwright/)
  specifies `nodejs_compat`, compatible date, and browser binding.
- Official [Quick Action snapshot API](https://developers.cloudflare.com/api/resources/browser_rendering/subresources/snapshot/methods/create/)
  requires Browser Rendering Write. Session/Quick Action product API permissions
  are separate from ordinary Worker deployment.

## Independent proof (2026-11-17 UTC, SMAT M1)

1. `npm install`, `npm run check`: 2 local guardrail tests pass.
2. `npm run bundle`: Wrangler 4.164.0 dry-run succeeds. Worker bundle
   4.5MB with the official MYBROWSER binding.
3. `wrangler dev --local --ip 127.0.0.1 --port 8798` booted the **real**
   local Workers runtime, using Wrangler's local Browser Run implementation.
4. Unauthenticated `POST /_internal/probe` returned 401. Authorized request
   with a locally generated secret returned PNG HTTP 200, **390x844 px**, 79,061
   bytes; both response header and independently calculated digest:
   `21b07a33f04bd9b593d35212a46d7d994157126ced88658e66f5a4326f519936`.
5. Direct Browser Run REST snapshot and `wrangler browser list` using the
   available M1 credential failed 401; Cloudflare token verification said
   `Invalid API Token`. M2 did not expose a token or Wrangler executable.
   **Remote Browser Run access is NOT verified.**

These are **local browser rendering and code bundle proofs only**, not live
Cloudflare Browser Run evidence, paid customer acceptance, WCAG compliance, or
a fleetwide 17-size/axe audit. The existing hosted `uiux.smatdesigns.com/mcp`
remains untouched and still advertises two read-only tools.

## Fail-closed boundaries

The only page target is `https://aiscentmcp.com/`, fixed in the source. The
only browser endpoint is `POST /_internal/probe`; it denies access if
`PILOT_SECRET` is absent or invalid. It cannot accept a user-provided target
or follow agent-generated instructions. The `/health` route gives pilot
identity but does not execute the browser. `workers_dev=false` and no routes
in Wrangler config prevent public production exposure. The local .dev.vars
file is excluded from Git and must not be published.

The Worker captures one screenshot at 390x844 and returns PNG bytes with their
SHA-256 header. It does not persist output to R2 or store customer data. Do
not promote this to a customer-facing endpoint. A single pilot [REDACTED] is
not multi-tenant authorization. Remote browser-side network egress, redirects,
domain ownership, quotas, concurrency, durable job state, retention and
billing are NOT yet acceptance-tested.

## Reproduce without production changes

    cd experiments/browser-run
    npm ci
    npm run check
    npm run bundle
    # Optional local smoke: use owner-private .dev.vars with PILOT_SECRET
    npm run dev

Do not run `wrangler deploy` or modify the existing hosted Interface Lab
Worker as a shortcut. Before live pilot authorization, use an isolated Worker
identity, a secret manager, verified Browser Rendering account permission and
a bounded, source-pinned live probe. Then add durable storage, ownership
proof, tenant isolation and operator acceptance before offering a hosted tool.

## Release contract

Baseline main `5912d324ab77a657bb522c3ada02cd6a48fae4e8`.
Proof steps for future release: exact HEAD -> real Worker binary and browser
smoke -> merge -> exact MAIN -> isolated provider version -> provider-bound
live capture -> adversarial review. Never use GitHub Actions.
