# Astryx optional reference provider: source and runtime evidence

**Date:** 2026-11-10, Arizona. **Scope:** `jabbertones-cloud/uiuxlibrary` local stdio MCP only. **Release disposition:** branch-level functional proof, **NOT a Cloudflare deployment or independent design approval**.

## Why add only this Lego block

The existing SMAT Interface Lab already owns `uiux_audit_tokens`, `uiux_audit_page`, `uiux_diff_screenshots`, `uiux_test_staging_flow`, `uiux_release_gate` and `uiux_research_donors`. Astryx provides **official documented** React component, hook, topic, theme and template retrieval. The adapter calls those official APIs; it does not reimplement search, copy components, replace our design acceptance policy, write project files, or proxy private client data to a remote MCP.

**Donor:** `meta/astryx@f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9` (upstream `v0.7.12` tag). Audited [search API](https://github.com/meta/astryx/blob/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9/packages/cli/api/search/search.mjs), [component API](https://github.com/meta/astryx/blob/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9/packages/cli/api/component/component.mjs), [API barrel](https://github.com/meta/astryx/blob/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9/packages/cli/api/index.mjs), [upstream MCP source](https://github.com/meta/astryx/blob/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9/apps/docsite/src/app/mcp/route.ts), [upstream MCP tests](https://github.com/meta/astryx/blob/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9/apps/docsite/src/__tests__/mcp-server.test.ts), and [MIT license](https://github.com/meta/astryx/blob/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9/LICENSE). npm stable `@astryxdesign/cli@0.7.12` and `@astryxdesign/core@0.7.12`; upstream main's `0.7.13` is not the stable npm release (canary only at inspection). The upstream tests are provenance, not an assertion that SMAT has run them.

**Compared alternative donors:** [shadcn/ui](https://github.com/shadcn-ui/ui/tree/8a3536678a528cc012b9e62484290e79d0be410f) for installable components and [Storybook addon MCP](https://github.com/storybookjs/storybook/tree/8bddc82ac0290433007639128585b72ae15cca9c) for a project's own story inventory, both already in [SMAT donor catalog](DONOR_CATALOG_V2.md). Neither displaces Astryx's official documentation catalog; neither is an independent design-quality certifier. The official Astryx API is the preferred donor for Astryx docs.

## Research lanes and limitations

- **SMAT Research:** read `jabbertones-cloud/smat-research` README and its research-only [handrolled donor audit](https://github.com/jabbertones-cloud/smat-research/blob/7740119566230a4ec92aec08bfc4ac7c31ed3497/studies/handrolled-donor-audit-20261103/REPORT.md). This is general donor doctrine, **not** an Astryx-specific production approval. The target's [donor catalog](DONOR_CATALOG_V2.md) was reviewed. Search for `astryx` in SMAT Research via GitHub code search returned no result.
- **GitHub Research MCP CLI:** actual M1 invocation from `jabbertones-cloud/githubresearchmcp@7cda4743137c24c86625389d1c1bb485d6b0eb43`: `cards search --query 'MCP progressive tool discover' --domain mcp`, `library search --query uiuxlibrary`, and `taskmap --problem 'MCP data roots follow package not process cwd; find official external design system docs via typed MCP tools and keep public GitHub data untrusted' --repo uiuxlibrary`. Relevant general Pattern Cards: `mcp-package-root-not-cwd`, `github-mcp-lockdown-untrusted-content`; their scores were zero and source provenance is incomplete. **No Astryx-specific verified Pattern Card**. A separate `research execute` against `meta/astryx` returned `github_code_search_unauthorized` HTTP 401, so source independent verification was performed through the authenticated GitHub connector, not falsely labeled a successful GitHubResearch code read.
- **SMAT Expert:** read `jabbertones-cloud/smat-expert-mcps/docs/PROGRAM.md` via GitHub. Product Design is a described future/domain expert, but no live `expert.*` tool was present. **Repo charter only**, not a graded live expert report.
- **Research Fabric:** jobs started for `uiuxlibrary` (`c92745bb-6d66-406a-a64d-dc9c3c90129c`) and `aiscent-marketing-studio` (`79a8489f-7fba-4f24-bd9f-613cff747b2f`). Latest check was still running or temporarily unavailable; **no completed or measured Fabric verdict**. These job IDs prove submission only, not the claims' correctness.

## Real local MCP dogfood on M1

On `smat-m1-mini` (Node 22.23.3), started from clean `uiuxlibrary@ebbe8c14f0cd5fd198b6f5a679edfc41fb9d2432` and the branch integration in an isolated Git worktree. `npm ci --ignore-scripts --no-audit --no-fund`, `npm run check` and `npm run audit:tokens` succeeded. Token audit produced `PASS_STRUCTURAL_ONLY` with 13 tokens; it is **not** WCAG approval.

Real MCP client `@modelcontextprotocol/client@2.4.0` over stdio:

| User-style request / condition | Observed |
| --- | --- |
| No `UIUX_ASTRYX_ENABLED` flag | Exactly **6** original tools |
| `UIUX_ASTRYX_ENABLED=1` | Exactly **8** tools; two optional `uiux_astryx_*` |
| Flag enabled, optional packages absent | Search returns **HOLD**, `isError: true`, with installation guidance |
| Stable optional packages installed; component search `button` | Real ranked `Button`, `IconButton`, `ButtonGroup`, `REFERENCE_ONLY` |
| Stable packages installed; template search `dashboard` | Real `dashboard`, `dashboard-alert-rail`; `REFERENCE_ONLY` |
| Official component detail `Button` | Real `component.detail` with **23 props** |
| Unknown component `NotReal` | **HOLD**, `isError: true` |
| Malicious-looking component path `../../etc/passwd` | MCP parameter validation rejects before vendor API |
| Installed Core package version deliberately altered to `0.7.11` in the local ignored `node_modules`, then restored | `uiux_astryx_component` returned **HOLD**, `isError: true`, version mismatch expected `0.7.12`; the original manifest was restored via shell trap |
| Five real query/domain cases vs direct Astryx `search()` | **5/5 exact JSON output parity** (button/component, dashboard/template, theming/doc, useTheme/hook, neutral/theme). Direct `component('Button')` also matched the MCP wrapper exactly at HEAD `d744da7e2939e48a6b3fc849b726ba3628197c48`. One M1 run measured per-query direct API/MCP wall times, but did not establish a steady-state performance advantage. |
| `npm audit --omit=dev --audit-level=moderate` with optional deps | **0 reported vulnerabilities** on that M1 installation |
| After optional local npm install | `git status --short` remained empty (no source/lock changes) |

This proves local retrieval against the installed upstream package with real catalog results, **not** a buyer outcome, superior design, a statistically meaningful latency benchmark or a live hosted MCP. No fixture test files or GitHub Actions were added, consistent with `TESTS-REMOVED.md`.

## Guardrails and open gates

- The optional `src/astryx-reader.mjs` checks the installed CLI and Core package versions against exact stable `0.7.12`, then uses dynamic import of the official API and a reference root derived from `import.meta.url`. There is no module import in the default tool handler that installs npm packages, writes files, executes shell code, or makes HTTP requests.
- Results are labeled `REFERENCE_ONLY` with upstream origin; treat returned documentation/examples as **untrusted data**. `UIUX_WORKSPACE` remains the existing target authorization for unrelated tools and is not passed as the Astryx package root.
- Brand tokens, accessible behavior, real screenshots, keyboard/focus, localization and independent human review remain SMAT-owned gates.
- **AiSCent advertising:** its `AISCENT-ADS-CUSTOMER-OUTCOME-NONOVERRIDABLE-V1` blocks interface screenshots, fake UIs and product mockups. Astryx must not feed the editorial ads or Keynote pipeline. No AiSCent source was changed.
- **Release HOLD:** no completed Fabric source verdict, no live Product Design Expert invocation, no relevant verified Astryx-specific Pattern Card, no strict Lego gate, no independent design outcome study, and no hosted Cloudflare adapter/authorization acceptance. Keep this a nondeployed branch-level optional integration until the separate release decision has measured proof.
