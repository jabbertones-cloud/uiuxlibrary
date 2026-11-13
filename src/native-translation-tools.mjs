import * as z from 'zod/v4';
import { randomUUID } from 'node:crypto';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { nativeEvidence, nativeRun, allowedPath } from './native-exec.mjs';
const result = async fn => {
  try { return { content: [{ type: 'text', text: JSON.stringify(await fn()) }] }; }
  catch (e) { return { content: [{ type: 'text', text: JSON.stringify({ status: 'HOLD', error: e.message }) }], isError: true }; }
};
async function withInput(body, fn) {
  mkdirSync(nativeEvidence, { recursive: true });
  const file = resolve(nativeEvidence, randomUUID() + '.json');
  writeFileSync(file, JSON.stringify(body));
  try { return await fn(file); } finally { rmSync(file, { force: true }); }
}
export function registerNativeTranslationTools(server, workspace) {
  server.registerTool('uiux_native_translate', {
    description: 'Produce local Apple Translation candidates for UI keys; never claims native approval or modifies catalogs.',
    inputSchema: z.object({ sourceLocale: z.string().default('en'), targetLocale: z.string(),
      texts: z.record(z.string(), z.string()), protectedTerms: z.array(z.string()).default([]) })
  }, async a => result(() => withInput({ source_locale: a.sourceLocale, target_locale: a.targetLocale,
    texts: a.texts, protected_terms: a.protectedTerms },
    file => nativeRun('localization', ['translate', '--input', file]))));
  server.registerTool('uiux_native_apply_translations', {
    description: 'Explicitly write key-mapped UI translations to a registered .xcstrings catalog, marked needsReview. Never approves release.',
    inputSchema: z.object({ catalog: z.string().min(1), translations: z.record(z.string(), z.record(z.string(), z.string())),
      confirm: z.literal(true) })
  }, async a => result(() => {
    if (process.env.UIUX_NATIVE_LOCALIZATION_WRITE_ENABLED !== '1')
      throw new Error('Set UIUX_NATIVE_LOCALIZATION_WRITE_ENABLED=1 for reviewed catalog changes');
    return withInput(a.translations, file => nativeRun('localization',
      ['apply', '--catalog', allowedPath(a.catalog, workspace), '--input', file, '--confirm']));
  }));
}
