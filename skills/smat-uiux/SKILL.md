---
name: smat-uiux
description: Build, redesign, audit, critique, and verify high-quality UI/UX for web apps, native apps, SaaS dashboards, landing pages, onboarding, checkout, and MCP Apps. Trigger on UI design, visual polish, accessibility, flow confusion, first-time usability, Figma or screenshot references, design system changes, user-journey failures, and design release review. Require customer-outcome grounding, pinned donor research, SMAT three-tier DTCG token governance, real browser/component evidence, human visual critique, first-user task testing, and fail-closed acceptance. Use the installed MCP or bundled Node checker when available; never equate prettier screenshots with a usable product.
---

# SMAT UI/UX: evidence-driven interface engineering

Do not start with decorative components. Start with the buyer's actual job, the live interface, and what fails between sign-up and first value. **No tool count, screenshot, score, model opinion or PR status can stand in for customer success.** This skill is the design brain; the maintained Figma/Storybook/Playwright/axe tools are execution and measurement. The included Node CLI enforces a subset of structural and evidence gates offline.

## Task routing

- **Audit an existing app**: first get real route/screenshots, code, user states, and current first-user journey. Report observed failure vs suspicion. No unobserved broken-flow claims.
- **Redesign UI**: map current customer task and protected business behavior. Gather references, propose at least three truly different composition directions, implement the selected direction, and compare baseline/candidate with screenshots at the same viewports.
- **Create new UI**: use the real app's component library and tokens; only add missing primitives from maintained donors. Do not build a new design system when one already exists.
- **Figma/Sketch/image reference**: use the connected native design MCP where available. Distinguish access to exact nodes/variables from a screenshot's visual appearance. Never invent Figma structure.
- **Review a branch or PR**: identify exact base and candidate SHAs, changed routes, design-system blast radius, and excluded surfaces. Read removed code before claiming a regression.
- **Native Apple UI**: start from Apple HIG/WWDC and actual platform APIs; do not impose web-component conventions on SwiftUI, AppKit or UIKit.
- **MCP Apps UI**: verify host support, CSP, resize, loading/error/permission state, and fallback. A tool schema does not equal a usable interactive widget.

## Mandatory design sequence

1. **Customer contract**: Record user, job-to-be-done, experience level, task initiation, first value, permission/billing claims, baseline failure, and non-negotiable product invariants. Name the one critical first-time journey. No UX approval when this task is blocked.
2. **Source reconstruction**: Inspect the target code, routes, component APIs, design tokens, live page/visual proof, release SHA, failures and previous UX research. Do not confuse a README or marketing copy with working software.
3. **Research and rights**: Consult existing SMAT studies, GitHub Research Pattern Cards/TaskMaps when available, relevant Design/Apple Expert evidence, and Research Fabric. Check each candidate donor's real source, license, tests, maintenance, pinned commit and negative results. Read `references/donors.md`. If an evidence lane is unavailable, disclose the downgrade; no fabricated tool calls.
4. **Art direction, not imitation**: Create at least three meaningfully different proposals for hierarchy, content emphasis, grouping, information density, imagery and interaction. Each must explain how it makes the target task clearer. Do not copy gallery images or proprietary assets. Compare against real buyer and platform needs, not fashion alone.
5. **Design system governance**: Preserve current brand and framework. Use SMAT three-tier `primitive -> semantic -> component` naming with DTCG token syntax when creating or changing tokens. This is an internal rule, **not** a requirement imposed by W3C. `scripts/uiux-check.mjs tokens <file>` must pass structurally; then use actual rendered contrast checks separately. Do not hardcode arbitrary component colors, dimensions or one-off font values without a documented exception.
6. **Donor-first implementation**: Prefer verified native APIs and installed components. Next, use a maintained official registry or documented donor. Avoid homemade dropdowns, auth, tab semantics, focus traps, charts, form validation, palettes or SVG icons where a mature equivalent fits. Implement only domain-specific glue. Preserve accessibility and functionality during redesign.
7. **Component truth**: Stage all relevant states in Storybook or an equivalent native harness. Cover empty, loading, success, error, focus, hover, disabled, stale, long text, extreme numbers, reduced motion, translations and RTL when supported. `break` and `state-machine` concepts are useful; re-render failures after fixes.
8. **Real-browser verification**: Run Playwright/axe and focused interaction tests on sampled phones, tablets and desktops with actual fonts/assets. Verify keyboard operation, focus, accessible names, labels, contrast, targets, overflow, no dead actions, responsive behavior, zoom and reduced motion. Browser must be available; absent runtime is **HOLD**, never SKIPPED/PASS. Review the screenshots themselves. Axe is partial WCAG coverage, not a conformance certificate.
9. **Visual critique**: Independently inspect screenshots against `references/visual-review.md`. Evaluate actual typography, image fidelity, spacing rhythm, visual storytelling, originality and component relationships. Record specific *bad* outcomes with repair scope; stop using reassurance or subjective green checks. A model may recommend but must not self-identify as the human approver.
10. **Customer acceptance**: Run the real critical journey with three first-time representative test sessions, no operator-only secrets or manual help, and record task success, failure point and artifact. Three sessions are a small-sample release gate, not proof of population conversion gains. Test business truth (permissions, revenue, entitlements, delivery) as applicable.
11. **Release proof**: Exact HEAD -> merge -> exact MAIN -> authorized deploy -> live SHA -> first-time customer journey -> adversarial regression. Validate `scripts/uiux-check.mjs receipt <file> --release` then obtain independent live/human proof. The script only verifies local file hashes and claims; it cannot itself declare production approval.
12. **Iterate**: If a gate fails, produce issue -> cause -> donor-backed repair -> new measurement. Do not call a revision better without comparing the old and new failure. Stop only at explicit acceptance or give a precise HOLD ledger.

