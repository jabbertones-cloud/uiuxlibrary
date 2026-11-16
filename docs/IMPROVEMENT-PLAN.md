# Interface Lab improvement plan

## Goal

Use one evidence-based workflow to improve SMAT websites, native apps, and the
Interface Lab itself. Keep automated findings, human observations, and customer
outcomes separate; only promote a judgment rule after comparing it with human
evidence.

## Relevant project surfaces

- `uiuxlibrary/`: Interface Lab MCP, UI/UX skill, acceptance contract, donor
  catalog, browser and native evidence paths.
- `aiscent-screenshot-intelligence-v13-qa-20261104/`: screenshot judge rubric,
  bias probes, human calibration corpus, and research lane. Its checkout has
  pre-existing uncommitted changes; do not use it as an edit target until those
  changes are reconciled.
- `smat-research-fabric/` and `smat-research/`: research workflow and customer
  understanding sources. The connected Research Fabric app currently requires
  reauthentication; local source remains available for inspection.
- `mcp-dogfood-lab/` and RemoteDesk Test Lab: MCP-level proof patterns and live
  stdio tool journey verification.

## Sequence

1. **Make the MCP runnable:** install declared runtime dependencies, make the
   documented local test command work, and exercise read-only MCP tools through
   a real stdio client. Keep browser access opt-in and origin-allowlisted.
2. **Establish one web baseline:** select a SMAT website, record its critical
   first-time task, then capture the allowed browser audit and screenshots.
   Inspect the screenshots and report human findings separately from axe and
   layout results.
3. **Establish one native baseline:** use AiSCent capture plans for a selected
   app. Require verified screenshots before visual review; keep the current
   EzSeller capture blockers visible as HOLD.
4. **Run first-time task sessions:** observe three representative users on the
   critical task. Record what they expected, where they hesitated or failed,
   task outcome, and evidence. Do not infer conversion lift from this sample.
5. **Improve and recalibrate:** repair the highest-severity observed issue,
   rerun the same task and evidence capture, and add only reproducible escaped
   failures or human-confirmed judgment corrections to the MCP's regression
   corpus. Keep reviewer identity, rubric version, and evidence hashes bound to
   each judgment.
6. **Repeat across products:** use the same evidence fields while keeping each
   product's brand, platform conventions, user task, and design system distinct.

## Current execution boundary

Use `smat-portfolio/` (`https://smatdesigns.com/`) as the first web pilot. The
The Interface Lab's latest 17-size browser and axe audit passed as
`PASS_AUTOMATED_ONLY`: no horizontal overflow, axe violations, browser errors,
or blocked UI dependencies were found. Its read-only router suppresses known
Cloudflare telemetry separately. Initial full-page screenshots skipped
lazy-loaded imagery; the MCP now captures the first viewport at every size,
reports total page height, and no longer treats page height alone as an audit
hold. This remains automated evidence, not visual approval or usability
acceptance. Use EzSeller
  as the first native pilot because native capture plans and review guidance
  already exist here. Its capture evidence is partial: five iPad Pro 11 M4
  screenshots have XCTest identity witnesses; screenshots from two additional
  iPad size classes are visual-only. Run first-time user sessions after
  participants are recruited. The connected Research Fabric tool needs
reauthentication before its remote registry or research jobs can be used.

## Follow-up status (2026-11-14)

- **Interface Lab verification:** `npm test` passes 21 tests across 5 test suites (adding dedicated unit coverage for 3-tier DTCG token gate and evidence receipt assessment); `npm run verify` passes JS syntax checks, native Python compilation, and structural token audit.
  RemoteDesk Test Lab discovery made real stdio calls to `uiux_audit_tokens`
  and `uiux_research_donors`, and MCP contract checks passed. Its fast run timed
  out on the nearly full Mac and remains uncertain; do not count it as a pass.
