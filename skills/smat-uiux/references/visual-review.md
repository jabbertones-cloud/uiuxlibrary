# Visual inspection protocol: taste is an accountable review

Never confuse subjective visual judgments with automated compliance. Inspect actual rendered before/after images, not a model-created illustration of the intended design. Name the route, state, viewport, theme, screenshot hash and reference source for each claim.

## 1. First five seconds

- Can a representative visitor tell whose product this is, what the product actually does, and the first valuable action?
- Does the main object of attention show actual product value or generic decorative filler?
- Is the layout appropriate to the user's stage (exploration vs task completion), or does it force a sales page into an operator console?

## 2. Editorial and compositional quality

- **Hierarchy**: Meaningful focal point, believable visual reading path, independent section rhythm, no competing CTAs of equal weight.
- **Typography**: Appropriate font design, rendered glyphs, line height and tracking, optical alignment, line length, leading, punctuation, wrapping and actual font loading. No substitution or arbitrary scale jumps.
- **Imagery**: Correct intrinsic ratio and crop, natural lighting/texture, integrated perspective, sufficient resolution, original rights. No stretching, artificial floating objects, texture filters or unrelated stock visuals.
- **Spacing**: Relationships explain grouping. Inspect actual dimensions across responsive breakpoints and RTL. Repeating arbitrary paddings is not harmony.
- **Color**: Intentional role, semantic meaning, contrast and states. No generic blue-purple glow without a reason; no mandatory ban on gradients when art direction supports them.
- **Motion**: Helps maintain spatial continuity or indicate system state. No decorative delay, motion sickness or hidden changes; respects Reduce Motion.
- **Density**: Show only the information needed to make the next decision. Dashboard value comes from decisions and context, not many charts.
- **Differentiation**: Original visual language that fits brand, not cloned Vercel/Linear/Stripe layout, not a one-template skin across all SMAT companies.

## 3. Fix instructions required for every finding

Write: `Location + exact observation + severity + first-user consequence + root cause + donor/API + concrete change + acceptance screenshot/test`. Example: "Mobile account connection at 375px: OAuth button is below unexplained error text; first user cannot tell if authorization succeeded; change the status/state model and move one primary retry action adjacent to an actionable explanation; test signed-out, denied permission, timeout and success with live connection fixture." Do not write "make it pop" or "clean up UI".

## 4. Adversarial states

Check missing logo/fonts/images, extreme text width, screen reader output, unsupported currency, stale data, disabled/no-permission states, billing errors, offline state, prior partial completion, 200% text zoom, localization, right-to-left and both color schemes. A screenshot of one pristine desktop viewport does not satisfy the protocol.

## 5. Reviewer's authority

A reviewer needs actual artifact proof. A model can critique and generate options; only an accountable independent reviewer may sign off on subjective quality. No numeric visual score automatically confers approval. For experiments, compare task outcomes and comprehension; do not attribute results to screenshots when other variables changed.
