import assert from 'node:assert/strict';
import test from 'node:test';
import { isNonUiTelemetryRequest, pageAuditStatus } from '../src/browser-adapter.mjs';

test('known Cloudflare telemetry requests are suppressed, not treated as UI dependencies', () => {
  assert.equal(isNonUiTelemetryRequest('GET', 'https://static.cloudflareinsights.com/beacon.min.js/v1'), true);
  assert.equal(isNonUiTelemetryRequest('POST', 'https://smatdesigns.com/cdn-cgi/rum'), true);
  assert.equal(isNonUiTelemetryRequest('GET', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'), false);
  assert.equal(isNonUiTelemetryRequest('POST', 'https://smatdesigns.com/api/checkout'), false);
});

test('read-only blocked requests produce HOLD instead of a false site failure', () => {
  assert.deepEqual(pageAuditStatus({
    httpOk: true, blockedRequests: 1, consoleErrors: 1,
    overflow: false, violations: 0
  }), {
    status: 'HOLD',
    reasons: ['READ_ONLY_POLICY_BLOCKED_REQUESTS', 'BROWSER_ERRORS_OBSERVED']
  });
});

test('measured layout or accessibility defects remain failures even when requests are blocked', () => {
  assert.equal(pageAuditStatus({
    httpOk: true, blockedRequests: 1, consoleErrors: 1,
    overflow: true, violations: 0
  }).status, 'FAIL');
});

test('document height does not block a successful viewport audit', () => {
  assert.deepEqual(pageAuditStatus({
    httpOk: true, blockedRequests: 0, consoleErrors: 0, documentHeight: 20001,
    overflow: false, violations: 0
  }), {
    status: 'PASS_AUTOMATED_ONLY', reasons: []
  });
});

test('clean complete snapshots remain automated-only passes', () => {
  assert.equal(pageAuditStatus({
    httpOk: true, blockedRequests: 0, consoleErrors: 0,
    overflow: false, violations: 0
  }).status, 'PASS_AUTOMATED_ONLY');
});
