import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTokens } from '../src/token-gate.mjs';
import { assessReceipt } from '../src/receipt-gate.mjs';

test('token-gate: passes valid structural 3-tier token document', () => {
  const doc = {
    primitive: {
      color: {
        ink: { $type: 'color', $value: '#000000' }
      }
    },
    semantic: {
      text: {
        primary: { $type: 'color', $value: '{primitive.color.ink}' }
      }
    },
    component: {
      button: {
        label: { $type: 'color', $value: '{semantic.text.primary}' }
      }
    }
  };
  const result = auditTokens(doc);
  assert.equal(result.status, 'PASS_STRUCTURAL_ONLY');
  assert.equal(result.tokenCount, 3);
  assert.equal(result.errors.length, 0);
});

test('token-gate: catches missing tiers and cross-tier reference violations', () => {
  const badDoc = {
    primitive: {
      color: {
        ink: { $type: 'color', $value: '#000000' }
      }
    },
    semantic: {
      text: {
        primary: { $type: 'color', $value: '#000000' } // semantic must use alias
      }
    },
    component: {
      button: {
        label: { $type: 'color', $value: '{primitive.color.ink}' } // component cannot directly ref primitive
      }
    }
  };
  const result = auditTokens(badDoc);
  assert.equal(result.status, 'FAIL');
  const codes = result.errors.map(e => e.code);
  assert.ok(codes.includes('MISSING_REQUIRED_REFERENCE'));
  assert.ok(codes.includes('WRONG_TIER_REFERENCE'));
});

test('receipt-gate: returns HOLD on invalid schema or missing required fields', () => {
  const result = assessReceipt({}, process.cwd());
  assert.equal(result.status, 'HOLD');
  const codes = result.errors.map(e => e.code);
  assert.ok(codes.includes('WRONG_SCHEMA'));
  assert.ok(codes.includes('PROJECT_MISSING'));
});

test('receipt-gate: strictly enforces 3 customer task sessions and human reviewer', () => {
  const receipt = {
    schema: 'smat-uiux-receipt/v1',
    project: 'test-project',
    candidate: { sha: '1111111111111111111111111111111111111111' },
    workType: 'new',
    customerOutcome: { job: 'inspect', firstValue: 'value' },
    gates: {
      source_rights: { status: 'pass', evidence: [] },
      tokens: { status: 'pass', evidence: [] },
      component_behavior: { status: 'pass', evidence: [] },
      accessibility: { status: 'pass', evidence: [] },
      browser_responsive: { status: 'pass', evidence: [] },
      visual_regression: { status: 'pass', evidence: [] },
      human_visual: { status: 'pass', reviewer: { kind: 'bot', id: 'ai' }, evidence: [] },
      customer_task: { status: 'pass', sessions: [{ firstTime: true, success: true }], evidence: [] }
    }
  };
  const result = assessReceipt(receipt, process.cwd());
  assert.equal(result.status, 'HOLD');
  const codes = result.errors.map(e => e.code);
  assert.ok(codes.includes('HUMAN_VISUAL_UNVERIFIED'));
  assert.ok(codes.includes('INSUFFICIENT_TASK_SESSIONS'));
});
