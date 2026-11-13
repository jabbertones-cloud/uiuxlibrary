# EzSeller native interface dogfood, November 13, 2026

## Scope and evidence

This is a **visual review of real simulator frames**, NOT a completed user-experience usability test. All five screens were produced by SMAT Interface Lab directly through Apple's CoreSimulator tools, without AiSCent application/MCP calls. Mac: M3 Max. Simulator: EzSellerHF1382, iOS 26.3, iPhone-class framebuffer 1170 x 2532. Binary: com.smatdesigns.ezseller, version 1.0, build 202610312053. The app was launched with --review-demo and --section=NAME: **all figures are illustrative sample data, not real Amazon evidence.**

Evidence preview: evidence/ezseller-native-five-screens-20261113.jpg, order left-to-right Today, Orders, Products, Money, Inbox. This downsampled review sheet is not an App Store asset. Original pixel-perfect PNGs remain on the M3 under claw-repos/uiuxlibrary/.uiux-evidence/native/ and are excluded from git. Hashes below refer to the converted full-size PNGs, not the contact sheet.

| Page | Full-size PNG sha256 | Capture QA | Visual-review note |
| --- | --- | --- | --- |
| Today | 5b6491fd0758231d1befc3b043aadc128bbed7b2e39ea42a68ccca597f502fd5 | passed | Dense overview, priority action below heavy summary |
| Orders | 1aa0afb6fbd1fd9bc462fe96d53c51444c905265adfcc5ef473d0802f123d755 | passed | Honest sample empty state, first-time next step unclear |
| Products | 19315ed6ef14de9b100d35d0ab572878d0d1de0e44538535adcba1998bee5a40 | passed | Search, chip filters, segmented controls are tightly packed near bottom |
| Money | 6fc2831205049da05f4186168d75797e7b7ac54a8d4d6aad0df11303273daf3a | passed | The owed-units narrative is long and visually competes with the actionable amount |
| Inbox | 20c787dddd6738a9dccd8ed82e5ec1da750112ea8a1d2b38d18630f725799ca9 | passed | Filter chips and operational/plan messaging compete for space |

All five returned CAPTURED_SCREEN_IDENTITY_UNVERIFIED because a valid route, hash and PNG do not prove the accessibility anchor appeared. Assistant visual inspection found the requested tab/title visible in each contact-sheet image. This is not a human-user session or XCUITest/VoiceOver proof.

## Provisional design judgment

Heuristic first-screen readability score (1 = difficult, 5 = clear; NOT a conversion metric or customer satisfaction): Today 3/5; Orders 3/5; Products 2/5; Money 2/5; Inbox 2/5. Scored only on information hierarchy, scanning, density and apparent affordances of the captured first viewport; do not release-gate on these numbers.

P1 design candidates: simplify Money into an owed/recovered/unresolved summary with clear primary next action; make Inbox issue/action status dominant and move optional Alerts upsell out of operational content; reduce Products' simultaneous stacked filters at phone widths, keeping the most-used control accessible. P2 candidates: consolidate repeated seller-coverage banner into a compact persistent status; simplify secondary prose; explicitly label icon-only toolbar actions or provide clearly visible affordances. These are hypotheses pending scroll/tap, VoiceOver, dynamic type, contrast, localized RTL, first-run and real customer task verification.

Donor directions for separate design study: Apple HIG tab bars, toolbars, accessible navigation, SwiftUI content-unavailable/empty states; merchant fintech reconciliation tables and action-first inbox queues. Copy UX patterns only after source comparisons and actual user tasks, not from a generated mockup.

## Real regression outcomes

1. URL-only deep-link capture surfaced the OS "Open in EzSeller?" confirmation dialog and did NOT reach the requested page. A simulated reboot cleared the old dialog. Capturing with the app's already-implemented --review-demo and --section launch arguments reached the selected pages without invoking openurl.
2. The raw simulator PNGs contained alpha; the pre-existing LocalizeShots App Store screenshot checker rejected them. The independent adapter now preserves each raw file and validates a separate flattened PNG. Five captures passed PNG QA.
3. Invalid screen id "billing" returned HOLD, not a fabricated page.
4. Local Apple Translation on M2 returned ja "ようこそ" for "Welcome". Local Ollama Qwen on M3 returned the same Japanese candidate. A Qwen attempt on M2 previously timed out; the fallback is not universally proven on all Macs.
5. Real 706-key LocalizeShots String Catalog: fr-FR correctly maps to fr and currently has 4 review worklist cells. Its release gate is not ready. On a copy of the real catalog, a Japanese candidate that dropped %@ was rejected (zero writes), preserving the source.
6. No App Store/production release, source-site change, or TestFlight user sign-in was performed by these capture tests.

## Required next acceptance

Drive an app-specific UI test that asserts exact accessibility ID for each selected screen; exercise scroll and tap behavior behind the floating tab bar, keyboard/VoiceOver, Dynamic Type, Arabic/Hebrew RTL and translated caption wrapping; compare against real donor app examples; capture independent first-time task sessions with meaningful data. Do not confuse the five sample frames with full TestFlight usability certification.
