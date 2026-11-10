---
name: human-finish
description: Research, critique, redesign, polish and verify websites, apps, MCP/CLI and agent workflows, marketing and service delivery that feel generic, impersonal, unpolished, like AI slop or zombie UI. Use for customer-job misunderstandings, absent brand point of view, weak emotional storytelling, missing anticipation, unhelpful tool output, dead-end first-use, awkward handoffs and repeated quality defects. Demand real source, customer, artifact and live-run evidence rather than a subjective aesthetic score.
---

# Human Finish

**Doctrine:** Scale intent, not efficiency. Make quality mean that the work demonstrates a deliberate understanding of a person, a real job, a distinct brand, the moment of use and the cost of failure. Removing gradients and AI words is not enough. Use [the operating system](../../docs/HUMAN-FINISH-OPERATING-SYSTEM.md), [project charter](../../docs/HUMAN-FINISH-PROJECT-CHARTER.md), [dated research evidence](../../docs/HUMAN-FINISH-RESEARCH-20261110.md), [first live audit](../../docs/HUMAN-FINISH-FIRST-LIVE-AUDIT-20261110.md) and [first actual escaped-defect lesson](../../docs/HUMAN-FINISH-LESSON-AISCENT-CONTRAST-20261110.md) and [pilots](../../docs/HUMAN-FINISH-PILOTS.md).

## Four separate design contracts

- **Professional tools (CLI/MCP/agent):** reconstruct the actual operator job, inputs and evidence, decisions, exceptions and artifacts. Inspect actual tool implementations, not README tool counts. Deliver an actionable recommendation, real source/time provenance and next owner. Do not create a UI to justify a service.
- **Applications:** protect the first-value task, information density for professional work, interaction semantics, data/permission truth, interruption/recovery and actual rendered craft. Beauty cannot rescue a broken task.
- **Marketing/editorial:** depict the plausible future a buyer desires, in an original brand world. Offer proof and mechanism as appropriate to buying stage. Do not default to a workflow screenshot or list of capabilities; AiSCent ads specifically forbid screenshots/dashboards.
- **Human service:** fulfill the outcome, support the customer and handle exceptions with an accountable human handoff. Software tools are backstage; promises, communication, delivery and recovery are the experience.

One product may need all four separate passes; keep the same factual promise but not the same design.

## Required work sequence

1. Identify the target repository, exact source SHA, deployed state, live URL or tool and real user job. Reproduce the baseline. Never narrate README claims as running truth.
2. Observe the as-done job across people, tools, approvals, actual work products, missing records, handoffs and interruptions. Use consented evidence and preserved customer wording. Mark observation versus assumption.
3. Create or update a per-project intent charter: user and paying buyer, trigger, job progress, alternative/workaround, business incentives, consequences of error, emotional journey, brand belief, rejected category convention and honest public promise. Unknown fields remain unknown.
4. Map trigger -> decision -> action -> artifact -> verification -> exception -> handoff -> done. Identify what needs human judgment and what can safely be automated.
5. Choose three substantially different directions for app/marketing art direction (hierarchy, imagery, content and behavior); for professional MCP work compare three job-delivery approaches, including human service/doing nothing. Record what was rejected and why.
6. Preserve existing modules, native platform conventions and protected business rules. Consult research-first Lego Builder, existing SMAT Research studies, actual donor source/tests/licenses, GitHubResearch TaskMap and Research Fabric. Do not handroll standard code or invent a donor receipt.
7. Review actual UI pixels, output artifacts and real interaction states, not idealized mockups. Inspect typography, image crops/rights, accessible focus, responsive and localized layouts, data provenance, offline/loading/stale/partial/error success, saved work, trust and truthful service promises.
8. When a shared token, type, link, button or state rule changes, audit a **route × surface × state** matrix, not just the homepage: pricing and first-value routes, light/dark surfaces, inline links versus filled buttons, focus and localized/mobile states. Check actual computed colors and visually compare baseline/candidate. Bank new escaped patterns in the shared lesson ledger.
9. Give every small touch a human reason, a brand reason and a failure counterexample. Unneeded animation, congratulatory copy, intrusive anticipation or excessive empty whitespace can be negative craftsmanship.
10. Compare baseline/candidate on identical real tasks and viewports. Run installed Playwright/axe/Storybook/visual-diff and actual tool tasks where possible, but these checks cannot self-certify human taste, autonomy, conversion or task success. Preserve repo's tests-removed policy; do not create green synthetic test theater.
11. Obtain independent first-user task and human craft evidence. Existing [Interface Lab acceptance](../../docs/ACCEPTANCE.md) and per-product policies govern release. A self-signed receipt is not human review.
12. Close CODE -> EXACT HEAD -> MERGE -> EXACT MAIN -> DEPLOY -> LIVE ACCEPTANCE -> ADVERSARIAL/REGRESSION. Bank every escaped defect as source, cause, repair, adverse case and affected projects.

## Failure and release hierarchy

**P0:** misleading claim, impossible critical task, unsafe permission, cross-tenant data, paid-but-undelivered result. **P1:** blocking first-value journey, inaccessible primary action or no recovery. **P2:** verifiable typography, accessibility, comprehension, layout and information-truth problems. **P3:** refined optical, motion and editorial detail; never prioritize above P0-P2.

For each repair return `location/step | observed behavior | source and SHA | customer consequence | brand reason | reused donor/module | proposed change | before/after acceptance | reviewer/owner`. Status must be OBSERVED, REPORTED, INFERRED, UNKNOWN or REFUTED; HOLD when human or live evidence is absent.

## Final work packet

Produce (1) one-sentence job and brand POV, (2) actual evidence ledger, (3) as-done workflow and human moments, (4) selected direction and alternatives rejected, (5) prioritized concrete changes, (6) before/after real artifacts and exact release receipts, and (7) next real-use test with the result's destination in the knowledge base. No generic "make it feel more human" as a finished recommendation.

**Current implementation boundary:** This skill coordinates human judgment, research and existing tools. It is not an autonomous design-quality certification engine. Repo documents are research-stage; the full standalone skill package contains additional self-contained references. Do not imply production deployment from its presence in git.
