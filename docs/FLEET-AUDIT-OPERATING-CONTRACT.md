# Interface Lab: real website fleet audit

This is an executable local product capability, not a screenshot catalog, designer impersonation, conversion proof, hosted API, or automatic site edit.

## Use

On the authorized M1 Mac with pinned npm packages and Playwright Chromium installed, run:

    npm ci
    npx playwright install chromium
    node scripts/fleet-audit.mjs examples/smat-mcp-fleet.json --site claimfix
    node scripts/fleet-audit.mjs examples/smat-mcp-fleet.json

The command validates a source-controlled smat-uiux-fleet/v1 manifest, exact HTTP(S) origins, a real customer job for each site, and 1-8 routes per site. Remote origins must use HTTPS; localhost/127.0.0.1 may use HTTP. Unknown domains, userinfo, query tokens, cross-origin routes, path traversal and excessive manifests fail closed. Never disable the allowlist to make a flaky report look green.

The runner invokes the existing Playwright + axe-core browser adapter at 17 phone, tablet, laptop and desktop widths per route/theme. Actual screenshots, Axe findings, browser faults, overflow measurements and raw JSON reports go into .uiux-evidence/fleet/<runId>. Each browser-audit.json is SHA-256 referenced in summary.json; screenshots retain their own SHA receipts inside the raw report. All artifacts remain local and out of Git to avoid publishing user/session data. Never scan authenticated pages without fixture accounts and explicit authorization.

Statuses are FAIL for confirmed defects, HOLD for blocked dependencies or incomplete captures and PASS_AUTOMATED_ONLY when all sampled cells pass. Neither Axe nor Lighthouse 100 establishes WCAG compliance, human visual quality, useful marketing, working customer tasks or revenue. The runner never emits APPROVED.

## Harsh but accountable visual review

For each route, inspect original first-viewport screenshots at 320, 390, 768 and 1440 CSS px. Separately capture and inspect deeper sections, loading, error, localization and responsive states. Record every criticism against: actual screenshot and hash, page/width, P0-P3 severity, specific evidence, impact on the customer job, source-linked remedy, and a before/after decision. Distinguish measured accessibility/layout failures from subjective judgments about hierarchy, credibility, aesthetics, density and brand differentiation.

Do not let beautiful screenshots hide dead CTAs, deceptive promises, unauthorized MCP tools, broken sign-in, payment without delivery, or unreachable output. Conduct independent first-time customer journeys and document completion without intervention. Fix customer-value blockers before motion or icon polish.

## Release and continuous learning

Record each repeatable finding in its product repository. Compare source-pinned, licensed donor-native fixes with the same page, width and customer task; reject changes that worsen other states. Preserve unsuccessful experiments. Feed confirmed repeatable wins into SMAT Research and GitHub Research Pattern Cards. After exact-head tests, merge and retest exact-main, deploy with exact live SHA, independently retest production and run adversarial regression. GitHub Actions are prohibited.

The public Cloudflare Worker at https://uiux.smatdesigns.com/mcp still serves only two read-only token/donor tools. The fleet audit is a LOCAL feature until a durable authenticated job executor, per-tenant authorization and deployment are built and independently tested. A successful CLI run does not expand hosted capabilities.
