# Runtime adapters: connect, inspect, and measure

These are independent upstream tools; the SMAT Skill does not contain credentials or assume any of them is installed.

| Need | First choice | Boundary |
|---|---|---|
| Read or write Figma designs | **Official Figma remote MCP** (`https://mcp.figma.com/mcp`) and `figma-use` skill | Remote writes require an eligible plan/seat and supported MCP client. Desktop MCP does not write. Figma Console MCP is an additional specialist adapter, not the owner of all designs. |
| Design token import/export | Figma native API / Southleft Figma Skills | Read exact node and variables before creating new ones; verify aliases, modes and design/code parity. |
| Penpot design work | Penpot main repo's `mcp/` and Plugin API | Archived standalone `penpot-mcp` is not a production donor. Inspect actual host/SDK compatibility. |
| Component inventory | Installed Storybook with official `@storybook/addon-mcp` | Explicit components manifest and stories required. Avoid archived `storybookjs/mcp`. |
| Component assembly | Existing product components first, then shadcn/ui official CLI, then licensed 21st MCP catalog | 21st Magic legacy proxy is not the new catalog; account/API key and reuse rights vary. |
| Live browser inspection | Playwright CLI + skills or Playwright MCP | Choose CLI for scripted high-throughput task tests, MCP for stateful DOM exploration. Neither alone proves quality. |
| Automated accessibility | `axe-core` / `@axe-core/playwright`, plus manual WCAG checks | An axe pass is not WCAG 2.2 AA certification. Test real keyboard and reader behavior separately. |
| Visual regression | Playwright screenshot assertions or Argos | Must keep stable viewport, fonts, theme, fixture data and baseline; human reviews changes. |
| Standards knowledge | W3C WCAG/DTCG, Apple HIG, Southleft Design Systems MCP | Confirm official source dates; the private SMAT 3-tier governance is not itself a W3C mandate. |
| Native Apple UI | Official WWDC/Apple HIG research & platform APIs | Do not replace SwiftUI native components with arbitrary web-style primitives. |
| Inspiration | User-authorized Mobbin MCP, verified references, brand research | Screenshots are design study only, not a license to repackage or train datasets. |
| Chat UI | Official MCP Apps SDK when host supports | Interactive MCP apps need host CSP, auth, permission, responsive and accessible state testing. |

## SMAT MCP adapter tools

The separate `@smat/interface-lab` source tree provides `uiux_audit_tokens`, `uiux_audit_page`, `uiux_release_gate`, and `uiux_research_donors`. It does not proxy all of these upstream APIs. For read-only browser audit, configure explicit `UIUX_ALLOW_ORIGINS` and `UIUX_WORKSPACE` and use local test accounts. Missing runtime/dependencies means HOLD, not PASS. Until an MCP host successfully initializes this server and calls the tools, treat these as implemented source, not live production capabilities.

Use the available upstream tools directly whenever they already solve the problem instead of inventing a hand-rolled replacement. Record actual MCP tool names and outputs, or mark unconnected.
