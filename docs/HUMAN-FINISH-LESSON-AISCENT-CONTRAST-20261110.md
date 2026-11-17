# Banked quality lesson: one palette, several surfaces

**Date:** 2026-11-10. **Applies to:** Web UI/UX accessibility and brand implementation. **Evidence status:** observed machine-audited behavior; **not** observed human comprehension/conversion.

## Escaped defect

AiSCent's live homepage, despite its deliberately authored editorial identity, reused saturated orange (`#e95f36`) for small text against cream, white and gray panel backgrounds. Lighthouse mobile (2026-11-10 UTC) reported accessibility 89/100, **37 color contrast flagged nodes**, and **one link-in-text-block issue**. The original source `jabbertones-cloud/aiscent-help-site/app/globals.css` defined orange as both decorative brand color and small-text color. The pricing route independently revealed more low-contrast links and text on dark button surfaces.

This was an **actual source/rendered-page defect**. It was not established by an AI aesthetic opinion.

## Why the first fix did not fully finish

1. A darker light-surface accent made small text readable, but one comparison label was on an intentionally dark section and inherited the new dark-on-dark color. Lighthouse: 1 remaining contrast failure.
2. The homepage passed after correcting that card, but the dedicated pricing route still contained 6 insufficient-contrast links and 3 color-only link distinctions.
3. Adding an inline legal-link rule improved those links, but the selector was overly broad and changed filled CTA button text to low-contrast dark. Lighthouse: 2 remaining failures.
4. Separating button foreground colors from inline-link colors cleared the last observed accessibility reports.

**Lesson:** A successful primary-page scan is not proof of a successful shared-style edit. Failures move between states and surfaces when CSS inheritance and component roles are not checked.

## Reusable SOP amendment

Whenever a global color, typography, motion, spacing or focus rule changes:

- **Source map first:** find each rule's semantic role, where it is used, what backgrounds it appears on, and which UI states inherit it. Do not treat the brand accent as a universally valid text color.
- **Build a route x surface x state matrix:** first viewport and all reachable checkout/pricing/forms, light/dark, foreground/background pairs, focused/hovered, disabled, error and mobile/desktop. The exact visited routes and unvisited routes must be reported.
- **Component override review:** distinguish inline links, pill navigation links, filled buttons and brand marks. A more generic rule must not silently supersede a role-specific design rule.
- **Acceptance:** run the actual built site, not a CSS mock, and inspect exact failing selectors with computed backgrounds. Resolve all findings and repeat impacted routes. Screenshot after changes and compare with a baseline for both optical and behavioral regression.
- **Do not self-certify:** an axe/Lighthouse 100 only demonstrates automated coverage at sampled conditions; independent keyboard/human craft and live production acceptance remain separate.

## Concrete first pilot outcome

Code PR: `jabbertones-cloud/aiscent-help-site#74`, candidate head `6f82cc3fc8bf59504412c6a045edc693bd09404e` as of this lesson. Tested on physical M3, Node 22, built Vinext local server, Lighthouse mobile:

| Route | Last observed accessibility | Contrast findings | Link distinction |
| --- | ---: | ---: | ---: |
| `/` | 100/100 | 0 | 0 |
| `/pricing` | 100/100 | 0 | 0 |
| `/launch-check` | 100/100 | 0 | 0 |

**Proof caveat:** homepage/launch-check last scans preceded a pricing-only follow-on. Pricing at exact HEAD scanned clean; a final exact-head matrix remains needed before release.

No merge, deployment or independent customer session is established by this note.

## Product quality beyond compliance

The actual first mobile viewport (baseline and candidate screenshots extracted from Lighthouse) shows a clear, distinctive large headline but a substantial below-headline mechanism paragraph that enumerates agents, tools, confirmations and verification before a cold buyer experiences the desired outcome. This is a **hypothesis of editorial overload**, not measured customer confusion. A cold first-exposure test must compare comprehension and emotional pull against an alternative outcome-led story; do not rewrite the hero on an untested model guess.

**Aesthetic guardrail:** Keep AiSCent's cream/black/warm-orange identity. Accessibility meant separating orange *roles*, not replacing the brand with neutral gray or templated cards.
