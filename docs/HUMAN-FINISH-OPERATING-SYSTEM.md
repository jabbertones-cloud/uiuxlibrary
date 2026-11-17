# Human Finish: Intent and Craft Operating System (research-stage proposal)

**Status:** PROPOSED / RESEARCH-ONLY. No fleet-wide enforcement, test execution, commercial approval, or deployment is implied by this file. It extends, rather than supersedes, [the existing interface acceptance contract](ACCEPTANCE.md) and the [existing SMAT UIUX skill](../skills/smat-uiux/SKILL.md).  
**Origin:** Product direction and research requested 2026-11-10. **Owner for enforcement:** per-repository release owner.  
**Thesis:** Scale intent, not efficiency. The system is responsible for preserving earned knowledge of the customer, the job, and the brand through design, implementation, marketing, service, and release. The objective is not to make AI outputs look human; it is to eliminate ungrounded decisions and produce work that a responsible specialist would stand behind.

## 1. What this system does, and does not do

An unpolished product may have a visually generic surface, a conceptually generic purpose, a behavioral mismatch with real work, a failure to create emotional confidence, or an operational habit of repeating the same mistakes. Visual lint is useful for the first, but never suffices for the others.

Human Finish is a **four-lane quality discipline** that must use real product evidence and separate outputs:

| Lane | Customer-facing promise | Internal evidence object | Review focus |
|---|---|---|---|
| MCP / CLI / agent service | A concrete professional job gets finished or decisively advanced | Observed job map, tool-to-decision graph, output artifact, exception paths | Truth, actionability, permissions, provenance, handoff, recovery, task completion |
| Product app / dashboard | Person becomes more capable, informed, and in control | First-time journey, task and state model, source/render screenshots, instrumentation | Navigation, behavior, control, trust, comprehension, visual craft |
| Marketing / public website | Buyer can imagine a credible, desirable future and understand the offer | Buyer language, desired-outcome story, brand POV, truthful claim-to-proof map | Distinctive art direction, emotional resonance, first-exposure understanding, qualified action |
| Paid service / fulfillment | Promise is delivered reliably and with appropriate human care | Service blueprint with frontstage/backstage work, exception ownership, delivery and recovery ledger | Responsiveness, completeness, status visibility, fairness, personal attention |

Never show technical tools as the default advertising concept. Conversely, never remove professional details from the CLI/MCP operator's actual work product simply because a marketer prefers simplicity. **Internal depth and external clarity are complementary, not identical.**

## 2. The psychological contract: what the user must feel and know

Use these as hypotheses to test with representative people, not universal psychological scores:

1. **Competence:** "I can do this; I can tell what matters next." Give decision-ready context, language they use, meaningful feedback, and intelligible results.
2. **Autonomy:** "I can choose, inspect, correct, undo or decline." Make consequential automation bounded and visible. Avoid pushy interrupts and surprising side effects.
3. **Trust and security:** "The system is telling me the truth." Distinguish observed from estimated, stale from fresh, completed from queued, and paid from merely offered.
4. **Relatedness and recognition:** "This was made for someone in my situation." Anticipate documented recurring obstacles without guessing personal traits or crossing privacy boundaries.
5. **Meaning and aspiration:** "I can see why this is worth doing." Let marketing portray the desired future; let the product make that future real.
6. **Delight and distinction:** "Someone thought about this." Care appears in preserved work, thoughtful defaults, appropriate pacing, error recovery, copy, optics, and final delivery. Decorative motion is not a proxy for care.

**Counterexample rule:** Each claimed thoughtful detail needs a named user situation, its intended benefit, one way it could annoy or fail, and a check. If those cannot be stated, the detail is not approved merely because it is charming.

## 3. Product-specific intent charter (required before generation)

Each enrolled repository must have a versioned project-specific charter. A template lives in [HUMAN-FINISH-PROJECT-CHARTER.md](HUMAN-FINISH-PROJECT-CHARTER.md). Do not fabricate filled fields to pass a gate. Unknown is a legitimate state; invention is not.

