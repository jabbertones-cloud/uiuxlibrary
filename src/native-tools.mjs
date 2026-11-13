import * as z from 'zod/v4';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { nativeEvidence, nativeRun, allowedPath } from './native-exec.mjs';
const wrap = async fn => {
  try { return { content: [{ type: 'text', text: JSON.stringify(await fn()) }] }; }
  catch (e) { return { content: [{ type: 'text', text: JSON.stringify({ status: 'HOLD', error: e.message }) }], isError: true }; }
};
export function registerNativeTools(server, workspace) {
  server.registerTool('uiux_native_simulators', {
    description: 'List real installed Apple simulators (read-only; no AiSCent).',
    inputSchema: z.object({})
  }, async () => wrap(() => nativeRun('simulator', ['list'])));
  server.registerTool('uiux_native_screens', {
    description: 'List screen IDs in an app-specific Interface Lab route catalog.',
    inputSchema: z.object({ screensFile: z.string().min(1) })
  }, async ({ screensFile }) => wrap(() => nativeRun('simulator',
    ['screens', '--screens-file', allowedPath(screensFile, workspace)])));
  server.registerTool('uiux_native_capture', {
    description: 'Choose app screen, locale, simulator and (for Duo) display; capture real PNG. Route success is NOT verified screen identity.',
    inputSchema: z.object({ screensFile: z.string().min(1), screen: z.string().min(1),
      simulator: z.string().min(1), locale: z.string().default('en-US'),
      display: z.string().optional(), dryRun: z.boolean().default(false) })
  }, async (a) => wrap(async () => {
    const out = resolve(nativeEvidence, randomUUID() + '.png');
    const args = ['capture', '--screens-file', allowedPath(a.screensFile, workspace),
      '--screen', a.screen, '--device', a.simulator, '--locale', a.locale,
      '--output', out, ...(a.display ? ['--display', a.display] : []),
      ...(a.dryRun ? ['--dry-run'] : [])];
    return nativeRun('simulator', args);
  }));
  server.registerTool('uiux_native_localization', {
    description: 'Audit real Xcode String Catalog status/manifest/gate; or preview pseudolanguages. Does not translate or approve.',
    inputSchema: z.object({ action: z.enum(['status', 'manifest', 'gate', 'pseudo']),
      catalog: z.string().optional(), locale: z.string().optional() })
  }, async (a) => wrap(() => nativeRun('localization',
    [a.action, ...(a.catalog ? ['--catalog', allowedPath(a.catalog, workspace)] : []),
      ...(a.locale ? ['--locale', a.locale] : [])])));
}
