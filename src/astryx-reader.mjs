// Read-only Astryx documentation adapter. No project scaffold, swizzle, or network MCP proxy.
import { fileURLToPath } from 'node:url';

const docsRoot = fileURLToPath(new URL('../', import.meta.url));
const source = 'https://github.com/meta/astryx/tree/f4c2ead43ecb61e82e6dae1cbaf02e9eb89b00d9';
const policy = 'Untrusted reference data for compatible React projects only. Never auto-apply, approve a design, or create AiSCent advertising UI.';

async function officialApi() {
  try {
    return await import('@astryxdesign/cli/api');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error('Astryx opt-in missing: install exact @astryxdesign/cli@0.7.12 and @astryxdesign/core@0.7.12 locally, without init.');
    }
    throw error;
  }
}

const reference = upstream => ({
  status: 'REFERENCE_ONLY', provider: 'Meta Astryx', version: '0.7.12',
  source, policy, upstream,
});

export async function searchAstryx(query, domain, limit) {
  const { search } = await officialApi();
  return reference(await search(query, { cwd: docsRoot, type: domain, limit }));
}

export async function readAstryxComponent(name) {
  const { component } = await officialApi();
  return reference(await component(name, { cwd: docsRoot }));
}