A complete charter answers:
- **WHO:** principal user, paying buyer, operator, reviewer and forward-to; novice/expert needs; access and privacy constraints; which of these are actually observed.
- **JOB:** event that starts the work, real previous workaround, what the person is trying to change, interruptions, collaborators, artifacts, last-mile handoff, external constraints, and what done means.
- **BUSINESS:** employer/client/regulator rules, money and permissions, SLA, adverse outcomes, non-recoverable actions, service economics, proof-of-delivery.
- **BRAND POV:** one belief about the user's world; one industry convention we refuse; three purposeful behavioral traits; three "we never do this" boundaries; what we sacrifice to preserve the belief.
- **PROMISE:** exact outcome the product or service can support today, with evidence and explicit exclusions; public price and enrollment/entitlement truth.
- **EMOTIONAL ARC:** situation at entry, anxiety/hope, first moment of relief, moments of uncertainty, after-use self-perception; include dissenting users and bad outcomes.
- **RESEARCH:** direct observation and quotes, source IDs, dates, sample/segment, confidence grade, contradictions, unresolved assumptions, next falsifying test.

**Brand is a decision rule, not a color palette.** Every attribute must prescribe visible behavior or an editorial choice and show at least one rejected alternative. For example "calm" might mean a single next-action recommendation with provenance, not a dashboard of ten competing CTAs. Not every product should be calm; evidence and positioning decide.

## 4. The preplanned SOP: no more generate-then-apologize

### Gate A. Discovery: observe work, not only opinions

Before the first mockup or tool:
1. Identify one representative job and its current as-done workflow; distinguish policy ("supposed to do") from behavior ("actually do").
2. Collect at least two evidence channels where available: consented observation/contextual inquiry, support cases, anonymized tool traces, real customer documents, role job descriptions, and the human incumbent's deliverables.
3. Record transitions across people and tools, repeated re-entry, hidden approvals, checks made outside the system, and reasons for mistrusting automation.
4. Map "trigger -> decision -> action -> artifact -> verification -> exception -> handoff -> done." Link each node to source evidence or mark it as a hypothesis.
5. Record what people do *not* want automated, the circumstances they want intervention, and the cost of a wrong guess.
6. Capture "jobs not served", including the work a user completes before and after using our product.

**Fail:** No named first valuable outcome; fake customer persona; a workflow invented from a README; no path to check assumptions.

### Gate B. Intent and art direction: choose, do not average

1. Write the product thesis: user tension, why alternatives leave a gap, why this brand is entitled to solve it, and which tradeoff it willingly accepts.
2. Create at least **three genuinely different directions** for marketing or an app (information hierarchy, density, storytelling, visual grammar, interaction). Cosmetic palette swaps do not count.
3. For an MCP, compare **three job-solving alternatives** (including non-automated service and doing nothing) rather than three graphical skins.
4. Critique each option against the same user/job contract. Reject directions with a concrete reason. Log the selected design and the attractive option consciously declined.
5. Derive design tokens and language from the chosen direction; preserve existing native platform patterns.

**Fail:** A generic layout selected because it scores 92/100 without a user reason; novelty for novelty's sake; brand adjectives with no behavioral implications.

### Gate C. Build with preserved constraints

- Reuse existing domain logic, interface components and maintained platform APIs; source/license-pin new donors.
- Write the first-value path before the peripheral settings and feature catalog.
- Treat empty, loading, stale, partial, offline, permission-denied, billing-blocked, error, recoverable retry, destructive action, success, return-user and abandonment/re-entry as designed states.
- Save prior user input and give an honest way to continue. Never use a success animation to disguise a queued or failed operation.
- For domain reports, expose units, source/time range, uncertainty, recommended decision and next owner. "Dashboard" is not an outcome.
- For a service handoff, name who owns the unresolved problem and when the user will next hear from us.

### Gate D. Professional craft pass

