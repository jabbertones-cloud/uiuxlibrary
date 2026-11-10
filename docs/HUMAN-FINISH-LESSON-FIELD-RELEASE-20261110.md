# Human Finish — Field Lesson: First Live Release (AiSCent contrast repair)

Banked 2026-11-10 under Skill step 13 (CODE -> EXACT HEAD -> MERGE -> EXACT MAIN -> DEPLOY -> LIVE ACCEPTANCE). Source job: HF-20261110-aiscent-contrast-fix, aiscent-help-site 5426adf -> e0af277, live-verified (accessibility 89 -> 100, contrast failures 37 -> 0, brand orange preserved). Each entry: source | cause | repair | adverse case | affected projects.

## L1 — A release gate that checks the wrong credential reports a wall that is not there
- Source: the builder stopped the release because `gh auth status` on the M3 seat reported an invalid keyring token, while the same checkout's git origin (SSH) authenticated to the org successfully minutes later.
- Cause: the release path treated `gh` CLI auth state as the state of GitHub access. They are different transports with different credentials.
- Repair: before any release, verify the exact transport the repo's remote actually uses (`git remote -v` protocol + a read-only `git ls-remote`), not a generic GitHub login state. A wall claim must name the transport that failed.
- Adverse case: a lane with working push access idles a finished, verified patch as 'blocked on auth' — or worse, a lane routes around a real wall because a different tool's green state was mistaken for access.
- Affected projects: every fleet repo released from a Mac seat.

## L2 — Single-run Lighthouse performance is noise, not a baseline
- Source: unchanged AiSCent production scored Performance 85 in the pilot baseline and 100 in a fresh run the same day, before any code changed.
- Cause: single-run lab measurement variance treated as a product property.
- Repair: performance baselines and after-claims use the median of at least three runs under stated conditions. A one-run delta is INFERRED at best and is never reported as an improvement or a regression. Accessibility audit items (named failing nodes) are stable evidence; category performance scores are not, on their own.
- Adverse case: a CSS-only patch gets credited with a performance improvement it did not cause — the exact claim-inflation this system exists to prevent.
- Affected projects: all sites using Lighthouse receipts.

## L3 — Selector-list repair misses inherited color (second instance of the contrast lesson)
- Source: the first implementation pass over the pilot's named selectors left 14 contrast failures, all from inherited or specificity-overridden gray text outside the named selector list (proof-workflow paragraphs, control-flow small text, pricing-card spans). The second pass, driven by computed failures rather than the selector list, reached zero.
- Cause: repairing the selectors the audit named instead of sweeping every rendered text element's computed color.
- Repair: token repairs are verified by a full computed-color sweep of the rendered page (every text node, its effective color and background), not by re-checking the repaired selectors.
- Adverse case: an after-report of '0 failures' that only re-measured the places it fixed.
- Affected projects: any shared-token change; see Skill step 8.

## L4 — Homepage-only acceptance leaves sibling routes carrying the defect
- Source: the contrast acceptance contract was written and passed against the homepage. The same stylesheet still sets `.legal a:not(.brand){color:var(--orange)}` with no text-token override (source, globals.css @ e0af277) — legal-page body links at the brand orange's ~3:1 on the page background. A route x surface x state matrix audit was commissioned the same day to confirm the full extent before repair.
- Cause: acceptance scoped to the audited page instead of the stylesheet's reach.
- Repair: when a shared token or stylesheet changes, acceptance covers every route that stylesheet serves; the matrix (Skill step 8) is part of the same job, not a follow-up.
- Adverse case: a release announced as 'contrast fixed' while legal and support routes still fail the same users.
- Affected projects: AiSCent first; any multi-route site after a token change.

## L5 — Name a fallback builder route in every brief
- Source: the OpenAI API route was out of credit for the entire day (verified twice); every job still completed because the ChatGPT chat route was live. The fleet also holds Gemini and Flint seats that no brief that day named.
- Cause: briefs named one builder as if its availability were a constant.
- Repair: every build brief names its primary builder route and its fallback, and a route's failure is reported as a route state ('API credit exhausted'), never as 'the work cannot be done'.
- Adverse case: a program stalls for a day behind a billing state on one vendor.
- Affected projects: all builder-dispatched work.

## L6 — An audit without source identity is not an audit (self-reported)
- Source: the fleet MCP-site audit run the same morning (nine sites, findings with quoted page evidence) recorded no repository, source SHA, or deployed state for any site — a direct miss against Skill step 1, committed by the coordinating agent, not the builder.
- Cause: page-text evidence felt sufficient because the findings were real; the identity passport was skipped.
- Repair: every Human Finish audit opens with the identity passport (repo, exact SHA or deployed revision, live URL, date). A return missing it is incomplete and gets sent back, including when the coordinator wrote it.
- Adverse case: a finding that cannot be re-checked after the next deploy, because nobody recorded what was audited.
- Affected projects: all Human Finish audits.
