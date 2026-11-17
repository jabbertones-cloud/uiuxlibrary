# Native post-action evidence: AiSCent and EzSeller, November 17 2026

## Why a verified screenshot is not enough

Real AiSCent Mac dogfood found two successive implementations where the `today.open_agent` AXButton existed, was enabled, and an AXPress returned success, yet the app opened `onboardingWelcomePage` **instead of** `onboardingAgentPage`. A parent `.accessibilityIdentifier("today.disconnected_setup")` also initially masked the button's own ID. A screenshot of the button would not have caught either failure.

The corrected app now uses Apple's `SwiftUI.sheet(item:)` with an explicit per-presentation OnboardingModel identity. Source [LocalizeShots PR #425](https://github.com/jabbertones-cloud/LocalizeShots/pull/425), merged exact main `5ba4fb1b1897c3aebd4ae55c918d848522fc5d80`. An independent M3 arm64 Mac `xcodebuild LocalizeShotsAppStore CODE_SIGNING_ALLOWED=NO build` succeeded. With a launched app, an actual AXPress of the uniquely identified, enabled `today.open_agent` button returned an AX tree containing `onboardingAgentPage`, hosted MCP endpoint and pairing-code action, and no `onboardingWelcomePage`. No pairing code or credentials were issued.

## Improvement to Interface Lab

Use `examples/aiscent-macos-agent-postaction-plan.json` to navigate via `tap.id: today.open_agent` and then verify the **destination** `wait_for: onboardingAgentPage`. This is separate from the existing Mac six-sidebar capture matrix. Both `checkMacShot` and the actual AiSCent capture-plan parser must reject the wrong destination, even if the PNG is nonblank and a preceding button press succeeded. Added negative tests asserting `SCREEN_ANCHOR_MISMATCH` and `MAC_AX_WITNESS_BINDING_INVALID` for Welcome pretending to be agent setup.

The plan is a **reusable contract**. The new plan was structurally validated against real AiSCent `lib.capture_plan.validate`, and Interface Lab Node tests passed at source head. It is not itself a completed capture-provider execution. The native Mac AX replay is an independently observed interaction, not a remotely verified App Store build.

## EzSeller second target

The EzSeller current main `1fb8a98d21e7ee43373fde0f959472206f41519a` compiled into an iPhone simulator app. The QA iPhone 17 Pro (iOS 26.3) originally carried older executable SHA `56cfd3e8...`, backed up locally before installing the new debug build; version/build Info.plist remained `1.0 / 202610312053` despite changed source. This demonstrates why bundle version alone is insufficient: record source HEAD and actual built main executable + debug dylib hashes.

Immediately after launch the first 1206x2622 screenshot showed a blank transition, but after settling it showed real Today. Four additional distinct settled sample screenshots (Orders, Products, Money, Inbox) were captured. All were explicitly labeled synthetic review-demo, not live Amazon data. The Money first viewport packed an unknown reimbursement-rate claim into a long paragraph; source and screenshot candidate are tracked in EzSeller separately and **not** marked improved until same-state after-image/negative regression proof.

## Official and research witnesses

- Apple WWDC25 [Record, replay, review UI automation](https://developer.apple.com/videos/play/wwdc2025/344/)
- Apple WWDC23 [Perform accessibility audits](https://developer.apple.com/videos/play/wwdc2023/10035/)
- Apple WWDC20 [UI interruptions and alerts](https://developer.apple.com/videos/play/wwdc2020/10220/)
- SwiftUI [sheet(item:)](https://developer.apple.com/documentation/swiftui/view/sheet(item:ondismiss:content:))
- Fabric jobs `localizeshots:7409d083-0bf2-4d02-8069-977a333e5a7b`, `ezamazon:1af48af1-56e8-45c3-be9b-86ae7591a00d`, `uiuxlibrary:5705f1b6-3763-40f6-aa94-22aa828e0ad2`; external donor guidance remains provisional, not verified.
- Unloopr actual Swift diff scan: `clean`; unrelated incident-forensics tool error `No module named 'incident_evidence'`, do not promote its absence into confidence.
- No GitHub Actions, no signed App Store uploads, no human user-session research and no unverified UX quality score.

## Release acceptance required

Before claiming improved product UX, match source SHA, built executable/debug dylib, device/simulator, locale, state, screenshot SHA, post-tap AX destination and Apple audit receipt. Replay first-time user tasks unassisted and verify actual connected seller/agent outcomes. Source merge is not deployment; the hosted Interface Lab MCP still has separate capability and operational gates.
