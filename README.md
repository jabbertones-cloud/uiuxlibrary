# SMAT Interface Lab

**Status: source prototype with local gates. NOT deployed, NOT connected to a production Figma/Storybook host, NOT commercially approved.**

This is the working code and portable skill source for the UI/UX capability previously envisioned in `jabbertones-cloud/uiuxlibrary`. The earlier repository README described a 100K-screen vector service without corresponding code; that service is **not** an established dependency of this project.

## What is actually implemented

- `smat-uiux` portable Agent Skill: customer-outcome-first workflow, design review, donor research, adversarial quality gates, evidence contract.
- Structural three-tier DTCG token governance, with standalone CLI + deliberately failing fixtures.
- SHA-256 evidence receipt verification. It refuses to self-certify human reviewers, first-time customer tasks, or deployment truth.
- A stdio MCP server source built against the official MCP TypeScript SDK v2 and using Playwright + axe-core for sampled, read-only, allowlisted browser inspections.
- Five local test files cover browser-audit status classification, native screenshot/accessibility evidence, and dedicated token/receipt validation.
- A local read-only MCP dogfood contract that exercises real token-audit and donor-catalog tools.

## Local checks

Node.js >=22.13.0:

```sh
npm ci
npm test
npm run check
node src/cli.mjs tokens design-system/tokens.json
node src/cli.mjs tokens fixtures/bad-tokens.json  # must exit 1
```

`npm test` runs the existing Node test files. `npm run verify` combines syntax,
Python compilation and the structural token audit. Neither proves browser
rendering, visual quality, or first-time customer task success.

## MCP integration (requires dependency installation)

```sh
npm install
npx playwright install chromium
UIUX_WORKSPACE=/absolute/path/to/target/app \
  UIUX_ALLOW_ORIGINS=http://127.0.0.1:3000 \
  node /absolute/path/to/uiuxlibrary/src/server.mjs
```

Configure your MCP host to launch Node with this absolute `server.mjs` path and workspace environment. The local server exposes `uiux_audit_tokens`, `uiux_audit_page`, `uiux_audit_fleet`, `uiux_release_gate`, `uiux_research_donors` and additional native evidence tools. It is **not** a replacement for Figma MCP, Storybook MCP, Playwright MCP, or their existing authentication models. Host connections must be independently configured and tested.

`uiux_audit_page` checks 17 phone, tablet portrait/landscape, laptop, and desktop sizes, runs axe WCAG-tagged automated rules, and saves one viewport screenshot per size. Viewport captures show the first screen, not the whole page. It blocks Cloudflare Web Analytics beacon traffic and reports its count as `suppressedTelemetryRequests`; other blocked requests remain a HOLD. Add exact third-party asset origins to `UIUX_ALLOW_ORIGINS` only when the page needs them to render, as with fonts or animation libraries. The audit does **not** verify all keyboard behaviors, user task success, or visual quality.

## Native iPhone, iPad and Mac evidence via AiSCent God Mode

The same stdio server exposes `uiux_review_aiscent_native`, a read-only
AiSCent capture-plan reviewer. This is **not** a simulator driver and it never
calls physical devices. AiSCent God Mode on the M2 is responsible for all
captures. The reviewer verifies screen identity, screenshot hashes, complete
locale/device/section matrices and six-axis **reviewer-reported** ratings.
Missing images, bad hashes, missing XCUITest proof and current Mac window-only
captures return HOLD, never a guessed UI rating.

For standalone readback, with the capture results and plan copied inside the
workspace:

```sh
node src/cli.mjs native .uiux-evidence/aiscent-capture.json examples/ezseller-ios-ipad-capture-plan.json
```

See [the native capture contract](docs/NATIVE-AISCENT-EVIDENCE.md) and the
EzSeller [iOS/iPad](examples/ezseller-ios-ipad-capture-plan.json) and
[Mac](examples/ezseller-macos-capture-plan.json) plans. Source syntax checks
are not acceptance tests; an actual AiSCent screenshot evidence receipt and
human UX review are required before any design-improvement claim.

## Quality contract

Read [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) and [docs/SECURITY.md](docs/SECURITY.md). Reuse donor tools according to [docs/DONORS.md](docs/DONORS.md); entries are researched candidates, not a guarantee that installation or runtime tests succeeded.

Do not interpret 11 unit tests or a self-reported receipt as live product acceptance. The full proof line remains CODE -> EXACT HEAD -> MERGE -> EXACT MAIN -> DEPLOY -> LIVE CUSTOMER ACCEPTANCE -> ADVERSARIAL REGRESSION.


## Real website fleet dogfood (local, source-bound)

Interface Lab now includes a source-controlled multi-site manifest and an executable
read-only Playwright/axe browser fleet runner. It audits actual pages across 17
viewport sizes, saves local screenshots and hash-bound reports, and distinguishes
confirmed FAIL from policy/coverage HOLD. It never auto-approves a design.

    npm run audit:fleet
    node scripts/fleet-audit.mjs examples/smat-mcp-fleet.json --site claimfix

The manifest includes AiSCent, EzSeller, ClaimFix (home + pricing) and CashCrop.
No account data, customer-identity proof or site mutation is required to run
public-page audits. See docs/FLEET-AUDIT-OPERATING-CONTRACT.md and
docs/FLEET-WEBSITE-DOGFOOD-20261117.md for real observed failures,
the ClaimFix fix trial, and the explicit human review/release boundaries.
For the **real local MCP** path, configure the stdio server with
`UIUX_WORKSPACE` pointing to the checkout containing the manifest and
`UIUX_ALLOW_ORIGINS` set by the operator to the exact permitted site origins.
Call `uiux_audit_fleet` with `manifest: "examples/smat-mcp-fleet.json"` and
`siteId: "claimfix"`. Each interactive MCP invocation is capped at two
route/theme runs, generates 17 real browser screenshots per route, and returns
SHA-bound evidence references. Unapproved origins, absolute manifest paths,
missing results and network blocks fail closed. The model cannot grant itself
additional origin access. For full fleet runs use the local CLI.

Independently verify the **real agent-client journey**, with an ephemeral
loopback HTTP page and official MCP client (not a mocked method return):

    npm run test:mcp:fleet

It verifies catalog discovery, denied unauthorized origin and absolute path,
17 real Chromium requests, report hash and 17 individual screenshot hashes.
A successful test is still `PASS_AUTOMATED_ONLY`, not visual/customer approval.

The hosted Cloudflare MCP remains a **separate two-tool service**; it does not
execute this browser fleet runner yet. No SaaS tenancy or remote Chrome
capability is implied by a local stdio tool.

## Licenses

The SMAT-authored source is proprietary pending an explicit licensing decision (`UNLICENSED`). No external donor source code is copied into this distribution; adapters call published upstream APIs/packages. Consult each upstream dependency's license and commercial terms separately before deployment. Donor SHA links are evidence of what was inspected, not installed dependencies.
