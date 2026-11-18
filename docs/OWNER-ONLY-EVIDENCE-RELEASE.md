# Interface Lab owner capture: durable receipts and hard quota

Status: **STAGED OWNER-ONLY**, not approved for general customer use.

## Reproduced baseline
- The production `uiux.smatdesigns.com` Worker health reports source `fc8cf8f438c0341dca116fc0ecb8f72b0ac6428b` and MCP tools public 2 / owner 3.
- Current production owner capture gives real PNG+ARIA, but does not write R2 receipts. Its `CAPTURE_LIMITER` 4/60s is approximate across Cloudflare locations and is not a strict cost limit.
- Source-controlled host allowlist and separate public/owner bearer scope remain unchanged; no customer tenant authorization exists.

## Native donors and design contract
- Pinned official Cloudflare documentation at `cloudflare/cloudflare-docs@74499239dac83affbd031acef145a4bf225c8da3`: [R2 in-Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [SQLite Durable Object transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [Rate Limiting accuracy](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), and [R2 object lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
- GitHub Research Pattern Card `cloudflare-browser-capture-durable-r2-strict-quota` merged in [research PR #51](https://github.com/jabbertones-cloud/githubresearchmcp/pull/51).
- Durable Object `CaptureQuota` uses one **owner-v1** name, native SQLite persistence and `transactionSync` to reserve at most 4 captures per rolling minute and 50 per rolling day. Every launch attempt permanently consumes the reservation to prevent retry-based spend bypasses. The approximate limiter remains supplemental.
- The R2 storage adapter validates the screenshot's WebCrypto SHA-256, performs conditional immutable PNG/JSON writes, independently retrieves image bytes and recomputes digest, and does not return successful MCP image content if storage fails. A partial-write cleanup deletes only keys created by the current attempt.
- Stage and production R2 bucket bindings are separate. Both buckets have independently verified 7-day lifecycle expiration and disabled `r2.dev` public access.

## Measured tests
- Local Cloudflare workerd SQLite test: 100 simultaneous reservations; **4 accepted and 96 denied**, persisted after a process restart.
- 5 focused evidence write/collision/failure tests: all pass, including pre-existing receipt preservation and corrupted readback rejection.
- Official MCP client connected to isolated Cloudflare staging Worker `smat-uiux-capture-preview`: public 2 tools, owner 3 tools, anonymous request 401, public bearer unable to access owner endpoint.
- Real AiSCent mobile Browser Run: 390×844 PNG, 73,367 bytes, image SHA-256 `51c6f19cf42863e09ee8425a19ce44c0a8901a0afb1b15f6602bcdf389d70350`. Returned MCP PNG and JSON receipt; independent `wrangler r2 object get --remote` for both private PNG and receipt independently recomputed the same digest. The provider's original staging deployment version was `9ce91a96-459f-41c6-8658-311183f287fe`.
- This receipt is a bounded real hosted-browser test, **not** an automated accessibility certification, human design verdict, commercial tenant test, billing proof, or customer flow.

## Release gates (no GitHub Actions)
1. Exact branch/HEAD: donor receipt completeness, source review, Unloopr and Lego Builder assessment, `npm test`, `npm run check`, `npm run audit:tokens`, `npm run bundle:cloudflare`, numerical quota and storage benchmark comparison.
2. Staging Worker must have distinct credentials, no production custom domain, distinct DO namespace, and `smat-uiux-owner-capture-stage-v1` bucket. Real MCP calls must return the expected public/owner tool catalogs, authorized PNG, confirmed ARIA, and independently verifiable private R2 objects.
3. Check 401 cross-scope, no arbitrary capture URL, no private object URL, concurrent quota cap/restart persistence, R2 outage/corruption/overwrite/partial recovery, stage browser size, independent provider SHA.
4. Only if all gates are proven, exact-HEAD -> merge -> exact-MAIN -> staged immutable version -> guarded owner-only production rollout -> independent source-SHA and authenticated live captures + R2 readback -> retain rollback version.
5. Keep **customer-facing commercial use HOLD** until verifiable per-tenant identity, billing/entitlements, separate tenant quotas/storage authority, independently demonstrated end-user task, and security review exist.

## Unproven
- Research Fabric's latest `uiuxlibrary` job `1ab20caa-e3a7-487e-afd9-934155b9ff4f` returned insufficient target-specific donor verification. Its generic repository finds do not establish an equivalent source port or measured speed/cost win.
- No real per-customer OAuth/authz/entitlement and no tenant-scoped retrieval tool. Only SMAT owner can request captures.
- Provider lifecycle expiration is eventual, not immediate proof that old objects were erased.
- A local four-of-100 concurrent test is not proof of a 100-request multi-region Cloudflare production soak.