Review actual rendered pixels/behaviors, at real device viewports, font loads and representative data:
- Typography: typeface rationale, font fallback and glyph coverage, optical alignment, line measure, baseline rhythm, tracking, numerical alignment, line breaks, widows, localized text.
- Composition: semantic grouping, focal point, reading order, visual density, fold behavior, responsive transformations, zoom/RTL, whitespace that communicates rather than fills.
- Assets: original/authorized imagery, subject truth, natural detail and perspective, crop at every format, consistency without repetition, true logos, accessible equivalents.
- Interaction: every button actually works; keyboard/VoiceOver/focus; high-latency/low-bandwidth; reduced motion; gesture alternatives; no stolen user control.
- Words: product-specific nouns and verbs, truthful claims, concise states, error that describes what happened and how to recover; no generic hype or fake proof.
- Emotion: does the experience support the intended state? Does the behavior contradict the brand promise? Would the surprise still be welcome on the tenth use?
- Finish: check receipts and real output artifacts, not self-scored screenshots or illustrations of planned results.

Axe and screenshot-diff detect categories of error, but cannot certify good design. The human reviewer must record the exact route/state/crop, observation, user consequence, and before/after disposition.

### Gate E. Independent acceptance and evidence

Use the existing [ACCEPTANCE.md](ACCEPTANCE.md) as the minimum technical/customer release contract.
- **P0:** capability/price/permission/cross-tenant/payment/delivery truth broken. Block.
- **P1:** critical task, error recovery, or accessibility/interaction broken. Block.
- **P2:** measurable comprehension/visual/readability/information integrity defect. Repair and retest before design approval.
- **P3:** craft/detail improvements. Seek them deliberately, but never degrade P0-P2.
- Minimum three representative *first-time* sessions for the critical journey, as the existing local contract specifies. Report the small-sample nature, do not claim a conversion lift.
- Test both novice and expert roles when their workflow differs. Blind/counterbalanced comparisons when feasible. Record disagreements, not just average scores.
- A model can propose repairs. **Independent humans** observe judgment, comprehension and subjective quality. A valid receipt is not a human signature.

### Gate F. Ship, watch, and learn

1. CODE -> EXACT HEAD -> MERGE -> EXACT MAIN -> DEPLOY -> LIVE ACCEPTANCE -> ADVERSARIAL/REGRESSION. No step inferred from an earlier one.
2. Instrument actual first-value delivery and recovery (without secret/PII collection).
3. Every observed defect enters a permanent `quality-lessons` register: customer situation, evidence, first failing version, root cause, correction, negative fixture, owner, re-test and affected products.
4. Distinguish shared reusable principle from project-specific taste. Shared guardrails prevent repeated harm; per-brand direction prevents sameness.
5. Re-run the affected gate after changes. Source changes invalidate downstream receipts. Stale evidence is HOLD.
6. Revisit research assumptions on new contradictions, user quotes and paid delivery results. "No evidence" stays visible until tested.

## 5. Different scripts for different surfaces

### A. MCP / CLI / decision systems (internal operation first)

Primary acceptance question: **Did the professional get a correct, actionable, explainable work product in their own workflow?**

For each job, test:
- Cold request from the user's natural words, not tool names.
- Inputs they actually have; smallest data request and honest missing-input response.
- Exact decision, ranked action queue, reason/provenance and confidence/uncertainty where relevant.
- Permissions, human approval for consequential actions, idempotence, retries and failure recovery.
- Time-to-decision and manual work left; natural-language response *plus* needed file/record/hand-off.
- Changing conditions: stale data, conflicting records, absent access, no action warranted, negative result.
- What the user copies, forwards or delegates after receiving the result.
- Real task simulations with held-out documents and subject-matter reviewers, not tool-count benchmarks.

**Example hypothesis, not a claim of an existing shipped flow:** An Amazon account operator should receive a decision-ready listing exception queue with evidence and a verifiable next action, not an impressive inventory of SP-API endpoints.

### B. Application / SaaS design

Primary acceptance question: **Can the right user enter, understand, complete and recover their job without a guide?**

Review identity and hierarchy, onboarding, permissions, the first committed action, state transitions, saved work, contextual assistance, accessibility, mobile, localization, data integrity and trust. Show less only when less preserves the user's next decision. Professional density is a feature where it supports expert work.

