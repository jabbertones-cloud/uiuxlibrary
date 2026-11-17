#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { withinWorkspace } from '../src/receipt-gate.mjs';
import { runFleetAudit } from '../src/fleet-audit.mjs';

const args = process.argv.slice(2);
const usage = 'Usage: node scripts/fleet-audit.mjs <workspace-relative-manifest.json> [--site <site-id>]';
if (args.length !== 1 && !(args.length === 3 && args[1] === '--site')) {
  console.error(usage);
  process.exit(2);
}
try {
  const source = withinWorkspace(args[0], process.cwd());
  if (statSync(source).size > 32768) throw new Error('Fleet manifest exceeds 32 KiB');
  const manifest = JSON.parse(readFileSync(source, 'utf8'));
  const summary = await runFleetAudit(manifest, { siteId: args[2] });
  console.log(JSON.stringify({
    status: summary.status,
    runId: summary.runId,
    reportDirectory: summary.reportDirectory,
    totals: summary.totals,
    sites: summary.entries.map(({siteId, route, theme, status, findings, counts, evidence}) =>
      ({siteId, route, theme, status, counts, findings, evidenceSha256: evidence.sha256}))
  }, null, 2));
  process.exitCode = summary.status === 'PASS_AUTOMATED_ONLY' ? 0 :
    summary.status === 'FAIL' ? 1 : 2;
} catch (e) {
  console.error(JSON.stringify({status:'HOLD', error:String(e?.message || e).slice(0,220)}));
  process.exitCode = 2;
}
