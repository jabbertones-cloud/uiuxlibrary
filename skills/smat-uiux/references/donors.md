# UI/UX donor selection and provenance

This table is not a list of installed plugins. Repo identity, license and selected source files were checked using the connected GitHub repository tools as of 2026-11-05. A pinned commit proves a source snapshot, not its suitability, security or live behavior. No donor source has been copied into the SMAT code.

| Donor | Why study it | Risk / adoption boundary |
|---|---|---|
| [XIAS](https://github.com/plugin87/ux-ui-agent-skills/blob/def84a70fadc3490d80901295a4f1951fdb2cc69/scripts/gate.mjs) | Study actual hash-bound receipts, negative fixtures, keyboard and overflow scripts; use native browser/axe test packages | 52 checks exist in source but were not executed in SMAT products; the gate does not certify subjective design |
| [Jakub Krehel UI skills](https://github.com/jakubkrehel/skills/blob/60bf140e43c98b248e6594487384ec967e89d98a/skills/interface-review/SKILL.md) | Separate diff review, state inventory, component stress cases, copy, typography, and redesign variants | LLM skill instructions are not deterministic compliance or human usability proof |
| [Figma Console MCP](https://github.com/southleft/figma-console-mcp/blob/5ef4df3791606b8e1f877557ec0dde4796250b44/src/core/accessibility-tools.ts) | Adopt adapter shape for token export, design/code parity and auditable human changes | Requires Figma client pairing; no live write test, plan or seat verified |
| [Figma Skills](https://github.com/southleft/skills-for-figma/blob/79bda1e76044d1e9d9b60bb211507e64833af92b/skills/export-tokens-figma/SKILL.md) | Study Plugin API variable and alias handling with current official Figma MCP | Requires official use_figma write access; no connected user Figma file inspected |
| [Design Systems MCP](https://github.com/southleft/design-systems-mcp/blob/eca371b9fe898c621341d7f0a7179886fbe18b8f/src/index.ts) | Query cited standards and enterprise design-system patterns instead of hallucinating specs | Curated source may lag; verify W3C/Apple/WCAG primary docs and runtime availability |
| [Playwright CLI Skills](https://github.com/microsoft/playwright-cli/blob/4bc00fb7fa5b4329f2fb53ac4743a066c2c664e8/README.md) | Use the official CLI + skills for repeatable browser user-task steps and screenshots | No local installation done; protect production mutations and credentials |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp/blob/3d49ff2615216fcef64fb7748d9f660d3c000ad7/README.md) | Use for interactive accessibility-tree DOM exploration in an MCP host | Browser automation alone cannot prove visual quality or user value |
| [axe-core](https://github.com/dequelabs/axe-core/blob/c50bf8e8933eba8cdb7a0d8e744a6c0ec691cdd6/README.md) | Use supported axe-core package rather than custom WCAG rule parser | Automated checks cover a subset of WCAG; manual review remains essential |
| [Storybook addon MCP](https://github.com/storybookjs/storybook/blob/8bddc82ac0290433007639128585b72ae15cca9c/README.md) | Use official @storybook/addon-mcp to query documented stories, component props and state tests | Addon runtime or presence in target repo not verified; do not use archived storybookjs/mcp fork |
| [shadcn/ui](https://github.com/shadcn-ui/ui/blob/8a3536678a528cc012b9e62484290e79d0be410f/README.md) | Reuse components via official CLI/registry, preserve app existing dependencies and semantics | Not an independent design QA gate, adapting copied code needs review |
| [21st MCP / legacy magic compatibility](https://github.com/21st-dev/magic-mcp/blob/6b5299e8a83ceffa73d4fc4e148905bb3eeeeb55/README.md) | Use catalog search/get_component behind user-entitled 21st MCP, not raw generated UI | Legacy Magic proxy, hosted credentials and commercial rights must be verified |
| [Mobbin Skills](https://github.com/mobbin/skills/blob/79124d92763f6e85107386227a96bbc40479710e/README.md) | Reference real app screenshots and flows via authorized Mobbin MCP | Paid account; copyrighted screenshot use is inspiration-only, not copying or dataset construction |
| [Google Stitch Skills](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/README.md) | Generate competing directions and compare with user task constraints | Stitch model outputs unverified; requires separate service connection |
| [Impeccable](https://github.com/pbakaus/impeccable/blob/c3bb418ee38ee49a6b999b7752c1368f3123a2bd/README.md) | Study PRODUCT.md and DESIGN.md context plus critique/redo stages | Do not adopt optional live Apply fallback that disables agent permission or sandbox checks |
| [UX/UI Principles](https://github.com/uxuiprinciples/agent-skills/blob/bc3f52deb45e3f8638d9ad0e82149182a6c0e410/uxui-evaluator/SKILL.md) | Study categories and UX smell reporting, not copy verbatim | Enriched 195 principles depend on paid API; no compatible source-port license verified |
| [Penpot](https://github.com/penpot/penpot/blob/1a80e98e623f962fe91c9971a5c2bc8617677a4b/mcp/README.md) | Optional Figma alternative via official main repo MCP module | Old penpot/penpot-mcp repo is archived; mainline MCP API/current setup must be checked |
| [Argos](https://github.com/argos-ci/argos/blob/eb0df8b33537ba9713f35ab86f93fc7194fd1fa4/README.md) | Optional managed screenshot-baseline comparison in CI | Requires baseline ownership, environment parity, and service credentials |

## Rejections and non-adoptions

- **UI Expert MCP (reallygood83/ui-expert-mcp)**: source `src/index.ts` returns generic static recommendations from a list of issues, with no browser measurement. Its 2025 commit history is thin. Not chosen as an enforcement dependency.
- **Design Inspiration MCP (notsointresting/design-inspiration-mcp)**: code contains manually curated, hardcoded sources and site descriptions alongside scrapers. Its April 2026 initial/final push and lack of a test script make live accuracy and reuse rights unverified. Do not promote fallback copy to independently sourced inspiration.
- **Archived MCP forks**: `storybookjs/mcp` and `penpot/penpot-mcp` are archived. Prefer official Storybook addon and Penpot main monorepo.
- **Unlicensed UX taxonomy**: no compatible source reuse without confirmed grant. Use written principles as high-level ideas, avoid reproducing proprietary data or paid API responses.

## What remains unknown

- Exact compatibility of MCP SDK v2, browser dependencies and all third-party MCP client features with SMAT host environments; dependency install and live transport calls not run in this bundle.
- Commercial rights for any individual 21st.dev block, Mobbin screenshot, Figma frame or third-party theme. Those rights must be evaluated per selected asset.
- Which donor actually improves conversion, task completion or user preference in EzSeller, CashCrop, AiSCent or another app. Design impact must be measured on representative tasks.
- Whether the GitHub Research MCP's Pattern Card/TaskMap lane can produce additional target-specific receipts for this new repo. A Fabric report returned generic candidates and was insufficient; do not label it a verified TaskMap.

## Primary standards and official docs

- [W3C Design Tokens Community Group](https://www.w3.org/community/design-tokens/). A format specification, not a normative command to use three tiers. SMAT's tiers are local governance.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/). Verify exact conformance criteria and conditional exceptions before writing a binary gate.
- [Official Storybook MCP addon](https://storybook.js.org/docs/ai). Use `@storybook/addon-mcp`; do not mistake an archived `storybookjs/mcp` repo for the live official addon.
- [MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/). Use the maintained `@modelcontextprotocol/server` `McpServer`/`serveStdio` API.
- [Official Figma MCP](https://help.figma.com/hc/en-us/articles/39216419318551-Get-started-with-the-Figma-MCP-server). Remote can write with plan/seat; desktop cannot write.
