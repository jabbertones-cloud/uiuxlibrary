# SMAT Interface Lab

**Status: source prototype with local gates. NOT deployed, NOT connected to a production Figma/Storybook host, NOT commercially approved.**

This is the working code and portable skill source for the UI/UX capability previously envisioned in `jabbertones-cloud/uiuxlibrary`. The earlier repository README described a 100K-screen vector service without corresponding code; that service is **not** an established dependency of this project.

## What is actually implemented

- `smat-uiux` portable Agent Skill: customer-outcome-first workflow, design review, donor research, adversarial quality gates, evidence contract.
- Structural three-tier DTCG token governance, with standalone CLI + deliberately failing fixtures.
- SHA-256 evidence receipt verification. It refuses to self-certify human reviewers, first-time customer tasks, or deployment truth.
- A stdio MCP server source built against the official MCP TypeScript SDK v2 and using Playwright + axe-core for sampled, read-only, allowlisted browser inspections.
- Local source tests for passing inputs, negative fixtures, stale/symlink evidence, user task and SHA gates.

## Local no-network test

Node.js >=22.13.0:

```sh
npm test
npm run check
node src/cli.mjs tokens design-system/tokens.json
node src/cli.mjs tokens fixtures/bad-tokens.json  # must exit 1
```

## MCP integration (requires dependency installation)

```sh
npm install
npx playwright install chromium
UIUX_WORKSPACE=/absolute/path/to/target/app \
  UIUX_ALLOW_ORIGINS=http://127.0.0.1:3000 \
  node /absolute/path/to/uiuxlibrary/src/server.mjs
```

Configure your MCP host to launch Node with this absolute `server.mjs` path and workspace environment. The server exposes `uiux_audit_tokens`, `uiux_audit_page`, `uiux_release_gate`, `uiux_research_donors`. It is **not** a replacement for Figma MCP, Storybook MCP, Playwright MCP, or their existing authentication models. Host connections must be independently configured and tested.

`uiux_audit_page` captures three viewports and runs axe WCAG-tagged automated rules. It **does not** verify all keyboard behaviors, user task success, or visual quality. Review all screenshots as actual artifact evidence.

## Quality contract

Read [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) and [docs/SECURITY.md](docs/SECURITY.md). Reuse donor tools according to [docs/DONORS.md](docs/DONORS.md); entries are researched candidates, not a guarantee that installation or runtime tests succeeded.

Do not interpret 11 unit tests or a self-reported receipt as live product acceptance. The full proof line remains CODE -> EXACT HEAD -> MERGE -> EXACT MAIN -> DEPLOY -> LIVE CUSTOMER ACCEPTANCE -> ADVERSARIAL REGRESSION.

## Licenses

The SMAT-authored source is proprietary pending an explicit licensing decision (`UNLICENSED`). No external donor source code is copied into this distribution; adapters call published upstream APIs/packages. Consult each upstream dependency's license and commercial terms separately before deployment. Donor SHA links are evidence of what was inspected, not installed dependencies.
