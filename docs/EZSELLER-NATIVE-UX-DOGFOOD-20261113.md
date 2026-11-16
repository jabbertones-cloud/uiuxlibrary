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

## iPad size follow-up, November 14, 2026

The same review-demo build (`com.smatdesigns.ezseller` 1.0 / 202610312053)
was captured on three iPad size classes. These are supplemental visual findings;
they do not replace a complete XCUITest/device acceptance matrix.

| Device | Display pixels | Capture result | Identity evidence |
| --- | ---: | --- | --- |
| iPad Pro 11-inch (M4), iOS 26.3 | 1668 x 2420 | 5/5 captured; image QA passed | AiSCent XCTest page witness and PNG hash for every screen |
| iPad Pro 13-inch (M5), iOS 26.3 | 2064 x 2752 | 5/5 nonblank; image QA passed; Today did not settle | simctl route arguments only; no XCTest identity |
| iPad mini (A17 Pro), iOS 26.3 | 1488 x 2266 | 5/5 nonblank and settled; image QA passed | simctl route arguments only; no XCTest identity |

The iPad 11 screenshots and witness receipts are on `smat-m3max` under
`/Users/tatsheen/ezseller-native-evidence/capture-plan-20261114/`. The Pro 13
and mini images are under `interface-lab-simctl-ipad-pro-13-m5/` and
`interface-lab-simctl-ipad-mini-a17-pro/` in the same evidence directory.
AiSCent's broker timed out after persisting the 11-inch matrix. The additional
size captures therefore used Interface Lab's existing simctl adapter, which
reports `CAPTURED_SCREEN_IDENTITY_UNVERIFIED`. Visual inspection confirmed the
requested title/tab on each screen; this is an automated heuristic review.

The installed runtimes reject the requested iPad mini (A20 Pro) simulator as
incompatible. The A17 Pro mini is a same-size-class substitute, not proof for
the A20 Pro hardware/runtime. The Pro 13 Today capture also reported
`settled=false`; inspect it again after a stable capture before using it as
acceptance evidence. The Pro 13 frame showed a system Apple Intelligence
notification at the top, which obscures some app chrome.

### Provisional size-specific findings

- On the mini, the horizontal desk selector shows an overflow arrow after
  Money; Inbox is off-screen in the initial view. Check discoverability with
  first-time sellers and VoiceOver before changing navigation.
- Orders consistently explains that the sample workspace has no live orders
  and tells sellers to connect to review them. This appears honest; verify that
  first-time sellers understand what action to take.
- The Products screen keeps its search, filters, display selector and rows
  readable on the mini image, although the stacked controls remain dense.
- Money carries a long reimbursement explanation; Inbox presents counters,
  filters, a reimbursement alert and prioritized issues together. Keep the
  earlier density concern as a human-session hypothesis, not an accepted
  design defect.
- Today foregrounds the price approval and labels the workspace/sample data.
  Its comparison date remains `2026-10-05`; verify the date is intentionally
  static before judging the recency language.

### Calibration iteration 1: harsh model-only critique

Reference scope is the app's own three iPad captures and its sample seller task.
AiSCent's App Store marketing creatives are excluded: the surface and user goal
are different. Findings below name what the images show separately from what a
seller might do; no numeric quality score or human preference is inferred.

| Finding | Evidence in captured output | Severity / confidence | What to test next |
| --- | --- | --- | --- |
| Phone-sized navigation hides Inbox from the initial tab row | On iPad mini, tabs stop at Money and show an overflow arrow; Inbox is not visible until navigation scrolls | Observation: high. Task impact: unknown. Priority: unassigned. | Ask first-time sellers to locate pending issues without prompting; verify VoiceOver order |
| Orders empty state has explanation but no obvious connection action | “Connect to review live orders” is explanatory copy; the screenshot shows no clear primary CTA | Observation: medium. Task impact: unknown. Priority: unassigned. | Ask sellers what they would do next and whether they can start connecting from this page |
| Money makes the narrative compete with the amount | The “owed to you” explanation is the first dense block above reimbursement totals | Observation: high. Task impact: unknown. Priority: unassigned. | Ask what amount is actionable and what remains unconfirmed |
| Inbox mixes issue triage with an Alerts plan upsell | Counts, filters, a reimbursement notice, issues and “See EzSeller Alerts plans” share the screen | Observation: high. Task impact: unknown. Priority: unassigned. | Ask which item needs action; test whether the upsell interrupts issue handling |
| Today gives a strong next action, but the sales trend date may be stale | “Needs you” price approval is prominent; trend text compares against `2026-10-05` in a Nov 14 sample | Observation: high. Data risk: unknown. Priority: unassigned. | Confirm the fixture's date intent; ask sellers how recent they think this comparison is |

