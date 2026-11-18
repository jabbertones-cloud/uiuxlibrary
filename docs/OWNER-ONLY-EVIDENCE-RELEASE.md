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
- MCP annotation: this owner-only tool is **not read-only** (each call consumes quota and creates durable R2 objects), non-idempotent, additive-only and external-content-aware. Clients should never silently auto-approve based on an incorrect readOnly hint.
- The R2 storage adapter validates the screenshot's WebCrypto SHA-256, performs conditional immutable PNG/JSON writes, independently retrieves image bytes and recomputes digest, and does not return successful MCP image content if storage fails. A partial-write cleanup deletes only keys created by the current attempt.
- Stage and production R2 bucket bindings are separate. Both buckets have independently verified 7-day lifecycle expiration and disabled `r2.dev` public access.

## Measured tests
- Local Cloudflare workerd SQLite test: 100 simultaneous reservations; **4 accepted and 96 denied**, persisted after a process restart.
- 5 focused evidence write/collision/failure tests: all pass, including pre-existing receipt preservation and corrupted readback rejection.
- Official MCP client connected to isolated Cloudflare staging Worker `smat-uiux-capture-preview`: public 2 tools, owner 3 tools, anonymous request 401, public bearer unable to access owner endpoint.
- Real AiSCent mobile Browser Run: 390×844 PNG, 73,367 bytes, image SHA-256 `51c6f19cf42863e09ee8425a19ce44c0a8901a0afb1b15f6602bcdf389d70350`. Returned MCP PNG and JSON receipt; independent `wrangler r2 object get --remote` for both private PNG and receipt independently recomputed the same digest. The exact-candidate staging version was `672f4897-b0f2-46e8-855b-7f54a21eb46b`, source SHA `fcc0016ff614d3b600d07f52b0577ad613603cbc`.
- Real ClaimFix desktop Browser Run: 1440x900 PNG, 142,749 bytes, SHA-256 `49063bf5b2f83d18e8324cd7f5856e9d30656d7a9fd397cf9bbc852ef0e5a7c8`. Official MCP client returned PNG, ARIA and private R2 reference; independent provider PNG + JSON downloads matched SHA and source receipt.
- Pinned baseline-vs-candidate benchmarks, checked in with source: 100 simulated calls under permissive approximate limiter and absent DO/R2 were admitted by old code vs zero by new fail-closed gate; two API-only/redirect fixture pages previously sent to visual browser vs zero with new fleet status guard. These are real code-path comparisons, not throughput or customer success.
- This receipt is a bounded real hosted-browser test, **not** an automated accessibility certification, human design verdict, commercial tenant test, billing proof, or customer flow.

## Release gates (no GitHub Actions)
1. Exact branch/HEAD: donor receipt completeness, source review, Unloopr and Lego Builder assessment, `npm test`, `npm run check`, `npm run audit:tokens`, `npm run bundle:cloudflare`, numerical quota and storage benchmark comparison.
2. Staging Worker must have distinct credentials, no production custom domain, distinct DO namespace, and `smat-uiux-owner-capture-stage-v1` bucket. Real MCP calls must return the expected public/owner tool catalogs, authorized PNG, confirmed ARIA, and independently verifiable private R2 objects.
3. Check 401 cross-scope, no arbitrary capture URL, no private object URL, concurrent quota cap/restart persistence, R2 outage/corruption/overwrite/partial recovery, stage browser size, independent provider SHA.
4. Only if all gates are proven, exact-HEAD -> merge -> exact-MAIN -> staged immutable version -> guarded owner-only production rollout -> independent source-SHA and authenticated live captures + R2 readback -> retain rollback version.
5. Keep **customer-facing commercial use HOLD** until verifiable per-tenant identity, billing/entitlements, separate tenant quotas/storage authority, independently demonstrated end-user task, and security review exist.

## Unproven
- Research Fabric was repaired in production at `c18d74984cc7d4ea1a0a6725f91c32f9567eac50` (Fabric #163). Fresh job `c50ac825-e10e-4214-8d10-245554984a1e` completed with clean citation verification (7/7 repos and 2/2 URLs, no broken placeholders), `sufficiency.sufficient=true` for topical relevance, but **zero target-specific candidate claims**. Independent code review and actual local/staged measurements remain required; not a donor-equivalence certificate.
- No real per-customer OAuth/authz/entitlement and no tenant-scoped retrieval tool. Only SMAT owner can request captures.
- Provider lifecycle expiration is eventual, not immediate proof that old objects were erased.
- A local four-of-100 concurrent test is not proof of a 100-request multi-region Cloudflare production soak.
