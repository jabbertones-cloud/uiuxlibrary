import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { auditTokens } from '../src/token-gate.mjs';
import { captureGate } from './capture-policy.mjs';
import { captureOwnedSite } from './owned-capture.mjs';
import fleet from '../examples/smat-mcp-fleet.json' with { type: 'json' };
import donors from '../docs/donors.json' with { type: 'json' };

const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const buildHandler = (env, owner) => createMcpHandler(() => {
  const server = new McpServer({ name: 'smat-interface-lab', version: '0.4.0' });
  server.registerTool('uiux_audit_tokens', {
    description: 'Validate inline DTCG JSON against SMAT three-tier structural policy; not a contrast audit.',
    inputSchema: z.object({ document: z.record(z.string(), z.unknown()) })
  }, async ({ document }) => result(auditTokens(document)));
  server.registerTool('uiux_research_donors', {
    description: 'Return pinned donor research catalog. Research only, no installation.',
    inputSchema: z.object({})
  }, async () => result(donors));
  if (owner) server.registerTool('uiux_capture_owned_site', {
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description: 'Capture one real public SMAT-owned site in Cloudflare Browser Run. Returns PNG and SHA-256 receipt, page title, heading, overflow and blocked resources. Not a WCAG, customer-flow or human visual verdict. Restricted to source-controlled SMAT sites; no arbitrary URLs.',
    inputSchema: z.object({
      siteId: z.enum(fleet.sites.map(site => site.id)),
      viewport: z.enum(['phone', 'desktop']).default('phone')
    })
  }, async ({ siteId, viewport }) => {
    try { await captureGate(env); return await captureOwnedSite(env, siteId, viewport); }
    catch (error) {
      const safe = ['CAPTURE_BINDING_MISSING', 'CAPTURE_RATE_LIMITED', 'SITE_NOT_AUTHORIZED', 'UNSUPPORTED_VIEWPORT'];
      return { ...result({ status: 'HOLD', reason: safe.includes(error.message) ? error.message : 'CAPTURE_RUNTIME_ERROR' }), isError: true };
    }
  });
  return server;
});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({
      status: 'ok', service: 'smat-interface-lab', version: '0.4.0',
      scope: 'public-read-only-2-tools-plus-owner-capture-3-tools', gitSha: env.GIT_SHA
    });
    const owner = url.pathname === '/mcp-owner';
    if (!owner && url.pathname !== '/mcp') return new Response('Not Found', { status: 404 });
    if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin)
      return new Response('Forbidden Origin', { status: 403 });
    const key = owner ? env.MCP_OWNER_TOKEN : env.MCP_BEARER_TOKEN;
    if (!key || request.headers.get('Authorization') !== 'Bearer ' + key)
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
    return buildHandler(env, owner).fetch(request);
  }
};
