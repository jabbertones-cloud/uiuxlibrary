# Interface Lab fleet website dogfood, November 17, 2026

## Scope and independent runtime

This is observed read-only production evidence, **not** a design approval, live release, customer task test, or automated website repair. On SMAT M1 Mac mini, checked out Interface Lab PR #17 at exact HEAD `67b7980813090b0426426828d4b33cfab373e734`, installed pinned npm dependencies and Playwright Chromium, and ran `npm test` (37/37), `npm run check` and `npm run audit:tokens` (13 tokens, `PASS_STRUCTURAL_ONLY`). The same browser adapter `src/browser-adapter.mjs` captured **17 actual first-viewport screenshots per site** from 280 to 1920 CSS px with SHA-256 hashes and Axe WCAG-tagged findings. Each URL was exact-origin allowlisted. This is 68 site/viewport audit cells; CSS-only before/after probes are separate.

The original four raw JSON results and 68 PNGs are stored locally on authorized M1 under `/Users/tatsheen/work/uiux-fleet-20261117/.uiux-evidence/fleet-20261117/`, **not** claimed to be committed or shared in GitHub; do not treat the filenames or hashes as externally authenticated customer sessions.

## Measured results

| Site | Interface Lab 17-view status | Other independent mobile Lighthouse scores (P/A/BP/SEO/agentic) | Actual findings |
|---|---|---|---|
| https://aiscentmcp.com/ | `PASS_AUTOMATED_ONLY`, 17/17 | 86/100/100/100/67 | No sampled overflow/axe violations/blocked dependencies. Mobile FCP 3.0s, LCP 3.4s; Lighthouse flags llms.txt recommendations, unused JS and render blockers. Good-looking page is not proof of conversion. |
| https://ezseller.smatdesigns.com/ | `FAIL`, 10/17 sampled viewports with `ACCESSIBILITY_VIOLATIONS` at widths >=768; 7 smaller widths `HOLD` | 96/100/100/100/100 | Serious Axe nav contrast: 8 affected nodes at 768/820; 9 at 1024-1920. Active nav #a94120 on #020b18 is 3.25:1; inactive nav #435550 on #020b18 is 2.49:1. A separate exact-origin policy-blocked request at all widths gives independent HOLD. Do not let 100 Lighthouse accessibility hide the actual axe finding. |
| https://claimfix.smatdesigns.com/ | `FAIL`, 4/17 widths | 100/100/96/100/67 | Homepage overflows horizontally at 280, 320, 360 and 375 CSS px: document is 377 px wide. Reproduced separately on /pricing. Unbreakable inline code MCP URL is root cause. Live screenshot also suggests developer-documentation-heavy first screen (subjective critique; no human session). |
| https://cashcrop.smatdesigns.com/ | `PASS_AUTOMATED_ONLY`, 17/17 | not measured | No sampled overflow, axe, or blocked dependency. Sparse layout describes capability but doesn't show actual, source-linked operating output on first screen. Subjective visual/product communication issue, not automated defect. |

**Counts:** 68 sampled cells; AiSCent 17 automated-only, CashCrop 17 automated-only, ClaimFix 13 automated-only + 4 failed overflow, EzSeller 7 HOLD + 10 FAIL. These observations are time-bounded and cover only the named home pages (except the separate ClaimFix /pricing probe). Lighthouse and Playwright use different environments, thresholds, states and checks, so their scores are *not* equivalent.

## Verified low-risk correction candidate

Playwright repeated the same live rendered DOM on `/` and `/pricing` and applied only the standards-based CSS `p code { overflow-wrap: anywhere; }`. Across widths 280, 320, 360, 375, 390, 414, 768 and 1440, each page went from **4/8 width failures to 0/8** with no backend or account mutations. At 280, document width decreased from 377 to 280. Source candidate is ClaimFix [draft PR #39](https://github.com/jabbertones-cloud/claimfix-mcp/pull/39); issue [#38](https://github.com/jabbertones-cloud/claimfix-mcp/issues/38). Source has **not** been exact-head built, merged, deployed or independently live retested. Canonical CSS: https://www.w3.org/TR/css-text-3/#overflow-wrap-property.

EzSeller observed contrast violations are recorded with exact colors, nodes and viewports in [issue #1431](https://github.com/jabbertones-cloud/ezamazon/issues/1431), with no claim of a fix yet.

## Interface Lab product lessons

1. **Inspect real pages at many sizes.** A Lighthouse 100 is not a pass on a 280 px viewport, nor a pass on a different browser's Axe page snapshot.
2. **Keep confirmed defect vs uncertainty separate.** EzSeller cross-origin requests are `HOLD`; measured contrast is `FAIL`. Neither cancels the other. Never suppress unrelated blocked traffic to get green.
3. **Retain node-level receipts.** Severity, selector, actual colors, width, screenshots and SHA should be linked to an issue and a rerunnable test. Do not invent a universal aesthetic score.
4. **Need human visual critique plus user action.** Assess clarity, differentiation, first-value, useful density, credibility and working CTA destinations from actual screenshots and interaction. Label opinions as reviews. Add first-time user tasks before claiming conversion improvement.
5. **No no-op theater.** Hosted `uiux.smatdesigns.com/mcp` currently has two token/donor tools. The richer browser/native capture runner is local stdio. Do not advertise the hosted service as fleet review, auto-fix or multi-tenant product until authenticated execution, persistence, billing/rights, protections and after-state verification actually work.
6. **Feedback loop with negative memory.** Publish measured failures and successful/failed fix trials into SMAT Research and GitHub Research Pattern Cards with source and runtime identity. Preserve source-pinned evidence, not screenshots mislabeled as approved designs.

## Next release gates

* Build a reviewed fleet manifest with authenticated, permitted origins and customer tasks; run without browser writes or cross-origin fetch expansion.
* Re-run focused live sites after improvements; add candidate vs baseline same-width automated and screenshot comparison. Human reviewers inspect actual images, including below-fold, dark mode, keyboard flow, loading/error states, and English/non-English states.
* Exact source SHA -> independent test head -> merge -> test main -> deploy -> live source and after-state verification -> adversarial regression. **Never enable GitHub Actions**; use authorized Mac runner and guarded deployment.
