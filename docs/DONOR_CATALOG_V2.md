# SMAT Interface Lab: donor catalogue v2

Research snapshot: November 5, 2026. Pinned GitHub source is evidence of a code snapshot, not proof the donor runs in SMAT. Install only with license, dependency, negative-test and customer-task verification.

**Selection doctrine:** Customer task → design brief and 3 genuinely different directions → proven components → tokens → executable accessibility/browser/interaction checks → screenshot comparison → independent human/customer task acceptance → exact-SHA release.

| Rank | Donor and pinned source | License | Decision | Adoption / caveat |
|---|---|---|---|---|
| P0 | [Style Dictionary](https://github.com/style-dictionary/style-dictionary/tree/795233d9bee6a7b5787d685d75d626df3399d24d) | Apache-2.0 | ADOPT | DTCG token output pipeline; test CSS/native parity |
| P0 | [XIAS](https://github.com/plugin87/ux-ui-agent-skills/tree/def84a70fadc3490d80901295a4f1951fdb2cc69) | MIT | ADAPT | Receipt hashes, bad fixtures, keyboard/overflow; some gates require standalone Chrome |
| P0 | [Playwright MCP](https://github.com/microsoft/playwright-mcp/tree/3d49ff2615216fcef64fb7748d9f660d3c000ad7) | Apache-2.0 | ADOPT | Browser DOM and accessible interactions; not proof of real customer value |
| P0 | [Playwright CLI & Skills](https://github.com/microsoft/playwright-cli/tree/4bc00fb7fa5b4329f2fb53ac4743a066c2c664e8) | Apache-2.0 | ADOPT | Repeatable low-context browser tasks, traces, screenshots |
| P0 | [axe-core](https://github.com/dequelabs/axe-core/tree/c50bf8e8933eba8cdb7a0d8e744a6c0ec691cdd6) | MPL-2.0 | ADOPT | Rendered automated a11y checks; never claim full WCAG certification |
| P0 | [Storybook addon MCP](https://github.com/storybookjs/storybook/tree/8bddc82ac0290433007639128585b72ae15cca9c) | MIT | ADOPT | Real components, properties, stories and interaction test harness |
| P0 | [React Aria](https://github.com/adobe/react-spectrum/tree/8203ef81549ef9e01391a57b2e244b13cf36daaa) | Apache-2.0 | ADOPT | Screen-reader and keyboard interaction primitives in React |
| P0 | [Radix Primitives](https://github.com/radix-ui/primitives/tree/eb3a2b7091293e27df8f9ba906632d8daa3d81a3) | MIT | ADOPT | Proven unstyled widgets; avoid duplicated focus managers |
| P0 | [shadcn/ui](https://github.com/shadcn-ui/ui/tree/8a3536678a528cc012b9e62484290e79d0be410f) | MIT | ADOPT | Official registry components, fit into existing stack |
| P0 | [Jakub Krehel Skills](https://github.com/jakubkrehel/skills/tree/60bf140e43c98b248e6594487384ec967e89d98a) | MIT | ADAPT | 14 separate critique, break, state-machine, variant and typography skills |
| P0 | [Impeccable](https://github.com/pbakaus/impeccable/tree/c3bb418ee38ee49a6b999b7752c1368f3123a2bd) | Apache-2.0 | ADAPT | Design brief, critique, anti-slop and live variants; reject sandbox-bypass mode |
| P0 | [Argos](https://github.com/argos-ci/argos/tree/eb0df8b33537ba9713f35ab86f93fc7194fd1fa4) | MIT | ADOPT | Visual diffs requiring human disposition; change is not quality |
| P1 | [Community Accessibility Agents](https://github.com/Community-Access/accessibility-agents/tree/7597f1a2cd315f144bc6a212ecceabf0268ea044) | MIT | EVALUATE | 11 a11y specialties plus MCP; test hooks per agent host |
| P1 | [Evil Martians Tailwind Skills](https://github.com/evilmartians/agent-skills/tree/bc9de43748a469ba03b883258d97e5ad55326e08) | MIT | ADAPT | Semantic Tailwind tokens and fixed variants |
| P1 | [Antislop](https://github.com/miqdadbadjuber/anti-slop/tree/9504989f162a92b1996853eccbb3d8a86e73df68) | MIT | ADAPT | Negative constraints; needs positive brand direction |
| P1 | [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci/tree/3ead206a96a5ba714c386affe274576ccb8c09a9) | Apache-2.0 | ADOPT | Build performance/SEO budgets; lab-only scores |
| P1 | [Southleft Figma Console](https://github.com/southleft/figma-console-mcp/tree/5ef4df3791606b8e1f877557ec0dde4796250b44) | MIT | EVALUATE | Figma variables, canvas edits, design/code parity; requires pairing |
| P1 | [Southleft Figma Skills](https://github.com/southleft/skills-for-figma/tree/79bda1e76044d1e9d9b60bb211507e64833af92b) | MIT | ADAPT | Token export, variable modes, accessibility and design parity |
| P1 | [Penpot current MCP](https://github.com/penpot/penpot/tree/1a80e98e623f962fe91c9971a5c2bc8617677a4b) | MPL-2.0 | EVALUATE | Current plugin/MCP is inside penpot/penpot/mcp |
| P1 | [21st MCP](https://github.com/21st-dev/magic-mcp/tree/6b5299e8a83ceffa73d4fc4e148905bb3eeeeb55) | ISC | EVALUATE | Magic proxy is legacy; use current registry with entitlements |
| P1 | [shadcn community MCP](https://github.com/jpisnice/shadcn-ui-mcp-server/tree/30efb8a0bf8d968e4c6635e4491c20da96e49d20) | MIT | EVALUATE | Cross-framework component source; compare official registry |
| P1 | [Google Stitch Skills](https://github.com/google-labs-code/stitch-skills/tree/0337446dadde6f8c94210444e2aa9d546126480f) | Apache-2.0 | EVALUATE | Design variants and code handoff; generation unverified |
| P1 | [Mobbin Skills](https://github.com/mobbin/skills/tree/79124d92763f6e85107386227a96bbc40479710e) | MIT skill; paid access | REFERENCE | Real app screen flows; respect screenshot rights |
| P1 | [rrweb](https://github.com/rrweb-io/rrweb/tree/59506da1f3082a6a538dae0df1ea681693e8c791) | MIT | EVALUATE | Consented user replay; redact credentials and limit retention |
| P1 | [Design Systems MCP](https://github.com/southleft/design-systems-mcp/tree/eca371b9fe898c621341d7f0a7179886fbe18b8f) | MIT | REFERENCE | Dated cited standards; check primary source |
| P1 | [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps/tree/19256f52cad5517ba8272581ed2e11d6a81273d5) | Per package | ADOPT | Real interactive MCP Apps, host fallback, CSP/resize |
| P2 | [Anthropic frontend-design](https://github.com/anthropics/skills/tree/ca45fc496a3436251f191354091d557da31c15b5) | Per skill | STUDY | Typography, layout direction; prompt is not gate |
| P2 | [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62) | Per skill | STUDY | Web guidelines review; not executable WCAG proof |
| P2 | [Meng To Skills](https://github.com/MengTo/Skills/tree/5ea1661a0e05d82b054553daaa6baf6d0233c33c) | MIT | STUDY | SVG and expressive motion only where necessary |
| P2 | [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/b7d5353e0130feb8c5574ef1251f8a1db1873ccb) | MIT | STUDY | Design vocabulary and patterns; not user task proof |
| P2 | [Apple Accessibility Skill](https://github.com/dadederk/iOS-Accessibility-Agent-Skill/tree/dcc3a36ce1d0099341d545c1af4eb5a8c989bf66) | MIT | ADAPT | VoiceOver/native iOS; validate Apple HIG and device |
| P2 | [UX/UI Principles](https://github.com/uxuiprinciples/agent-skills/tree/bc3f52deb45e3f8638d9ad0e82149182a6c0e410) | License unverified | STUDY | 195 principles claimed; full API is paid |
| P2 | [Motion](https://github.com/motiondivision/motion/tree/67d34f67f4c39c6071bab1ab36e8753ebe012ad3) | MIT | SELECTIVE | Motion after responsive, CPU and reduced-motion budget |
| BLOCK | [Deque official Axe MCP](https://github.com/dequelabs/axe-mcp-server-public/tree/67b7fa4147a837d2902df55893b3d477aa3f16b3) | Proprietary | NO PORT | Commercial subscription and API key |
| BLOCK | [AGPL Accessibility Skills](https://github.com/mgifford/accessibility-skills) | AGPL-3.0 | STUDY ONLY | Legal review before copying or integration |
| BLOCK | [Penpot standalone MCP](https://github.com/penpot/penpot-mcp/tree/73e0cd21853dd03103f7ac675042b1277ee0b736) | MPL-2.0 | ARCHIVED | Use penpot/penpot/mcp instead |
| BLOCK | [Design Inspiration MCP](https://github.com/notsointresting/design-inspiration-mcp) | MIT | NOT SOURCE | Manually curated fallback and thin repo not live reference proof |
| BLOCK | [UI Expert MCP](https://github.com/reallygood83/ui-expert-mcp) | MIT | NOT SOURCE | Static improvement templates, not runtime auditor |

## Requirements that no donor can substitute

**Customer evidence**: Valid credentials, truthful permissions, first actual success, realistic data freshness, error recovery and task completion without an operator. 3 representative first-time sessions are a preliminary acceptance test, not statistically significant conversion proof.

**Visual craft**: Licensed type/assets, distinctive hierarchy, editorial art direction, optical spacing, useful information density and multi-state consistency. Reject fake placeholder metrics, generic bento card galleries, undifferentiated variants and ornamental gradient/blur.

**Token architecture**: DTCG is a token format; primitive→semantic→component is SMAT policy, not a normative W3C tier requirement. Use Style Dictionary to compile rather than hand-writing a token compiler.

**Accessibility**: An axe pass does not equal WCAG 2.2 compliance. Test keyboard traversal, focus after errors, VoiceOver/assistive technology, high zoom, contrast, touch targets, RTL, reduced-motion, interrupted work and offline.

**Canvas rights**: Official Figma is the preferred connected bridge where available. Southleft and Penpot are optional adapters; no live design file writes without explicit versioned review.

**Security**: Block uncontrolled website actions in read-only audits, disallow agent sandbox-bypass as a design workflow, and do not harvest third-party gallery screenshots without rights.

**Comparison**: React Aria/Radix for interaction behavior, shadcn for scaffold styling, Storybook for state truth, Playwright and axe for rendered evidence, Argos for reviewable diffs, rrweb for consented research, Style Dictionary for source-controlled tokens, Krehel/Impeccable for design judgement.

## SMAT pilot acceptance

**EzSeller**: A new merchant signs in, connects an eligible Amazon account, sees truthful market data, identifies a real issue and acts or receives an actionable recommendation. Public app approvals must not be conflated with private CommerceOS roles.

**CashCrop**: A merchant connects real sales data, understands its time/freshness and source, finds a credible margin opportunity and verifies what to do next. No fabricated profitability, hidden stale values or dead-end onboarding.

Run both pilots in production-like staging. Measure completion, time-to-first-value, unaided recovery, errors and usefulness. A prettier screen alone fails the contract.

**Do not certify release** without exact PR head, main, deployed SHA, live first-time test and adversarial regression.