These are candidate findings, not P2 defects: the screenshots establish visible
content and layout, but cannot establish task failure, data correctness, or
severity. The current six-axis weighted score also has no human-calibrated
benchmark in this evidence set; treat its number as a structured human summary,
not a validated quality measure or release threshold. Do not tune weights from
these model-only observations.

The capture system passed one important calibration check: black iPhone frames
were blocked even though their XCTest accessibility labels looked valid. It
must not score an image from accessibility labels alone. It also surfaced a
separate rule: system overlays and unsettled captures (the Pro 13 Today frame)
are capture contamination, not app-design defects. Exclude those frames from
visual comparisons until recaptured cleanly.

This pass improves the review protocol, not the product UI or rating model.
`npm test` passed all 21 tests and `npm run verify` passed. The judge code
returns `NOT_RATED` without a valid human review and `HOLD` when capture evidence
is incomplete; accessibility tests also keep partial audits `UNVERIFIED`.
Keep these observations as candidate findings until the three seller sessions
reproduce or disconfirm them. For each session, record the participant's first
action, hesitation, wrong turn, task result, and intervention. Promote a rule
into the regression corpus only when the evidence falsifies the current rubric
or repeats a task failure; keep a counterexample and the reason for the change.

#### Calibration eval for the next iteration

Before changing the rubric or judge, replay these cases and require the expected
decision:

| Case | Expected decision |
| --- | --- |
| App Store ad creative proposed as a native app reference | Reject as a mismatched surface/task |
| XCTest page labels point to a black PNG | HOLD; do not infer visual quality from labels |
| Screenshot suggests a dense or hidden control, but no task evidence exists | Record an observation; leave priority unassigned |
| Human rating is present but independent task success is absent | Preserve `independentTaskSuccessProven: false` and `releaseEligible: false` |
| System notification obscures an otherwise valid screen | Exclude the contaminated frame and request a clean recapture |

Iteration 1 self-evaluation: reference scope and black-frame handling met these
expectations. The first critique draft overclaimed severity; this revision
removes priorities until task evidence exists. This is a model self-check, not
an independent grader result. Re-run `npm test` and `npm run verify` after any
judge-code change; require human review before changing numeric weights.

### First-time seller session script

Run three separate, first-time seller sessions with the same build and review
demo workspace. Each session is diagnostic; three participants do not establish
statistical usability or conversion outcomes.

1. Explain that this is a sample workspace with illustrative data. Ask consent
   before taking notes or recording; avoid collecting seller names, account
   details, or real Amazon data.
2. Give only this task: **“Look at this sample seller workspace. What needs
   your attention first, and what would you do next?”** Do not explain the tabs
   or suggest an action. Let the person explore and think aloud.
3. If they stop, use only neutral prompts: “What are you looking for?” and
   “What would you expect to happen if you chose that?” Do not guide them to
   the intended card.
4. Record the first item they identify, first action, hesitation, wrong turns,
   whether they can explain the risk, completion, time to first useful action,
   and every intervention. Capture their exact explanation without identifying
   details.
5. End with “What felt unclear or risky?” Keep the participant's answer apart
   from observer interpretation and automated scores.

Only change the rubric or regression corpus after a reproducible observation
or a participant-confirmed judgment correction. Resolve the iPhone blank-frame
capture and exact A20 Pro runtime before claiming native matrix acceptance.
