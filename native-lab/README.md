# Interface Lab: native simulator and localization tools

Independent of AiSCent. This is a scoped port of SMAT-owned LocalizeShots primitives and Apple's public xcrun simctl and Translation interfaces. It never calls AiSCent MCP, App Store Connect, TestFlight, or shipping workflows.

## Native screen selector

The screen catalog maps choices to routes exposed by the target app. Screens cannot be discovered or proved from URL schemes alone. uiux_native_screens lists the choices, uiux_native_simulators enumerates actual Mac simulator runtimes, and uiux_native_capture takes a chosen screen, simulator, locale, and optional display UUID. Multi-display targets (including iPhone Duo) require an explicit powered-on display identifier.

Example on a Mac with EzSeller installed in a booted simulator:

    npm run native:list
    npm run native:screens -- --screens-file native-lab/examples/ezseller-screens.json
    npm run native:capture -- --screens-file native-lab/examples/ezseller-screens.json --screen orders --device EzSellerHF1382 --locale en-US --output .uiux-evidence/native/ezseller-orders.png

A route, nonblank PNG and hash are capture evidence only. The output deliberately says CAPTURED_SCREEN_IDENTITY_UNVERIFIED until an accessibility/XCUITest anchor proves the requested view appeared. The locale is passed as an application launch argument; it is not proof the entire simulator OS is in that locale. Simulators must have matching installed iOS/iPad apps; device-signed IPAs are not simulator apps. For Duo, list the live displays after each pose change.

## Localization

    npm run native:locale -- status --catalog path/to/Localizable.xcstrings
    npm run native:locale -- manifest --catalog path/to/Localizable.xcstrings --locale ja
    npm run native:locale -- gate --catalog path/to/Localizable.xcstrings --locale ja
    npm run native:locale -- pseudo
    npm run native:locale -- translate --input /path/to/request.json

The local Apple Translation adapter accepts JSON with source_locale, target_locale, texts map and protected_terms array. It returns candidates with approved:false; unsupported or undownloaded language models are reported rather than fabricated. Catalog changes use apply --catalog ... --input ... --confirm and always mark new strings needsReview. Placeholder mismatches are rejected; no autonomous approval or localization release occurs.

## MCP setup and boundaries

Run the existing MCP server from Interface Lab on a trusted Mac with UIUX_NATIVE_ENABLED=1. The MCP uses fixed Python entrypoints with argument arrays, not a generic shell endpoint. It accepts only route/catalog paths under the Interface Lab workspace or operator-registered UIUX_NATIVE_ALLOWED_ROOTS (colon-delimited absolute paths). For writes to translation catalogs, also set UIUX_NATIVE_LOCALIZATION_WRITE_ENABLED=1 and pass confirm:true. Captured PNGs live under .uiux-evidence/native/, excluded from git.

## Donor provenance and limitations

Internal donor: jabbertones-cloud/LocalizeShots local checkout 0edf775e80508f184fda398b0de5093e45ff2787. Files: Vendor/aiscent-executor/c6b2b04/capture_sim.py, lib/{capture_plan,sims,locales,quality,state,sim_target_proof,plan_yaml,xcstrings,placeholders,pseudolocalization}.py, scripts/apple-translate-json.swift. Donor files retained verbatim except for adapter code in native-lab/cli/. Source identities are recorded in git; do not export this bundle to unrelated projects without ownership/license review. Apple's documented native simctl and Translation APIs are runtime authorities.

Known limitations: XCUITest screen-anchor proof is not yet implemented; source strings do not guarantee visible localization; no AI-generated translation is approved without native review; only iOS/iPad simulator and XCStrings are integrated in this phase. TestFlight device testing, macOS window capture, marketing graphics and ASC submission remain separate. Interface Lab npm run verify is a structural check only, not end-user acceptance.

Research receipts: SMAT Research App Fleet Program study; GitHub Research MCP library search for simctl localization locale screenshot deep link capture plan (LocalizeShots pinned files); Fabric job 8de98930-47e8-40e2-8ff4-6cbfc9452ed2 (external search rate limited, ledger degraded); Apple HIG, WWDC 2025 Record, replay, and review: UI automation with Xcode. Exact source and behavior must be checked independently; partial research lanes do not establish production readiness.
