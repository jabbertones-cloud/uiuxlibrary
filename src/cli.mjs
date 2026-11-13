#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { auditTokens } from './token-gate.mjs';
import { assessReceipt } from './receipt-gate.mjs';
import { diffScreenshots } from './screenshot-diff.mjs';
import { judgeNativeCapture } from './native-judge.mjs';
const [cmd, filename, flag, reviewFile] = process.argv.slice(2);
if (!['tokens', 'receipt', 'diff', 'native'].includes(cmd) || !filename || (['diff', 'native'].includes(cmd) && !flag)) {
  console.error('Usage: node src/cli.mjs tokens <file> | receipt <file> [--release] | diff <before.png> <after.png> | native <capture.json> <plan.json> [review.json]');
  process.exit(2);
}
try {
  const result = cmd === 'native' ? judgeNativeCapture(
    JSON.parse(readFileSync(filename, 'utf8')), JSON.parse(readFileSync(flag, 'utf8')),
    process.cwd(), reviewFile ? JSON.parse(readFileSync(reviewFile, 'utf8')) : undefined) :
    cmd === 'diff' ? diffScreenshots(filename, flag, process.cwd()) :
    cmd === 'tokens' ? auditTokens(JSON.parse(readFileSync(filename, 'utf8'))) :
      assessReceipt(JSON.parse(readFileSync(filename, 'utf8')), process.cwd(), { release: flag === '--release' });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = ['FAIL', 'HOLD', 'INCOMPARABLE', 'DIFFERENCE_REQUIRES_REVIEW'].includes(result.status) ? 1 : 0;
} catch (e) {
  console.error(JSON.stringify({ status: 'HOLD', error: e.message }));
  process.exitCode = 2;
}
