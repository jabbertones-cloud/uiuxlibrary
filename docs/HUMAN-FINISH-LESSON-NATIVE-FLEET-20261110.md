# Human Finish native app fleet: repeated runs, truthful promises, and test-harness classification

**Recorded:** 2026-11-10 (Arizona). **Status:** initial fleet intake, source inspection, and one native simulator test. **Not** a completed fleet review, a verified TestFlight inventory, human acceptance, a production patch, or an App Store release.

## Sources and observed facts

- A trusted physical iPhone running iOS 27.2 exposed installed bundles for AiSCent, multiple EzSeller variants, FedWatch, Clean Quest, ReFramed, FormConcierge, Civic Evidence, CourtWatch, NameSafe and other customer applications through the native installed-app inventory. An installed bundle does **not** establish TestFlight distribution, build provenance or ownership. The active phone was locked when the AiSCent launch was attempted, so **no on-device AiSCent user journey was observed**. The existing WDA runner did not remain reachable for stable automated UI inspection. No passcode or protected user data was collected.
- AiSCent App Store Connect read-only inspection confirmed app `com.smatdesign.localizeshots`, version **1.3.2**, with iOS `PENDING_DEVELOPER_RELEASE` and macOS `READY_FOR_SALE` at the time of inspection. An App Store version state is not the same as a complete beta/TestFlight build inventory.
- FedWatch checkout `jabbertones-cloud/Fedwatch` at **`f77974c9c657bdb806c38cffdc6c395c6f26021a`**: initial generic Test Lab fast check produced false-looking build/test failures because it searched the repository root instead of the actual nested project `Apple/FedWatchNative/FedWatchNative.xcodeproj`. Xcode project introspection located the real `FedWatchNative` scheme. A separate actual `xcodebuild test` on an iPhone 16e simulator running iOS 26.3.1 completed with an `xcresult` summary of **34 passed, 0 failed, 1 skipped**. The summary also contained repeated **"Invalid frame dimension (negative or non-finite)"** runtime warnings. Those warnings are a targeted investigation candidate; neither a customer-visible layout defect nor its root cause has been independently reproduced. No real first-time human tested this build.
- Clean Quest checkout `jabbertones-cloud/cleanquest` at **`1153a6fe0a18bd24828f1c4b609bae288d648251`**: source and project introspection located `native/CleanQuest.xcodeproj`, scheme `CleanQuest`. A scoped real simulator `xcodebuild test` run of `CleanQuestTests/OnboardingV2Tests` completed with an `xcresult` summary of **10 passed, 0 failed, 0 skipped** on the iPhone 16e simulator running iOS 26.3.1. Covered cases included state persistence, relaunch/dismissal, version migration, plan preview and goal-change replanning. Compiler warnings remain about an unused frame index and asynchronous notification API usage; neither was an observed customer defect. These are **unit tests of part of onboarding**, not an end-to-end first-use run or live TestFlight task.\n- EzSeller source at **`8fe74de736e4055d22ab483cf02f8f4dddacbb76`**: `Apple/Shared/EzSellerAppStates.swift`'s `NotifyWhenAvailableButton` saves a local `@AppStorage` opt-in Boolean and requests notification permission, then displays **"You're on the list — we'll remind you here when this opens."** The inspected scheduling functions in `Apple/Shared/EzSellerLocalNotify.swift` handle seller/inventory alerts, not an independently established plan-availability event. This is a **source-based candidate**, not proof no other fulfillment route exists. Follow the real event/provider/delivery path before concluding a defect. [EzSeller investigation #1382](https://github.com/jabbertones-cloud/ezamazon/issues/1382).

## Added quality gates: learn from the run, not just the visual output

### 1. Build passport, not a filename or brand guess

Before scoring an app, record **distribution channel (TestFlight, App Store, debug, enterprise, unknown)**, bundle ID, installed version/build, App Store Connect build/status if available, source repository and full SHA, device/runtime version, whether user state is protected, and exact route/task. If two identifiers share a product label, do not silently collapse them. A physical phone's installed-app list is not a TestFlight roster. If no signed artifact-to-source attestation exists, label it `UNVERIFIED_BUILD_SOURCE`.

### 2. Harness diagnosis gate

