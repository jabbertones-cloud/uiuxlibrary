# Human Finish first real-site audit: AiSCent vs Unloopr

Date: 2026-11-10, observed on authorized SMAT M3 Mac. **Evidence tier: observed lab audit, not human acceptance.** These are *actual live URLs*, not mockups. Preserve the separate brand/marketing policy for each.

## Execution receipts

Command run on M3 using installed Lighthouse (manual invocation with PATH fixed; RemoteDesk quality_lighthouse wrapper itself initially returned `env: node: No such file or directory`):

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /Users/tatsheen/RemoteDeskMCP-live-agent/node_modules/.bin/lighthouse https://aiscentmcp.com --quiet --output=json --output-path=/tmp/aiscent-human-finish-lighthouse-mobile.json --form-factor=mobile --chrome-flags='--headless=new --no-sandbox --disable-background-networking'
PATH=/opt/homebrew/bin:/usr/bin:/bin /Users/tatsheen/RemoteDeskMCP-live-agent/node_modules/.bin/lighthouse https://unloopr.com --quiet --output=json --output-path=/tmp/unloopr-human-finish-lighthouse-mobile.json --form-factor=mobile --chrome-flags='--headless=new --no-sandbox --disable-background-networking'
```

The full reports remain local to the authorized machine; they were **not** checked into this repository (could contain raw page content). SHA-256 receipts for exact JSON bytes:

| URL | Lighthouse fetch UTC | JSON SHA-256 | Bytes |
| --- | --- | --- | ---: |
| https://aiscentmcp.com/ | 2026-11-10T22:14:25.721Z | `acf7b87397ea5ee1d4ef56bcddd2d6ba0ff4f7e15efc9f4126d60622deed275c` | 830023 |
| https://unloopr.com/ | 2026-11-10T22:13:25.999Z | `ab624a4179b3bfa8bbf45e022b451650bf351127fe26c571de080c56354a78c3` | 837100 |

Lighthouse mobile is a **lab/automated** diagnostic. Its aggregate score is not an appraisal of brand, originality, conversion, comprehension, trust or human task completion.

## Scores and measured audit findings

| Site | Performance | Accessibility | Best practices | SEO | First Contentful Paint | Largest Contentful Paint | Layout shift |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| AiSCent | 85 | 89 | 100 | 100 | 2.9s | 3.1s | 0 |
| Unloopr | 98 | 100 | 100 | 100 | 1.8s | 2.3s | 0 |

**Observed AiSCent automated failures:**

- `color-contrast`: 37 flagged nodes. Hero eyebrow `main > section.hero > div.hero-copy-col > div.eyebrow`: contrast 2.99:1 (`#e95f36` on `#f3f0e9`, 11px bold) against 4.5:1 expected for this text. Hero microcopy `p.microcopy`: contrast 3.22:1 (`#89857d` on `#f3f0e9`, 11px), expected 4.5:1. Other affected repeated patterns include section labels on `#e8e3da`, outcome number labels and proof text, with some pairs near 4.48:1, so do not assume changing only one element covers all.
- `link-in-text-block`: one guaranteed-work link `div.pricing-grid > article.price-card > p.guarantee-short > a`; link contrast with surrounding text was 1.99:1, under the 3:1 criterion for a color-only distinction, and it lacked another cue such as underline.
- Lighthouse also flagged `llms-txt` recommendation, but this is an agent-browsing discovery check, not a first-user accessibility P1.

**Source-level triangulation:** Current GitHub `jabbertones-cloud/aiscent-help-site` source at main commit `5426adf905da33d9ed4ea9b1b8067fa41a3178e2` has `app/globals.css` with `--orange:#e95f36`, `--bg:#f3f0e9`, `--panel:#e8e3da` and `.microcopy{color:#89857d}`. These match the runtime contrast report. Site deployment source SHA was **not independently read back**, so do not call the GitHub revision the live deployed SHA.

## Repairs, in priority order

1. **P1: first-read legibility.** On `aiscent-help-site`, examine the existing token/selector scope before touching CSS. Decouple brand-orange decorative fill from the color used for small text. Determine foreground colors that meet at least 4.5:1 against *each actually rendered* light surface; preserve brand identity rather than globally dulling the palette. Include `.eyebrow`, `.section-label`, `.compare-kicker`, `.microcopy`, `.proof-source`, `.control-flow` and responsive variants. Validate in the real browser at mobile and desktop; re-run actual contrast audit.
2. **P1: link recognition and focus.** Make the pricing guarantee link independently recognizable, e.g. underlining with distinct focus styling, and check keyboard/assistive-technology behavior and actual contrast after the change.
3. **P2 research task: first exposure.** The live source hero says `The app works. The store is another job.` and immediately explains a lengthy tool/agent mechanism next to a simulated interaction. The intended primary CTA leads to a free questionnaire. Hypothesis: the mechanism may become dominant before a cold visitor sees the desirable outcome; **no first-time buyer comprehension failure has yet been observed**. Have actual AI-app makers read only the first mobile screen, then ask: `What is the benefit? Who does the work? What happens when I click?` Preserve their exact answers and compare one editorial outcome-first alternative, not merely a rewritten technical paragraph.
4. **P0 truth check before any commercial promise.** The live landing page advertises a Pro monthly price but its CTA currently says `Get notified: Pro monthly`. That is not itself proof of wrongdoing; verify first-time buyer comprehension of availability and whether billing is actually open, and reconcile any future paid promise with checkout and delivery proof.

## Why the comparison matters

**Unloopr** scored 98/100 performance and 100/100 accessibility in this one mobile lab pass. That does not validate its domain job, brand character, onboarding, real code diagnosis, paid fulfillment or user confidence. Those require separately observed task and service evidence. Do not infer absence of product issues from an excellent Lighthouse score.

**AiSCent** has measured accessibility issues *and* a separate untested opportunity for a stronger editorial first impression. Fix measurable legibility problems without converting the marketing page into a generic "compliance dashboard." Neither page is automatically APPROVED/HOLD for full product quality from these numbers alone.

## What is NOT done

- No code or source styling edits and no live deploy.
- No independent full-resolution artistic critique or user task session.
- No witnessed paid buyer flow or conversion lift.
- No full accessibility conformance certification from Lighthouse.
- No objective proof that any change makes the product feel more human.

**Next evidence step:** choose the AiSCent homepage first mobile screen and one authorized first-time visitor job; collect baseline 3-cold-reader comprehension receipts plus actual screenshot and then repair color/links using the existing app CSS, not a new design engine. Do not adjust tests to force a green score.