### C. Marketing / editorial / storefront

Primary acceptance question: **Can a buyer see a believable desirable result, recognize themselves, trust the claim, and know what to do next?**

Start with the buyer's present tension and hoped-for future. Build a visual world where the transformation is felt rather than shown as a feature list. Differentiate through a brand-specific belief, editorial point of view and evidence. Provide concrete mechanism and proof when the buyer reaches evaluation; do not presume aspiration alone converts technical, high-involvement purchases.

For AiSCent advertising, keep `AISCENT-ADS-CUSTOMER-OUTCOME-NONOVERRIDABLE-V1` intact: do not put UI/screenshots/dashboards in ads. App Store screenshots are a different governed deliverable. The marketing design must not fabricate outcomes or imagery to satisfy this policy.

### D. Human-delivered services

Primary acceptance question: **Was the result delivered, and did the customer know what to expect throughout?**

Define scope and "done", identify the human accountable for the result, status milestones and preferred update channel; handle missing records, delays, quality disputes, changes and refunds. Audit promise-to-delivery continuity. The premium touch is often truthful anticipation ("here is the issue and my next move"), not extra onboarding steps or theater.

## 6. Shared tool architecture (planned, not implemented by this document)

Preserve `uiuxlibrary` as the interface/quality spine. Add interoperable **adapters**, not a monolithic redesign agent:

1. `intent_intake`: ingest a versioned per-project charter and linked, graded customer/job evidence; reject unsupported persona claims.
2. `workflow_mapper`: source-linked as-done job graph and exception/handoff map, with verified vs assumed branches.
3. `brand_pov_review`: check proposed choices against explicit brand beliefs, prohibitions and actual user situations; output disagreements, not a taste score.
4. `surface_polish`: route to existing Playwright/axe/Storybook/visual-review checks for interfaces, decision-task tests for MCP, claim/proof and first-exposure tests for marketing, service-blueprint checks for fulfillment.
5. `moment_review`: record anticipated entry, wait, error, success and aftermath moments; require purpose and failure case for proposed details.
6. `finish_gate`: reconcile evidence from these lanes with existing release receipts, reject stale/missing human or live proof.
7. `learn_from_result`: append falsifiable defects and corrected rules to a governed project + fleet lesson ledger.

**Do not build these as seven new handcrafted engines.** Reuse the installed CLI, existing SMAT customer knowledge, AiSCent editorial tests, and source-backed donor components. Determine API boundaries and acceptance fixtures in a target-specific GitHub Research TaskMap before executable implementation.

## 7. Rollout with explicit proof

- **Stage 0 (this proposal):** charter, research ledger, four profiles and stop conditions. No executable feature or fleet installation.
- **Stage 1:** one pilot each for (a) MCP decision result, (b) live app first-value task, (c) outcome-led marketing piece. Each with real baseline, human reviewers, independent task evidence and a holdout.
- **Stage 2:** build tiny source-backed adapters into Interface Lab and reuse existing checks. Produce before/after artifacts and numerical metrics only where comparable.
- **Stage 3:** pin one shared standard from a canonical repository and enroll projects with their own separate charters. Use pre-commit/CI/physical-host release gates suited to the repo, not blind copying.
- **Stage 4:** measure whether the program reduces repeated defects **and** improves actual job completion, comprehension, brand recognition and paid fulfillment, relative to baseline. Mark uncertain conclusions as uncertain.

**Anti-success theater:** A green style linter, 100/100 synthetic design rating, copied prompt, pleasing illustration, merged PR, or a service marked "healthy" is not proof that a person got the promised result.

## 8. Research foundations and limits

See [HUMAN-FINISH-RESEARCH-20261110.md](HUMAN-FINISH-RESEARCH-20261110.md) for source classes, primary literature, SMAT reuse evidence and the unresolved research-lane restrictions. This document is a **proposed operating contract**; it does not assert that these ideas produced measurable benefits for any SMAT product.
