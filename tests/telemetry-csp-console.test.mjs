import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isNonUiTelemetryCspConsoleError, pageAuditStatus
} from '../src/browser-adapter.mjs';

const beacon = 'https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092';
const csp = url => "Loading the script '" + url + "' violates the following Content Security Policy directive: \"default-src 'none'\". Note that 'script-src-elem' was not explicitly set, so 'default-src' is used as a fallback. The action has been blocked.";

test('Cloudflare telemetry denied by site CSP is evidenced, not silently assumed', () => {
  assert.equal(isNonUiTelemetryCspConsoleError(csp(beacon), new Set([beacon])), true);
  assert.equal(isNonUiTelemetryCspConsoleError(csp(beacon), new Set()), false);
  assert.equal(isNonUiTelemetryCspConsoleError(csp(beacon), new Set(['https://example.org/other.js'])), false);
});

test('third-party app scripts and spoofed CSP messages remain failure evidence', () => {
  const script = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
  assert.equal(isNonUiTelemetryCspConsoleError(csp(script), new Set([script])), false);
  assert.equal(isNonUiTelemetryCspConsoleError(csp('https://static.cloudflareinsights.com.evil.example/beacon.min.js'), new Set()), false);
  assert.equal(isNonUiTelemetryCspConsoleError(csp('https://static.cloudflareinsights.com/beacon.min.js.fake'), new Set(['https://static.cloudflareinsights.com/beacon.min.js.fake'])), false);
  assert.equal(isNonUiTelemetryCspConsoleError("Unexpected error: " + csp(beacon), new Set([beacon])), false);
  assert.equal(isNonUiTelemetryCspConsoleError("Loading the script '" + beacon + "' loaded with an error", new Set([beacon])), false);
});

test('non-telemetry console errors still fail an otherwise clean audit', () => {
  assert.equal(pageAuditStatus({
    httpOk: true, blockedRequests: 0, consoleErrors: 1, overflow: false, violations: 0
  }).status, 'FAIL');
  assert.equal(pageAuditStatus({
    httpOk: true, blockedRequests: 0, consoleErrors: 0, overflow: false, violations: 0
  }).status, 'PASS_AUTOMATED_ONLY');
});
