import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateFleetManifest, runFleetAudit } from '../src/fleet-audit.mjs';
import { DEFAULT_VIEWPORTS } from '../src/browser-adapter.mjs';

const source = (state, id, extras = {}) => ({
  id, origin: 'https://' + id + '.example.com', routes: ['/'],
  job: 'Try the first-time user workflow and verify an after-state',
  themes: ['light'],
  operational: { state, observedUrl: 'https://' + id + '.example.com/',
    observedAt: '2026-11-17', claim: 'Source-bound homepage observation, no customer success proof',
    ...extras }
});
const doc = sites => ({ schema: 'smat-uiux-fleet/v1', sites });
const fake = (status=200) => ({
  status: status === 200 ? 'PASS_AUTOMATED_ONLY' : 'FAIL',
  results: DEFAULT_VIEWPORTS.map(v => ({
    viewport: v.name, width: v.width, height: v.height, measuredViewportWidth: v.width,
    automatedStatus: status === 200 ? 'PASS_AUTOMATED_ONLY' : 'FAIL',
    httpStatus: status, overflow: false, blockedRequests: 0, consoleErrors: 0,
    accessibilityViolations: []
  }))
});

test('operational observations require declared URL, real date, and valid state', () => {
  const parked = source('PARKED', 'parked');
  assert.equal(validateFleetManifest(doc([parked])).sites[0].operational.state, 'PARKED');
  for (const invalid of [
    { state: 'BOGUS' }, { observedUrl: 'https://another.example.com/' },
    { observedUrl: 'https://parked.example.com/private' },
    { observedAt: '2026-02-30' }, { observedAt: 'tomorrow' }, { claim: 'short' },
    { redirectDestination: 'https://other.example.com/' }
  ]) assert.throws(() => validateFleetManifest(doc([{
    ...parked, operational: { ...parked.operational, ...invalid }
  }])));
  assert.throws(() => validateFleetManifest(doc([source('REDIRECT', 'alias')])));
  assert.throws(() => validateFleetManifest(doc([source('REDIRECT', 'alias', {
    redirectDestination: 'https://alias.example.com/'
  })])));
});

test('parked 200 never becomes a customer task success; API and redirects are distinct', async () => {
  const sites = [
    source('PARKED', 'parked'),
    source('API_ONLY', 'api-only'),
    source('REDIRECT', 'alias', { redirectDestination:'https://actual.example.com/' }),
    source('UNKNOWN', 'root404'),
    source('ACTIVE', 'active')
  ];
  const seen = [];
  const dir = mkdtempSync(join(tmpdir(), 'uiux-operational-truth-'));
  try {
    const result = await runFleetAudit(doc(sites), {
      outputDir: dir, audit: async url => {
        seen.push(url);
        return fake(url.includes('root404') ? 404 : 200);
      }
    });
    assert.equal(seen.length, 3);
    assert.equal(result.totals.visualSitesAudited, 3);
    assert.equal(result.totals.nonVisualRoutesSkipped, 2);
    assert.equal(result.totals.customerTasksVerified, 0);
    const byId = Object.fromEntries(result.entries.map(entry => [entry.siteId, entry]));
    assert.equal(byId.parked.status, 'PASS_AUTOMATED_ONLY');
    assert.equal(byId.parked.customerTaskStatus, 'HOLD');
    assert.equal(byId.active.customerTaskStatus, 'NOT_TESTED');
    assert.equal(byId.root404.status, 'FAIL');
    assert.equal(byId.root404.customerTaskStatus, 'NOT_TESTED');
    assert.equal(byId.root404.apiEndpointsVerified, false);
    assert.equal(byId.root404.httpScope, 'EXACT_ROUTE_ONLY');
    for (const id of ['api-only', 'alias']) {
      assert.equal(byId[id].status, 'HOLD');
      assert.equal(byId[id].customerTaskStatus, 'HOLD');
      assert.equal(byId[id].auditSkipped, true);
      const bytes = readFileSync(byId[id].evidence.reportFile);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), byId[id].evidence.sha256);
    }
    assert.equal(byId.alias.observation.redirectDestination, 'https://actual.example.com/');
    assert.equal(result.customerTasksObserved, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
