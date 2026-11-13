# Native Apple app judging with AiSCent Fleet God Mode

**Scope:** EzSeller iPhone, iPad, macOS first; reusable for other TestFlight apps.
This is not a browser Lighthouse audit, not a mockup generator and not a new capture engine.
AiSCent MCP is the capture provider. SMAT Interface Lab is the evidence and rubric reviewer.

## First-party source contracts

- AiSCent `fleet-server/lib/capture_plan.py`: plan v1, explicit locale/device/shot matrix and fail-closed page-identity gate.
- AiSCent `fleet-server/lib/capture_plan_xctest.py`: XCUITest wait-for identity, PNG hash, QA receipt.
- AiSCent `fleet-server/lib/capture_plan_mac.py`: macOS window capture, **not** AX identity proof. Until it actually verifies `wait_for`, Interface Lab holds all Mac screenshots.
- EzSeller `Apple/Shared/EzSellerViews.swift`: real Today, Orders, Products, Money, Inbox sections.
- EzSeller `Apple/Shared/EzSellerStore.swift`: `--review-demo`, `--store-screenshot`, `--section=...` and `--appearance=...` launch flags.

## Input / output contract

Use RemoteDesk on M2 to invoke AiSCent **Fleet God Mode**, not physical iPhones.
Call `localizeshots_capture_plan` with a built iOS Simulator app and
`examples/ezseller-ios-ipad-capture-plan.json`. Call
`localizeshots_capture_plan_mac` with a built Mac app and
`examples/ezseller-macos-capture-plan.json`. Keep each target's output and
`run_id` separate. Preserve the entire `plan_results` object as JSON,
not just an aggregate `captured` count.

Then call `uiux_review_aiscent_native` with:
- `capture`: relative path under `UIUX_WORKSPACE` to the JSON from AiSCent.
- `plan`: relative path under `UIUX_WORKSPACE` to the exact plan JSON.
- optional `review`: reviewer-supplied six-axis rubric with evidence references.

The reviewer verifies one and only one result per planned cell, matching bundle,
not dry-run, honest XCUITest `wait_for`, `destination_verified`, image QA,
actual local PNG hash and decoding. It cross-checks witness identifier, bundle ID, simulator UDID, element type, tap sequence and PNG SHA-256 against the plan and file. It rejects repeated byte-identical screens.
It reports an **evidence coverage percentage**, never a fabricated UX quality percentage.
Missing captures, simulator errors, external paths, symlinks, missing visuals and all
current Mac-only window captures are **HOLD**, not PASS.

A human rubric (0..5 per dimension, anchored to verified screen names) may record
task clarity (20), navigation (20), action feedback (15), hierarchy (15),
accessibility (15), resilience (15). It remains labeled `HUMAN_REVIEW_RECORDED`,
not independent task validation or release proof. Do not record a score without
actual screenshots. Screenshots and AX identifiers alone cannot prove sign-in,
financial correctness, workflows, Amazon authorizations or TestFlight eligibility.

## Current EzSeller baseline, November 13, 2026

AiSCent verified iOS TestFlight 1.0 build 202610312053 as VALID for internal-only.
No matching macOS TestFlight build was uploaded. The iOS build is not eligible as
an App Store distribution binary. The M2 screenshot runs produced **no verified
native images**. Prior Mac runs returned `no window` and the iOS tool exceeded
its request timeout; do not assign an interface rating from these.

The M2 fleet runtime's default Python 3.15 lacked `cryptography` and `Quartz`.
Both user-local dependencies were installed and their import / ES256 checks passed.
This repaired ASC readback, but did NOT repair Mac window detection or certify
the Simulator capture path. M2 disk pressure repeatedly crossed the hard floor.
Stop new capture builds whenever machine health reports disk emergency.

## Findings that should drive repairs

1. Mac AiSCent needs true accessibility `wait_for` proof, not window settle alone.
2. AiSCent dry-run `captured` and `completeness_gate` counters are planning-only:
   Interface Lab rejects all `dry_run: true` runs.
3. The broker's 120s time limit loses long simulator runs; use durable runtime
   jobs with a persisted run ID and independent readback, not duplicate retries.
4. Check all five canonical desks, including Orders (actual feed), Products,
   Money and Inbox; legacy `inventory/actions/account` names are wrong.
5. Judge screenshot layout, navigation, VoiceOver, large type, dark mode,
   loading/offline states and real first-time customer outcomes **separately**.

## Release discipline

No verified screenshot = no visual score. No independent customer task evidence
= no completion claim. Code compiled or a PR merged != TestFlight deployment.
Require exact source/binary/version, native runtime capture, AX witness, screenshot
hashes, visual review, user task replay, merge, TestFlight reread and live acceptance.

## Native accessibility audit receipts (opt-in)

AiSCent plan modes.audit_accessibility: true requests Apple XCTest contrast,
hit-region, clipped-text and element-description checks for each native
iPhone/iPad screenshot. Interface Lab reads only the result in the validated
XCTest witness, aggregates category counts and exposes accessibilityAudit
separately from image verification and user task ratings. Absent, failed,
partial or malformed audits are NOT_RUN / UNVERIFIED / PARTIAL, never
reported as accessibility passes. A zero-issue audit still cannot prove
VoiceOver workflows or full accessibility. No seller labels or PII are
required in the aggregate. Primary donor: Apple
XCUIApplication.performAccessibilityAudit (WWDC23 session 10035).
