#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt } from './receipt-gate.mjs';
const [cmd, filename, flag] = process.argv.slice(2);
if (!['tokens', 'receipt'].includes(cmd) || !filename) {
  console.error('Usage: node src/cli.mjs tokens <file> | receipt <file> [--release]');
  process.exit(2);
}
try {
  const json = JSON.parse(readFileSync(filename, 'utf8'));
  const result = cmd === 'tokens' ? auditTokens(json) : assessReceipt(json, process.cwd(), { release: flag === '--release' });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'FAIL' || result.status === 'HOLD' ? 1 : 0;
} catch (e) {
  console.error(JSON.stringify({ status: 'HOLD', error: e.message }));
  process.exitCode = 2;
}
