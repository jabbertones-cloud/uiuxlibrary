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


## Optional Meta Astryx component reference

The local **stdio** MCP can optionally expose official [Meta Astryx](https://github.com/meta/astryx/tree/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9) documentation for React projects. This is not enabled in the default installation and is **not** a replacement for SMAT component evaluation, token governance, accessibility checks, real user testing, or brand art direction. The Cloudflare /mcp Worker remains its existing two-tool surface.

Install exact stable packages in this repository without modifying package.json, package-lock.json, project agent instructions, or running Astryx init:

```sh
npm ci --ignore-scripts
npm install --no-save --no-package-lock --ignore-scripts --no-audit --no-fund @astryxdesign/cli@0.7.12 @astryxdesign/core@0.7.12
UIUX_ASTRYX_ENABLED=1 UIUX_WORKSPACE=/absolute/path/to/authorized/app npm run mcp
```

With the flag, **two additional read-only tools** are registered:

- `uiux_astryx_search`: bounded query, domain (`component`, `hook`, `doc`, `template`, `theme`) and limit; uses Astryx's own `search()` ranking rather than a local copy.
- `uiux_astryx_component`: official component usage, props, and examples from Astryx's `component()` API.

Both return `REFERENCE_ONLY`, a pinned donor source, and untrusted documentation. They never call scaffolding, theme modification, package installation or remote Astryx MCP. Requests return an explicit `HOLD` if the optional packages are absent; unsetting the flag removes both tools on the next server start. The adapter resolves its reference root from the package location, not the caller's potentially private UIUX_WORKSPACE.

**Do not use Astryx UI in AiSCent advertising.** AiSCent's `AISCENT-ADS-CUSTOMER-OUTCOME-NONOVERRIDABLE-V1` prohibits app interfaces, screenshots and mockups in ads. Editorial marketing and native Keynote composition are unchanged. Astryx is suitable only as an optional source for separately authorized React UI work.

See [adoption evidence and limitations](docs/ASTRYX-ADOPTION.md). No automatic design approval or production deployment is implied.

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
