# Native font fallback regression learned from EzSeller iPhone, 2026-11-17

A real sample-workspace EzSeller Money screenshot on iOS 26.3 showed **question-mark replacement boxes** in the marketplace switcher and freshness summary, even though the app launched, the 1206×2622 PNG was nonblank, the source compiled, and the native UI's semantic labels contained the correct marketplace name. The boxes represented unavailable country-flag emoji glyphs, not invalid seller data or a missing SF Symbol.

## Falsifiable before/after evidence

- Original EzSeller main source `2262d6912dc022c93e0e241dd2b44dd8ab77b258`, iPhone 17 Pro simulator, review-demo Money. Original PNG SHA-256: `707998c48d19393b851429eabe5eea5669855a796ef603d8229e93532737987d`. Original debug dylib SHA-256 `d47b97355a3af27a47891878300c339d16c189ab24cb34e36c79d9bdaecb44c8`.
- Exact-source candidate `5b0047fe2beca5ea90226ee5d305bd394ad4146b` retains the existing Amazon marketplace ID mapping but uses explicit two-letter country codes instead of flag emoji; unknown mappings display a textual fallback. All nine call sites in `Models.swift`, `EzSellerViews.swift`, `TodayChrome.swift` were source-checked and updated.
- Candidate `xcodebuild` iOS Simulator Debug compilation PASSED. Installed QA candidate debug dylib SHA-256 `f13fda850f78112dcdb81188ea0d667f4922b91f44da44358241e0cb3ba6ef77`. Same simulator, same sample Money screen after settle: replacement boxes no longer present; `US` rendered in toolbar and beside the marketplace label. Candidate PNG SHA-256 `3366458116305fc83748f7aeac6311ff0f47a0fe95abd934b8c54f152da5786e`.
- Local PNGs and snapshots are retained on authorized M3 under `~/workspace/ezseller-native-ui-qa-20261117/`, not committed as App Store artwork.
- Exact XCTest run and merge/deployment proof are separate gates. An existing partial accessibility pass does not certify visual text correctness.

## Interface Lab change

A verified accessibility identifier, valid image hash, nonblank PNG and successful layout audit **do not prove glyph availability** on the target OS, font renderer and locale. The native judge's `notVerified` now explicitly includes `font_glyph_rendering_across_device_locales`. This label prevents false trust without inventing an unreliable automatic tofu detector or assigning ungrounded design severity.

Required human review for new native app UIs: inspect labels, symbols, flag/emoji fallbacks, locally rendered numbers and mixed-script strings on actual devices across supported locales; include at least one change-of-language negative control. Promote a machine rule only after a validated detector benchmark has human-labeled false positive/negative cases. Until then, do not assign design approval or a visual score from an AX tree alone.

Apple native XCTest screenshot capture and SwiftUI system text are reused; no handrolled screenshot/OCR, glyph classifier or cross-platform font engine was added. The exact branch Node test asserts that incomplete native evidence retains the new explicit unknown. This is a **capture trust improvement**, not an App Store release or automated detection of every missing glyph.
