# EzSeller Japanese / Arabic native screen audit, 2026-11-13

## Observed, not inferred

The M3's installed EzSeller iOS simulator binary (com.smatdesigns.ezseller, version 1.0, build 202610312053) was cold-launched by Interface Lab using `--review-demo --section=products` with locale flags `-AppleLanguages (ja) -AppleLocale ja_JP`, then `-AppleLanguages (ar) -AppleLocale ar_SA`. Both 1170x2532 full-size PNGs passed PNG QA. Both rendered UI headings and controls in English; the Arabic capture changed an observed date to an Arabic-calendar format without making the overall interface Arabic or RTL. Visual evidence (Japanese left, Arabic right): [comparison image](evidence/ezseller-products-ja-ar-SA-language-proof-20261113.jpg).

Screenshot hashes (flattened full-size): ja `f2df4ac6020629fbaaee4fa4e1bb48c4fa8bcc6820e37b32b900d2461eafc826`; ar-SA `5993eb05d069363128cce73237f77670db1125aa4c26bce1c6428a071015bbeb`. Unmodified raw captures are retained separately under `.uiux-evidence/native/` on M3 and excluded from the repository.

Independent source check on M2: `jabbertones-cloud/ezamazon` checkout SHA `1cb3481cb1794e8d8836fab753948d8427f91fb7` contains no `.xcstrings`, `.strings`, `.stringsdict`, or `.lproj` under Apple. The exact installed EzSeller `.app` has zero top-level `.lproj` and `.strings` resources and does not declare CFBundleLocalizations. The new Interface Lab capture output reports this evidence separately from screenshot QA. This does NOT prove no remote/programmatic translation mechanism exists, just that these captures and this inspected build show no localized UI.

## Severity and next remediation

Confirmed **localization coverage gap** for Japanese and Saudi Arabic only if those markets are in EzSeller's release scope. Product owner must decide supported locales; do not assume AiSCent's 39 markets transfer automatically to EzSeller. For supported markets, add Xcode String Catalogs and localized UI copy; retain locale-specific terminology and placeholder validity; test Arabic bidi and mirrored navigation, dynamic type, short/long form factors, dates/numbers, and VoiceOver. A generated translation is only a candidate until it is reviewed and observed in the built app.

Do not falsely mark translation readiness based on a language launch argument or an image file's name. Use original bundle resources, capture and visible content evidence, and native locale review separately.