## Minimum decision output

Produce a compact, traceable ledger with: **customer task**, observed baseline, failure severity, user/business consequence, selected donor and exact pinned source, changed surface, expected behavior, automated gate results, before/after screenshots, human review evidence, observed first-time task results, exact source/deploy receipts, and **APPROVED / HOLD** status. `APPROVED` is reserved for independently observed human and live acceptance; never automatically returned by the scripts.

## Run actual checks

Node.js 22.13+ is sufficient for the bundled structural and evidence scripts:

```sh
node scripts/uiux-check.mjs tokens /path/to/tokens.json
node scripts/uiux-check.mjs receipt /path/to/receipt.json
node scripts/uiux-check.mjs receipt /path/to/receipt.json --release
```

The bundled script checks SHA-bound local artifacts relative to the current project directory. Use MCP tool `uiux_audit_tokens`, `uiux_audit_page`, `uiux_release_gate`, and `uiux_research_donors` if the separate **SMAT Interface Lab MCP** has actually been installed and initialized. Do not say those tools ran unless they returned results. Consult `references/runtime-adapters.md` for when to invoke official Figma, Penpot, Storybook, Playwright, axe and component registries. No connector is presumed configured.

## Design constraints

- Brand and narrative first; **never** force the same purple gradient, rounded cards, glass effect, typography pairing or token palette across unrelated products. Generic sameness is a design failure, not evidence of consistency.
- Prioritize semantics, legibility and meaningful states. No fake buttons, silent failure, contradictory price/permission language, stretched imagery, invisible focus or content hidden by a sticky header.
- Treat anti-slop rules as falsifiable signals, not blind bans. An unusual visual treatment is allowed when an observed user task, platform and art direction justify it.
- For quantitative data: units, time range, source provenance, stale/estimated status, actionability and uncertainty must be clear before decorative chart work.
- For native iOS/macOS: Dynamic Type, VoiceOver, SF Symbols, HIG, motion preferences and correct platform navigation supersede arbitrary web token constraints.
- Never import source code from unlicensed donors, scrape protected screenshot datasets or bypass agent approval/sandbox permissions to make a demo work.

## References

- `references/donors.md`: selected verified candidates with commit, license and rejection notes.
- `references/runtime-adapters.md`: MCP/CLI tool roles and permissions, including availability fallback.
- `references/visual-review.md`: non-numeric art-direction and screenshot critique rubric.
- `references/acceptance.md`: deterministic scope, receipt data contract, and what each result does *not* prove.
- `assets/token-seed.json`: example DTCG three-tier tokens only; never impose its colors on production apps.
