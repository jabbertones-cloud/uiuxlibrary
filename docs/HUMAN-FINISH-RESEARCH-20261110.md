# Human Finish: research and reuse receipts

**Date:** 2026-11-10. **Status:** mixed evidence, explicit unresolved gaps. This document is not an independently tested implementation, benchmark, or deploy receipt.

## Internal sources inspected

1. `jabbertones-cloud/uiuxlibrary`: `README.md`, `docs/ACCEPTANCE.md`, `docs/DONORS.md`, `docs/DONOR_CATALOG_V2.md`, `skills/smat-uiux/SKILL.md`, `skills/smat-uiux/references/visual-review.md`, `src/server.mjs`, `src/receipt-gate.mjs`, `src/flow-adapter.mjs`, `src/token-gate.mjs`, `src/cli.mjs`, `package.json`. Actual source exposes token, browser, screenshot-diff, staging-flow, donor reference and SHA receipt tools. The acceptance contract already blocks unsupported task/approval claims; most of Human Finish's desired cognitive/brand/workflow quality is currently a human procedure, not executable analysis.
2. `jabbertones-cloud/smat-research`: `README.md`, `customer-knowledge/METHODS.md`, `customer-knowledge/README.md`, `customer-knowledge/MARKETING-SOP.md`, `customer-knowledge/AUDIT-PROTOCOL.md`, `mcp-solutions-registry/03-JOBS.md`, `studies/commercial-product-rejection-20261105/NOTES.md`, `studies/screenshot-marketing-20261030/README.md`. Existing customer-claim and work-delivery safeguards can be reused; operator-only proof must not be promoted into a paid-customer success claim.
3. `jabbertones-cloud/aiscent-marketing-studio`: `README.md`, canonical policy `AISCENT-ADS-CUSTOMER-OUTCOME-NONOVERRIDABLE-V1`. Ads show a desired outcome rather than UI demonstrations. Actual App Store screenshots are separate. The repo has image-specific review and first-exposure measurement mechanisms, but no universal automatically approved creative.
4. `jabbertones-cloud/smat-expert-mcps`: `docs/PROGRAM.md`, `corpus/product-design/CURRICULUM.md`, `corpus/product-design/manifests/GROWTH.md`. **Access mode: repo_corpus, not invoked expert MCP**. The dated founding corpus lists 35 graded items, with known coverage gaps. Recheck current canonical sources when using individual findings.

## Research Fabric receipt

- Live `capabilities` called: Fabric v0.3.7.
- Job: `801486a1-6141-434b-98a8-dc5f4f0d1ec6`, project `uiuxlibrary`, completed 2026-11-10 with `status=succeeded`.
- **Research-result caution:** `smartkb` degraded (`evidence_id_conflict_in_ledger`), NotebookLM unavailable (no project mapping), GitHub Code Search rate-limited (HTTP 403), no test witnesses, no implementation hits and no claim-bound verification. A successful process status must NOT be treated as a verified donor, design improvement or test.
- Two AiSCent Marketing Studio document candidates were returned as `reported`, not installed packages. No verified direct implementation winner. The legacy `githubresearchmcp` lane surfaced mostly unrelated candidates.

## GitHub Research MCP independent CLI (actual authorized M3 run)

Source repo `jabbertones-cloud/githubresearchmcp`, checkout `382adba9595447180834781ec8837de42688fbe6`, Node v22.23.3.

Executed:
- `npm run cli -- cards search --query 'product design user jobs task outcome brand experience' --domain frontend`: results had scores 0.
- `npm run cli -- library search --query 'design quality user task browser'`: returned [].
- `npm run cli -- taskmap --problem 'Build evidence-backed project intent charter and surface-specific human quality review gates in uiuxlibrary without inventing UI scoring or customer data' --repo uiuxlibrary`: returned generic unrelated patterns (Blender, Amazon patches, Stripe, security chain), with `evidenceFiles: []`. Its test witnesses were for those other projects, not Interface Lab.
- **Verdict:** actual GitHubResearch invocation occurred, but the result is **NOT a credible uiuxlibrary implementation TaskMap**. Do not write new production adapters or represent donor equivalence as demonstrated until narrowed code archaeology produces credible target-specific tests and source evidence.

## Donor paths already researched in Interface Lab (candidates, not adoption proof)

- Browser interaction/trace: existing Playwright dependency and official Microsoft Playwright MCP / CLI. Scope staging routes and enforce permission boundaries.
- Accessibility: existing `@axe-core/playwright`; partial automated WCAG checks only, never full WCAG certification.
- Component states: official Storybook addon MCP and native platform APIs where appropriate.
- Tokens: existing structural DTCG gate and candidate Style Dictionary, not mandatory new dependency.
- Interface finishing: `pbakaus/impeccable` pinned `c3bb418ee38ee49a6b999b7752c1368f3123a2bd`; `miqdadbadjuber/anti-slop` pinned `9504989f162a92b1996853eccbb3d8a86e73df68`. Both are *inspiration/adaptation candidates*, not objective proof a product improves. Anti-pattern filters must not decide the brand aesthetic.
- Contextual human understanding: SMAT customer knowledge methods and direct observation of real work. Do not automatically copy customer PII into reusable project context.
- Native apps: Apple HIG and platform APIs first; requires `swift_app_audit` and official primary sources on any actual Apple source-code change.

No donor from this list was newly installed, benchmarked or ported by this research note.

## Primary research agenda (do not manufacture an effect size)

- Human-centered design: ISO 9241-210 principles (understanding users, their tasks and context; iteration; evaluation). Recheck official current edition and applicable licensing before quoting normative clauses.
- Field observation: contextual inquiry, work modeling, and behavioral evidence, distinguishing stated versus performed workflows.
- Human motivation: autonomy, competence, relatedness from self-determination theory; *design hypotheses*, not a universal conversion guarantee.
- Trust, control, mental models, affordances/signifiers and failure recovery from cognitive ergonomics/HCI, especially for agent systems.
- Service blueprinting: frontstage and backstage responsibilities, fail points and recovery.
- Visual and brand craft: distinguish a strong aesthetic preference from demonstrated first-time comprehension or task success.
- Behavioral measurement: small-sample formative tests and held-out artifacts, followed by rigorously controlled field evidence where possible. No arbitrary self-rated "soul score."

## Planned engineering contract / still blocked

1. Build one small representative work-task fixture each for MCP operator result, app first-value journey, outcome-first advertising, and customer service promise-to-delivery.
2. Independently inspect the actual baseline behavior and capture output and viewport/trace hashes. An unrun scenario is `NOT_RUN`.
3. Produce a **target-specific** GitHubResearch TaskMap with `repo -> commit -> file -> symbol -> test witness`. Retry after rate-limit recovery and/or index real source with documented CLI rather than trusting zero-score cards.
4. Compare at least one viable donor with the existing implementation on identical tasks; verify license, platform compatibility, security, negative paths and rollback.
5. Only then consider source changes to Interface Lab, with immutable provenance receipts and numeric baseline/candidate where meaningful.
6. Do not use GitHub Actions. Test on authorized M1/M2/M3 host and capture exact HEAD, exact MAIN, live SHA and user acceptance separately.

The two companion documents are **decision contracts** for that work, not a program certified across the company.
