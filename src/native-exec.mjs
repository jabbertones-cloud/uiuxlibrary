import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, realpathSync } from 'node:fs';
import { relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const home = fileURLToPath(new URL('../', import.meta.url));
const scripts = { simulator: 'simulator.py', localization: 'localization.py' };
export const nativeEvidence = resolve(home, '.uiux-evidence/native');
export function allowedPath(path, workspace) {
  if (!path) throw new Error('A registered source file is required');
  const roots = [workspace, ...(process.env.UIUX_NATIVE_ALLOWED_ROOTS || '').split(':').filter(Boolean)];
  const target = realpathSync(resolve(workspace, path));
  if (!roots.some(r => {
    const rel = relative(realpathSync(r), target);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  })) throw new Error('File is outside registered Interface Lab roots');
  return target;
}
export async function nativeRun(script, args) {
  if (process.env.UIUX_NATIVE_ENABLED !== '1') throw new Error('Set UIUX_NATIVE_ENABLED=1 on a trusted Mac');
  if (!Object.hasOwn(scripts, script)) throw new Error('Unsupported native action');
  mkdirSync(nativeEvidence, { recursive: true });
  const file = resolve(home, 'native-lab/cli', scripts[script]);
  try {
    const { stdout } = await exec('/usr/bin/python3', [file, ...args], {
      cwd: home, timeout: 180000, maxBuffer: 8 * 1024 * 1024, env: process.env
    });
    return JSON.parse(stdout.trim());
  } catch (e) {
    if (e.stdout) { try { return JSON.parse(e.stdout.trim()); } catch {} }
    throw new Error(String(e.stderr || e.message).slice(0, 600));
  }
}
