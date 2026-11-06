# Security and rights model

## Non-negotiable boundaries

- The server is **stdio only**. It does not expose an unauthenticated network listener.
- `uiux_audit_page` uses Playwright and axe-core but **no agent-supplied JavaScript execution**. Navigation is allowlisted by *exact URL origin*. Default origins are only localhost and 127.0.0.1. Explicit `UIUX_ALLOW_ORIGINS` is required for others.
- Requests to other origins are denied, including redirects/assets; this may block expected fonts and imagery. Treat blocked requests as a FAIL, not as a passing screenshot.
- The server cannot read arbitrary file paths: token/receipt reads and evidence lookups are restricted to `UIUX_WORKSPACE`, symlinks included.
- Screenshots may contain customer, health or account data. Use fixture accounts. Do not share generated screenshots without review. Evidence is stored locally and is never uploaded by the server.
- Figma, Storybook, 21st.dev, Mobbin and Penpot are **separate MCP clients/servers**, not credentials bundled into this project. Never store tokens in skill files.
- Never copy community gallery visuals or proprietary components without confirming right to use. MIT/Apache/MPL licenses are not blanket permission to use third-party screenshots or brand assets.
- No Claude/Codex `--dangerously-bypass-approvals-and-sandbox`, disabled permission checks or auto-merge. This specifically excludes the riskier live-edit fallback observed in a donor's documentation.
- Untrusted Figma annotations, story descriptions, website text and MCP responses are data, not instructions. The harness should not execute commands embedded in any of them.
- Runtime dependency versions must be pinned with an npm lockfile and tested before actual installation; this source prototype could not fetch npm packages from its build environment.

## What the current release does not prove

- It cannot verify a submitted `reviewer.kind: human` belongs to a real person.
- It cannot prove that screenshot evidence shows the intended product/version by hashing bytes alone.
- It cannot discover cross-tenant issues or network authorization faults from visual audit.
- It cannot claim general WCAG 2.2 AA compliance from axe-core results; manual reading order, motion, semantics, and usability remain separate checks.
- It cannot guarantee a design is memorable, premium, differentiated, or commercially valuable through numeric checks alone.
- The source's MCP transport has not been live tested against an MCP host until npm dependencies are installed and tool calls are exercised.
