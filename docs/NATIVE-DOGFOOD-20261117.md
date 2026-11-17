# Interface Lab native-app dogfood, November 17, 2026

## Scope and proof levels

Targets: EzSeller iOS/iPadOS/macOS, AiSCent iOS/iPadOS/macOS, and the public EzSeller home page. This log records observed binary/version, capture, code, automated-audit and release evidence **separately**. It is not an App Store approval, current-device acceptance, native UX score, or claim that any new app change was deployed.

### Exact Interface Lab main QA

- Source: `jabbertones-cloud/uiuxlibrary` main `5912d324ab77a657bb522c3ada02cd6a48fae4e8` (merged PR #18). A clean M3 Max detached worktree was created without changing the older checkout or dirty app worktrees.
- M3 Node 22, `npm ci --no-audit --no-fund`: 21 packages; `npm test`: **42/42 passed**; `npm run verify`: PASS; token audit: **13 tokens, PASS_STRUCTURAL_ONLY**. These are source gates, not app or deployment proof.
- The initial live browser attempt correctly returned `HOLD`, with **0/17 sampled viewports**, because the pinned Playwright 1.65.1 Chromium 1255 binary was missing. Installing the matching official Playwright Chromium fixed the runner. Never classify that initial HOLD as an app failure.

### Fresh read-only production website audit

- Command: `node scripts/fleet-audit.mjs examples/smat-mcp-fleet.json --site ezseller`; run ID `5ca23e20-13dc-45a4-820e-50f89c6d07c4` on the M3. Real live source: `https://ezseller.smatdesigns.com/`. Result **FAIL: 10/17 viewports fail**, with **7/17 HOLD** for read-only origin policy requests; evidence report SHA-256 `4e32fab42a0bc27ad8897a5d18bc92dd8da55d10b51fa41f7cf6dbe236f039ac`.
- At 768px and above, Axe 4.14 reports serious nav contrast: active `#a94120` against `#020b18` **3.25:1**, other links `#435550` against `#020b18` **2.49:1** (8 to 9 affected nodes). A separate blocked non-allowlisted request is not waived by the contrast failure. 375px still HOLD, not PASS.
- EzSeller source PR [#1434](https://github.com/jabbertones-cloud/ezamazon/pull/1434) merged earlier on November 17 and specified new text colors; this **post-merge live rerun still reproduces the original rendered colors**. A merge alone is not a live deployment/fix. Determine whether the deployment is stale or other CSS overrides the fix, then exact-deployed-SHA check, retest all 17 viewports and blocked-request provenance.
- Original on-device report files and screenshots are in the M3 run directory `.uiux-evidence/fleet/<run-id>/`; excluded from source control; they are local runtime evidence, not externally authenticated customer sessions.

### Native screenshot integrity: known-bad iPhone Duo

- Five archived EzSeller Duo cover simulator captures dated November 14 under `~/ezseller-native-evidence/capture-plan-20261114/en-US/EzSeller QA iPhone Duo/`: Today, Orders, Products, Money, Inbox.
- **Each original PNG is exactly 2006 x 2852 RGB with R=G=B=0 for every pixel**, independently checked using Pillow `Image.getextrema()` on the M3. The XCUITest witness for each shot reports a matching intended page identifier and saved PNG hash. Today (`today.hero`) even has `hittable:false`. Page identity is not visual content proof.
- These five screenshots are **INVALID for visual comparison or rating**; never claim five successful UI screenshots or a Duo fold/unfold acceptance from them. The existing `src/native-visual.mjs` and `src/native-shot.mjs` should hold black/invalid evidence, even when the identifier and hashes match. The provider and simulator need a fresh capture; source cause of black pixels remains unproven.
- Separately, older 1170 x 2532 EzSeller demo screenshots do contain meaningful pixels, but the historical Orders sample included an OS `Open in EzSeller?` confirmation covering the app. Keep this contaminated image out of app-design scores. Apple documents `XCUIElement.isHittable` and `XCTestCase.addUIInterruptionMonitor`: use these **in the capture provider/UI-test workflow** to distinguish an interactable anchor from an existing-but-covered element, with static/read-only anchors treated appropriately. No universal `hittable` threshold was added here.

### Installed app identity versus latest merged sources

- M2 `/Applications/EzSeller.app`: bundle `com.smatdesigns.ezseller`, **1.0 build 202610292304**, inspected November 17. EzSeller [PR #1395](https://github.com/jabbertones-cloud/ezamazon/pull/1395) is a later merged candidate, not proof this installed binary contains it. That PR reported initial iPhone findings 28 -> 14 and iPad Pro 11 18 -> 0 under its recorded candidate tests; iPhone contrast and Duo/Mac release gates remain.
- M2 `/Applications/AiSCent.app`: bundle `com.smatdesign.localizeshots`, **1.3.2 build 202611040001**. AiSCent [PR #405](https://github.com/jabbertones-cloud/LocalizeShots/pull/405) improved first-run connection and sampled contrast; [PR #407](https://github.com/jabbertones-cloud/LocalizeShots/pull/407) merged 50-locale source with 11 newly added locales still `needsReview`. These merges are not proven installed, signed, uploaded, or localized-store-approved.
- M2 free space was ~13 GiB (below the established 14-GiB heavy-build guard), M1 ~5 GiB. Do not start heavy capture/build/release there or change machine security permissions just to manufacture green evidence. M3 had ~42 GiB free after browser setup.

### Specific product improvements to test on fresh binaries

1. **EzSeller:** from a truthful signed-out state, connect the authorized seller, then identify the highest-priority action without coaching. Verify first-party CommerceOS versus paying-customer Neon routing separately from visual UI. The older simulator Today page foregrounds figures, but user task proof is absent.
2. **EzSeller Money/Inbox:** measure whether sellers find owed vs unresolved amounts and the action-requiring issue before verbose explanations or paid Alerts messaging. The previous model-only visual density observations are hypotheses, not confirmed P1/P2 defects.
3. **EzSeller navigation/Orders:** test Inbox discoverability on compact iPad, Orders connection CTA and recoverability from an empty/no-authorization state. Cover normal, large Dynamic Type, VoiceOver, keyboard/focus on Mac, dark mode and Japanese/RTL where actually approved.
4. **AiSCent:** test first-run `Connect your agent`, credential handoff, real job creation, missing-authorization recovery and an iPhone Duo unfolded/folded transition if supported by that build. Keep 50-locale candidate text behind review gates. Test both iOS and Mac, not marketing screenshots alone.

### Feedback to the Interface Lab evaluator

- Add a **release-state / binary-freshness gate** before cross-version scoring: record source SHA, built executable SHA, installed app bundle version, simulator/device, screenshot SHA, witness, and deployment/TestFlight identity as distinct evidence. Hashes for binaries alone do not attest which binary produced a screenshot.
- Add an explicit **overlay-contamination classification** to capture QA, upstream of image aesthetics. OS `Open in EzSeller?`, notifications, stale app windows, black pixels and unconfirmed anchors require `HOLD`, not a UX severity grade. Apple's XCTest UI interruption API is the primary existing donor. Preserve static-label exceptions; do not blindly require every accessibility anchor to be tappable.
- Require same-device/same-state before/after comparisons; refuse mixing older initial-screen observations with newer patch binaries. Retain `CATEGORY_REGRESSION` on any worsened accessibility category, regardless of total decline. Keep human design quality and real first-time task success separate from machine checks.
- Calibrate with at least three representative unaided first-user sessions per critical job, recording first action, hesitations, recovery and outcome. Do not infer conversion or App Store acceptance from screenshots, Axe, or a model score.
- After verified native app changes, feed **positive and negative** cases into SMAT Research and GitHub Research Pattern Cards, with pinned source, tests and counterexamples. On November 17, GitHub Research MCP found no relevant positive Pattern Card/TaskMap for this specific Apple screenshot problem; Research Fabric returned degraded or weak matches. No donor success is claimed from those searches.

## Acceptance and release boundary

**Current status: tests PASS, evidence HOLD/FAIL, release NOT VERIFIED.** A completed iteration must show exact candidate source -> independent native build/XCTest -> real images and accessibility witness -> source comparison -> approved merge -> exact-main checks -> authorized app or website deployment -> live installed-build/readback -> adversarial regression. GitHub Actions remain disabled with no exceptions.

Apple primary sources: [XCTest UI interruptions](https://developer.apple.com/documentation/xctest/handling-ui-interruptions), [XCUIElement.isHittable](https://developer.apple.com/documentation/xcuiautomation/xcuielement/ishittable), [Accessibility audits](https://developer.apple.com/documentation/accessibility/performing-accessibility-audits-for-your-app), [WWDC 2023 Accessibility audits](https://developer.apple.com/videos/play/wwdc2023/10035/).

## Interface Lab incremental evaluator implementation (this branch)

- Opt-in `wait_for_traits.require_hittable: true` is validated as a Boolean and checks **both** XCUITest witness `hittable` and `enabled`. Static screen anchors remain backwards-compatible. This does **not** automatically detect an OS alert when XCTest reports an action hittable, and does **not** imply task success.
- Added source-pinned plans `examples/aiscent-ios-ipad-capture-plan.json` (five actual iOS tab destinations; first-run connection CTA required), `examples/aiscent-ios-first-run-connection-plan.json` (separate interactive button witness) and `examples/aiscent-macos-capture-plan.json` (six actual Mac sidebar destinations). Identifiers were checked against LocalizeShots source at `0f35c0f8356edf7ccdbc7dbeaf9e5fcbfb1ab8ac`, native UI tests, and Mac RootView. The plans have not yet captured a current signed app binary.
- Independently on M3: **47/47 Node tests passed**, `npm run verify` PASS, token audit 13 tokens `PASS_STRUCTURAL_ONLY`. All three new plans returned `PASS []` from AiSCent's actual Python `lib.capture_plan.validate` provider; no hand-rolled plan validator or capture engine was added.
- Official MCP client `npm run test:mcp:fleet`: **PASS**, 17 real localhost browser requests, 17 verified screenshot hashes, unauthorized origin and absolute manifest denied. Source-runner proof, not a hosted production service.
- Directly tested **all five real archived black Duo PNGs** with this branch's `verifyNativePng`, each rejected with `PNG_VISIBLE_CONTENT_EMPTY`. The five files share SHA prefix `0cf5ab5f428d4896`; matches the established visual-content gate and avoids a false screenshot pass.
- Additional live AiSCent website fleet audit: run `7956432e-b9e5-4290-a25a-879a59d46356`, 17/17 `PASS_AUTOMATED_ONLY`, zero FAIL/HOLD, report SHA-256 `492e71f1c95d2a847b44e4e9426a2a345b3290baeb75cd232c09f6d6d4cccd3f`. This cannot establish the native app's UX quality.
- Native app source unchanged in this Interface Lab PR. The new opt-in gate is not installed in the hosted two-tool MCP; applying it requires an authorized AiSCent capture and local Interface Lab evaluator. App Store submission and production native releases remain separate.
