# Banked quality lesson: a successful click can be the wrong next step

**Recorded:** 2026-11-10. **Pilot:** AiSCent hosted `/launch-check` on Cloudflare Pages preview at `6f82cc3fc8bf59504412c6a045edc693bd09404e`. **Finding:** actual UI browser journey, not a representative customer study.

## Exact observed sequence

The operator completed real browser routes, not a test fixture, against `https://human-finish-contrast-202611.aiscent.pages.dev/launch-check`.

| Answer path | Result | Destination |
| --- | --- | --- |
| App works / needs store screenshots / page not started / first iPhone app | Finish App Store page before submitting | `/finish-my-app-store-page` (contextually consistent) |
| Apple rejected / unsure which message / unsure if already tried a fix | Start with latest rejection | `/apple-rejected-my-app` (contextually consistent, but a cold-reader test is needed for actual usefulness) |
| **Already submitted / Apple has not requested anything / first iPhone app** | **Wait for current review; don't create busywork** | **`/apple-rejected-my-app` (contextually inconsistent)** |
| Already live / needs more downloads / first app | Improve actual store-page story | `/app-is-live` (contextually consistent) |

For the inconsistent path, the route returns HTTP 200 and the client has no exceptions. Thus clickability, accessibility and completion do **not** imply relevance.

Source reference: `jabbertones-cloud/aiscent-help-site/app/launch-check/LaunchCheck.tsx` at `5426adf905da33d9ed4ea9b1b8067fa41a3178e2` includes `else if (stage === "submitted") { kind = "submitted"; href = "/apple-rejected-my-app"; }`. Exact reproduction and correction request: [AiSCent issue #75](https://github.com/jabbertones-cloud/aiscent-help-site/issues/75). No fix yet.

## Root cause class

**Behavioral slop / broken intent continuity.** A generic content-router matches one topic ("Apple review") but misses the user's actual stage and the stated next action ("wait"). The first user job is to reduce uncertainty and avoid unnecessary action, not make the person read about a rejection they do not have.

The professional craft question is not "Does the link work?" It is "Given what the person told us, does this next step honestly belong to them?"

## New shared gate: semantic continuity of user paths

For every major first-time flow branch, record:
1. User trigger and exact answers (no invented persona).
2. Program state and actual screen/result.
3. Promised next action, and what the user can *actually* do now.
4. Every offered destination and its *real content*, not merely status 200.
5. Whether the route remains appropriate for people who answer "no", "unsure", "not yet" or "already done".
6. Honest exceptions for users whose optimal outcome is to **wait**, decline, do nothing, contact a human or revisit later.
7. Real browser readback including outputs, navigation target and error recovery.
8. Human reviewer or representative customer response that the result is accurate and useful; no simulated signoff.

**Fail condition:** guidance assumes an event the customer explicitly says has not occurred, or claims the task was completed without real evidence. **Hold:** route is logically plausible but its target-job usefulness has not been evaluated.

## Scope control

Do not change customer-facing instructions or substitute a different pre-submission landing page merely because it is available. Research actual App Review wait-state questions and validate a relevant next destination with the Expert + SMAT Research lane. This is a separate user-behavior problem from AiSCent's CSS/accessibility fix PR #74.

## What to measure next

Representative first-app developers in waiting, rejected, and in-progress release states should each complete the matching branch without operator intervention. Ask what they believe they should do and whether the offered page actually helps them do it. Preserve disagreement and first-use stumbling in the knowledge base.

This is a live example of the program thesis: **tool and browser success are not human success**.
