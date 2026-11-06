#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt } from './receipt-gate.mjs';
import { diffScreenshots } from './screenshot-diff.mjs';
const [cmd, filename, flag] = process.argv.slice(2);
if (!['tokens', 'receipt', 'diff'].includes(cmd) || !filename || (cmd === 'diff' && !flag)) {
  console.error('Usage: node src/cli.mjs tokens <file> | receipt <file> [--release] | diff <before.png> <after.png>');
  process.exit(2);
}
try {
  const result = cmd === 'diff' ? diffScreenshots(filename, flag, process.cwd()) :
    cmd === 'tokens' ? auditTokens(JSON.parse(readFileSync(filename, 'utf8'))) :
      assessReceipt(JSON.parse(readFileSync(filename, 'utf8')), process.cwd(), { release: flag === '--release' });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = ['FAIL', 'HOLD', 'INCOMPARABLE', 'DIFFERENCE_REQUIRES_REVIEW'].includes(result.status) ? 1 : 0;
} catch (e) {
  console.error(JSON.stringify({ status: 'HOLD', error: e.message }));
  process.exitCode = 2;
}
