# SMAT Interface Lab acceptance contract v1

This document is a release contract, not a popularity contest or an AI-generated grade.

## Gate precedence

1. **Business truth / user job**. Identify the customer, job, existing workflow, first concrete value, truthful permissions, and purchase/delivery reality. If the claimed action is unavailable, stop design polish. A beautiful dead end is a P0 failure.
2. **Grounded research / rights**. Record Figma/Mobbin/gallery provenance, actual donor license and commit, and which sources are patterns only. A marketing description or image is not tested component source. Record rejected options.
3. **Architecture**. Preserve the app's existing framework and native platform APIs. Prefer established components, source-mapped primitives, and the app's current design system. Require three-tier DTCG-based governance as an SMAT project policy, not a W3C normative requirement.
4. **Component behavior**. Storybook stories for realistic variants and states: idle, focus, hover, pressed, loading, disabled, success, error, empty, stale data, unauthorized, offline, extreme content, localization and reduced motion. Test interaction and no fake actions.
5. **Automated checks**. Unit/interaction tests, axe-core for the supported automated WCAG checks, layout overflow across phone/tablet/desktop, keyboard and focus behavior, reduced-motion, screenshots and baseline diffs. Axe passing never equals WCAG compliance.
6. **Independent visual review**. Inspect real screenshots from the changed UI, not generated mockups. Evaluate concept, differentiation, type hierarchy, optical alignment, compositions, image treatment, spacing rhythm, useful density, and multi-state consistency. Human reviewer must record specific accepted and rejected findings. Do not auto-approve based on style vocabulary.
7. **Realistic first-user tasks**. Observe a minimum three first-time representative sessions for the critical job, with zero operator intervention and truthful test credentials. This is a small-sample early acceptance test, not statistical evidence that conversion will rise.
8. **Release proof**. Exact source/HEAD, exact MAIN, deployed SHA, live URL under real permissions, an independent first-time live acceptance attempt, and adverse regression. No claim of release from a file containing self-declared SHAs alone.

## Outcomes and stop lines

- P0: impossible or untruthful advertised task; missing permissions, inaccessible critical action, cross-tenant data, bill-without-delivery. Blocking regardless of appearance.
- P1: lost or hard-to-recover first-time journey, missing error recovery, broken small viewport, unusable keyboard/focus. Blocking until fixed.
- P2: measurable readability, hierarchy, layout, and consistency problems; fix before design approval.
- P3: intentional polish: motion, iconography, subtle states. Improve only after P0-P2.
- No soft-pass status for absent browser or absent tester. `HOLD` is a result, not permission to narrate a pass.

## Required local receipt file

The CLI's `receipt` command checks existence and SHA-256 of named evidence files plus the minimum gates. A valid *synthetic test fixture* must never be passed off as a real customer session. The CLI's strongest status is `EVIDENCE_COMPLETE_INDEPENDENT_REVIEW_REQUIRED`, not `APPROVED`. It cannot authenticate the human reviewer, verify data rights, or independently query live service source attestation.

The root object must have `schema: smat-uiux-receipt/v1`, `project`, `workType: new|redesign`, `candidate.sha` (40 hexadecimal characters), `baseline.sha` for redesign, `customerOutcome.job`, `customerOutcome.firstValue`, and a `gates` object.

Required gate names: `source_rights`, `tokens`, `component_behavior`, `accessibility`, `browser_responsive`, `visual_regression`, `human_visual`, `customer_task`. Release also requires `production_proof` and `release.mainSha`, `release.liveSha`, `release.url`.

Each passing gate needs at least one `evidence` item with workspace-relative `path` and the SHA-256 hash of its exact current bytes. No absolute paths, symlink escapes, stale files, or missing artefacts. `human_visual.reviewer` needs `kind: human`, `id`. `customer_task.sessions` needs 3 sessions with `taskId`, `sessionProof`, `firstTime: true`, `success: true`, `operatorIntervention: false`. These fields remain declarative; a separate reviewer must validate their truth.

## Risk-weighted testing

Web: keyboard, pointer, mobile touch, light/dark, localization and RTL, 200% zoom, destructive actions, network delay, signed-out / wrong tenant. Native: Apple HIG, VoiceOver, Dynamic Type, Reduce Motion, orientation and non-primary language. MCP UI: host CSP, resize, tool permission, data loading/error, host fallback, sandbox isolation, private data policy.

## Scope and evidence distinctions

- `PASS_STRUCTURAL_ONLY`: token governance passes; no assertion of font quality or contrast.
- `PASS_AUTOMATED_ONLY`: browser + axe automated snapshot at sampled viewports passes; no claim that every path or WCAG criterion was manually verified.
- `EVIDENCE_COMPLETE_INDEPENDENT_REVIEW_REQUIRED`: hashes and supplied fields pass; no independent identity/live checks performed.
- `HOLD` or `FAIL`: required evidence absent or a measurable defect observed.
- `APPROVED`: **never automatically returned by these tools**. Independent human and production evidence required outside this source bundle.