- **Web pilot:** two fresh 17-viewport runs completed with
  `PASS_AUTOMATED_ONLY` at every width (280, 320, 360, 375, 390, 414, 600,
  768, 820, 1024 portrait/landscape, 1180, 1280, 1366 tablet/laptop, 1440,
  1920). All 17 found zero blocked UI requests, browser errors, horizontal
  overflow, and axe violations; one Cloudflare telemetry request per viewport
  was suppressed. The post-deploy run saved first-viewport screenshots under
  `/tmp/uiux-site-audit-postdeploy/` on the RemoteDesk Mac; that temporary
  evidence is not in the repository. Visual inspection of its 390px screenshot
  confirms the menu displays three bars. Earlier SHA-bound first-viewport
  screenshots remain in the original evidence run.
- **Website fix:** first-screen visual inspection exposed the mobile menu as a
  blank browser-default white button on the dark `smat-portfolio` header. The
  local source now removes that default surface; a 390px Playwright check
  verified three visible bars and `aria-expanded` changing to `true` on click.
  `scripts/check_site.py` passes all ten pages after the Zit Happens page was
  added. The mobile-menu source fix is included in commit `f9c0e37` and was
  deployed to Cloudflare Pages production on 2026-11-14. The production
  `scripts/check_live_site.sh` passed for all ten routes, sitemap, robots,
  redirects, assets, and release markers. See deployment note below.
  A live 390px Playwright check confirmed the menu button is visible, its three
  bars have the expected light color, and clicking changes `aria-expanded` from
  `false` to `true`.

- **Human sessions: not run.** The available tools do not supply recruited
  participants. The earlier EzSeller screen review was a visual heuristic, not
  a customer session. Keep the customer-task gate on HOLD until three
  independent first-time seller sessions are observed and recorded. Suggested
  opening task: “Look at this sample seller workspace. What needs your
  attention first, and what would you do next?” Do not explain the interface;
  record first action, hesitation, wrong turns, completion, intervention, and
  the participant’s own explanation. The ready-to-run consent note, neutral
  prompts, and observation fields are in
  `docs/EZSELLER-NATIVE-UX-DOGFOOD-20261113.md`.
- **Native size matrix: partial capture only.** The prepared plan requests one
  iPhone model and two iPad models. Its bundle ID is `com.smatdesigns.ezseller`; the
  `ezseller-restored` checkout I first built uses `com.smatdesign.ezseller`,
  so that build is not valid evidence for this plan. The matching `ezamazon`
  checkout has pre-existing uncommitted edits and was left untouched. A capture
  attempt with temporary simulators exceeded the tool’s five-minute limit while
  installing the app; I stopped it when disk space dropped below 1 GiB and
  removed the simulators and temporary outputs. The connected iPhone 14 Pro
  also has no running WebDriverAgent. Current read-only health shows the test
  iPhone is visible/trusted with Developer Mode and DVT access; the safe WDA
  launch failed because its runner needs Xcode re-signing. A device screenshot
  was captured, but it showed the Apple TV Remote screen, not EzSeller, so it is
  not app evidence.