Run project/workspace/scheme introspection before native tests. Classify failures separately:
`TEST_SETUP` (wrong project path, missing destination, stale simulator), `ENVIRONMENT` (signing, provisioning, toolchain), `DEVICE_OR_PERMISSION` (locked phone, no WDA, unavailable account), `PRODUCT` (reproduced user task failure), or `UNKNOWN`.
Retest after correcting the *harness* but do not reclassify a warning as fixed. Preserve original raw diagnostic logs and the final `xcresult`. Exit code 0 does not erase runtime warnings, a skipped test, a hidden failure or unvisited interaction state.

### 3. Human Finish three-pass cycle per customer job

**Pass A: first value and truthful outcomes.** Identify real user and stage, trigger, first useful result, permissions, after-state, and destination. Audit launch/first-run, critical route, waiting, cancellation and recovery. Mark blocked/untested paths as `HOLD` rather than simulating success.

**Pass B: craft and native behavior.** Review *actual* pixels and a source-linked screen tree: layout, optical typography, accessibility labels and VoiceOver, Dynamic Type, Reduce Motion, touch targets, offline, empty/partial, localization, success/error, consent/denial, and one meaningful emotional detail. Compare before/after at the same device and app state. Keep each brand's point of view distinct.

**Pass C: changed-state/adversarial regression.** Repeat Pass A after a targeted change, plus declined permission, lost connectivity, interruption and resume, returning-user state, delayed asynchronous completion, and tests of adjacent screens affected by shared tokens. Inspect work product and recipient, not only whether a button can be tapped. Bank escaped failures into the reusable lessons.

Repeat A→B→C on a changed candidate at least twice when further defects appear; each iteration must record what failed, what actually changed, and what is *still unverified*. Independent first-time humans and reviewer sign-off remain separate release requirements.

### 4. Promise-to-delivery gate

For a reminder, order, subscription, notification, agent action, saved work or scheduled follow-up, trace:
`visible promise → consent/input → persisted state → owned provider/event trigger → actual side effect/delivery → recipient experience → cancel/recover → independent proof`.
A green tap, local Boolean or notification-permission prompt does **not** establish subscription, delivery or future availability. Test allowed, denied and revoked permissions; if fulfillment cannot be shown, use truthful narrower copy or withhold the promise rather than inventing an endpoint.

### 5. Do not leak device/user information in shared quality evidence

The private audit ledger may contain restricted device/app identifiers as necessary, subject to authorized storage. Shared lessons contain only generalized facts, sanitized build evidence and source links, never device UDIDs, passcodes, production access tokens, names of individual users, user screenshots revealing conversations, or private seller/health/customer data.

## Fleet ledger contract (per app and per run)

`product | native bundle ID (restricted if needed) | target user/job | distribution confidence | installed/build version | exact repo SHA | environment | pass number | task/branch | observed result | proof reference/hash | human-craft observation | defect severity + evidence grade | root-cause classification | smallest change + donor | retest/adverse result | reviewer | delivery/production evidence | next action`.

**Evidence grades:** `OBSERVED_TEST`, `OBSERVED_SCREEN`, `SOURCE_CANDIDATE`, `REPORTED`, `INFERRED`, `NOT_RUN`, `BLOCKED`. A machine-generated summary is not an independent human evaluation.

## Acceptance for expanding this lesson into a fleet rollout

- Reconcile **complete App Store Connect/TestFlight app and build membership** against native installed app lists; do not claim the list is complete without provider evidence.
- Run a real first-use and return-user task on each *reachable* app. Label unreachable apps and their exact reason. Preserve user/device state; do not bypass passcode, silently sign out or trigger paid/destructive actions.
- Run source/design tests with correct project/scheme and saved `xcresult`; investigate warnings separately.
- Fix only reproducible defects with a verified donor/native API and scoped branch. No invented framework. Re-run at least two iterations with negative states, human review and exact-head release gates.
- Source changes, PR approval, merge, deployment, App Store state and live user success are different receipts. A PR or a simulator test never implies an app has been shipped.

**Current outcome:** One FedWatch simulator suite and one focused Clean Quest onboarding suite verified, one EzSeller promise-delivery question filed, significant native fleet inventory gathered; no product source change, merged fix, TestFlight upload, customer task sign-off or comprehensive fleet finish is asserted.
