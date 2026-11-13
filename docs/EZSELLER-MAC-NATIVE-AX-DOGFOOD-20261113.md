# Interface Lab Mac native AX evidence: EzSeller dogfood 2026-11-13

Source: `jabbertones-cloud/aiscent-mcp` PR #49 (`c4c372a22fa00898adb2a03fe2595c2332a49bec`) native ApplicationServices AXUIElement pre/post witness, against EzSeller PR #1395 candidate source. Interface Lab baseline `4d0237a34e32eb62f3a647f3613eff636637da23` rejected Mac window-only receipts, correctly.

## What changes

- Accept *only* native Mac screenshot receipts with explicit `mac` platform, screen-identity source `macOS AXUIElement identifier before and after screenshot`, same PID and exact `wait_for` anchor before/after, nonzero Quartz window ID, correct bound PNG SHA, exact native screenshot size, independent visible-content pixel check, and valid capture completeness.
- Prior window-only Mac receipts fail closed. Missing AX proof, missing required additional accessible elements, modified bytes, wrong Mac dimensions, duplicate images, and cross-screen altered identifiers all fail closed in tests.
- Keep results limited to `SCREEN_CAPTURE_VERIFIED_ONLY`, never assert `UX_PASS` or contrast/a11y zero. Mac Apple accessibility audits, real task success, visual design and final shipped app binary are explicitly unverified.

## Real baseline vs experimental candidate

- AiSCent capture provider candidate: **20/20** Mac identity/completeness screenshots across Today, Orders, Products, Money, Inbox at 1280x800, 1440x900, 2560x1600 and 2880x1800. Exact screenshot hashes validated on M2 and independently transferred with SHA-256 `51599c2a1c8d79cdbf3c00a29fc0cb239275ce0b463183aff71e56f2776f295f`.
- Independent Interface Lab baseline review of those 20 screenshot files: **17/20** passed. Three *Orders* screenshots were very sparse and failed `PNG_VISIBLE_CONTENT_EMPTY`. This exposed a real design gap rather than proving the judge wrong.
- After introducing a native SwiftUI `ContentUnavailableView` for Sample workspace in EzSeller PR #1395, separately captured four Orders screenshots passed both provider identity and Interface Lab pixel-content gates **4/4**. These are from a newer app build; do not mix evidence from different binaries to claim a full 20/20 single-build visual pass.
- New Interface Lab unit tests exercise provenance binding, negative evidence, unsupported sizes and duplicate captures. The completed Apple `XCUIApplication.performAccessibilityAudit` on iOS is a distinct gate; the Mac screenshot engine does **not** run that accessibility audit.

## Source and donor posture

Existing `pngjs`, image hash verifier, Apple native `ApplicationServices.AXUIElement` and `XCTest` were reused; no new parser, hashing primitive, screenshot engine or dependencies added. Mac receipt format comes from the actual AiSCent candidate, not invented SDK fields. Apple official documentation: https://developer.apple.com/documentation/applicationservices and https://developer.apple.com/documentation/accessibility/performing-accessibility-audits-for-your-app .

Live Mac captures require Mac Accessibility and Screen Recording grants; no local TCC policies were modified. Both app projects remain independent: this PR updates the offline Interface Lab evidence verifier, not AiSCent itself. Main-branch merge and deployment remain separate checks.
