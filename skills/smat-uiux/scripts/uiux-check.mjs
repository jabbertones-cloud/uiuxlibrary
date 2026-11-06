#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt } from './receipt-gate.mjs';
const [cmd, filename, releaseFlag] = process.argv.slice(2);
if (!['tokens', 'receipt'].includes(cmd) || !filename) {
  console.error('Usage: node scripts/uiux-check.mjs tokens <file> | receipt <file> [--release]');
  process.exit(2);
}
try {
  const data = JSON.parse(readFileSync(filename, 'utf8'));
  const result = cmd === 'tokens'
    ? auditTokens(data)
    : assessReceipt(data, process.cwd(), { release: releaseFlag === '--release' });
  console.log(JSON.stringify(result, null, 2));
  if (['FAIL', 'HOLD'].includes(result.status)) process.exitCode = 1;
} catch (e) {
  console.error(JSON.stringify({ status: 'HOLD', error: e.message }));
  process.exitCode = 2;
}