- **Native simulator follow-up:** AiSCent discovered three booted simulators on
  `smat-m3max`. I ran its five-shot capture plan against the installed
  `com.smatdesigns.ezseller` build (source checkout
  `17b2ff22676de7cf8015f06a13129aa945b6e995`) on `EzSeller QA iPhone Duo`
  (iOS 27.1) and `iPad Pro 11-inch (M4)` (iOS 26.3). All five iPad shots passed
  page identity and image QA; all five iPhone shots had the expected XCTest
  page identity and label but failed the blank-frame gate. Their PNGs all have
  the same SHA-256 (`0cf5ab5f…fce0394`), confirming one repeated black frame,
  not five distinct rendered pages. I inspected the saved images: the iPad
  Today frame shows the app with “Sample workspace” and
  “Illustrative data” labels and the “Needs you” card; the iPhone frame is
  black. The broker response timed out, but its persisted state file records
  all ten results. Evidence remains on `smat-m3max` at
  `/Users/tatsheen/ezseller-native-evidence/capture-plan-20261114/`; this is a
  partial capture, not a complete matrix or Interface Lab verified review.
  The MCP resume/readback and a separate iOS 26.3 iPhone 17 Pro capture both
  returned `aiscent_mcp_provider_operation_failed` before starting work, so I
  could not obtain a final broker receipt or test another phone runtime. The
  attached USB test iPhone is currently reported untrusted, with no iOS version
  available; I did not try to pair or change device settings.
  Follow-up Interface Lab simctl captures produced five nonblank screenshots
  each on iPad Pro 13-inch (M5) and iPad mini (A17 Pro), both iOS 26.3. All
  mini shots and four Pro 13 shots settled; the Pro 13 Today image did not.
  These reports explicitly leave page identity unverified. The requested A20
  Pro mini is incompatible with both currently installed runtimes; A17 Pro is
  only a size-class substitute. Supplemental screenshots and the visual review
  notes are recorded in `docs/EZSELLER-NATIVE-UX-DOGFOOD-20261113.md`; source
  PNGs remain on `smat-m3max` in `/Users/tatsheen/ezseller-native-evidence/`.
  Demo data compares sales with `2026-10-05`; check whether that stale comparison
  date is intentional before judging data freshness. All three iPad size
  classes now have five visible captures; only the 11-inch M4 set has
  same-test XCTest identity proof. Keep native status **HOLD** until iPhone
  screenshot capture and exact iPad identity witnesses work, the Pro 13 Today
  frame settles, and review is repeated against local evidence. Do not bypass
  the black-frame gate. Three real first-time seller sessions are still needed
  before any human-validated judgment changes.
- **Disk cleanup:** removed the inactive browser’s HTTP/code caches, Python/uv
  caches, Docker build cache, duplicate update archives noted earlier, and
  this run’s temporary build/screenshot files. Cookies, browser profile data,
  worktrees, RemoteDesk job logs, CloudKit data, and model caches were
  preserved. Free space remains volatile because macOS File Provider currently
  holds about 1.9 GiB under its active temporary area; it was not deleted.

- **Telemetry classification follow-up:** the read-only browser router keeps
  Cloudflare Web Analytics beacon requests blocked and reports them in
  `suppressedTelemetryRequests`; other blocked requests remain a `HOLD`. Five
  focused status tests pass. The fresh 17-size audit completed through
  RemoteDesk's bounded runner with exact font/animation origins allowlisted.
- **MCP dogfood follow-up:** RemoteDesk Test Lab discovery passed two real stdio
  journeys (`uiux_audit_tokens`, `uiux_research_donors`) and the MCP contract
  check for the current checkout. Overall discovery is incomplete because its
  optional TypeScript check is not configured; the project uses JavaScript and
  Python. Local `npm test` now passes 21 tests, `npm run verify` passes, and the
  portfolio's ten-page source checker passes.
- **Harsh review calibration, iteration 1:** reviewed the verified iPad captures
  against the sample-seller task. Findings stay as observations with priority
  unassigned until human task evidence exists. App Store creatives are excluded
  from native-app references; black frames and system-overlay captures are
  excluded from visual judgments. Added a replayable decision table and recorded
  that the six-axis weighted score has no calibrated benchmark in this corpus.
  No EzSeller product UI or judge weights changed. See
  `docs/EZSELLER-NATIVE-UX-DOGFOOD-20261113.md`.
- **Production follow-up:** the portfolio main branch advanced during the first
  push. Its new Zit Happens page and hosted-runner workflow changes were merged
  and preserved with the hamburger fix. GitHub Actions are disabled at the
  repository level, so production was deployed directly with the existing
  Wrangler Pages command after static checks passed. Production route
  verification then passed all ten pages. Commit `90115a2` is the pushed merge;
  commit `f9c0e37` contains the mobile-menu CSS fix.
