import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { auditTokens } from '../src/token-gate.mjs';
import donors from '../docs/donors.json' with { type: 'json' };
const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'smat-interface-lab', version: '0.3.0' });
  server.registerTool('uiux_audit_tokens', { description: 'Validate inline DTCG JSON against SMAT three-tier structural policy; not a contrast audit.', inputSchema: z.object({ document: z.record(z.string(), z.unknown()) }) }, async ({ document }) => result(auditTokens(document)));
  server.registerTool('uiux_research_donors', { description: 'Return pinned donor research catalog. Research only, no installation.', inputSchema: z.object({}) }, async () => result(donors));
  return server;
});
export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/health') return Response.json({ status: 'ok', service: 'smat-interface-lab', version: '0.3.0', scope: 'read-only-2-tools', gitSha: env.GIT_SHA });
  if (url.pathname !== '/mcp') return new Response('Not Found', { status: 404 });
  if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return new Response('Forbidden Origin', { status: 403 });
  if (!env.MCP_BEARER_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.MCP_BEARER_TOKEN}`) return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
  return handler.fetch(request);
} };
