import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { captureGate as candidateGate } from '../cloudflare/capture-policy.mjs';
import { captureGate as baselineGate } from '../fixtures/capture-gate-baseline.mjs';

const base = 'ca971b85ae75b2a909ba5236bd28afffcb17d577';
const source = execFileSync('git', ['show', `${base}:cloudflare/capture-policy.mjs`], {encoding:'utf8'});
const expected = source.slice(source.indexOf('export async function captureGate(env) {')).trim();
assert.equal(readFileSync(new URL('../fixtures/capture-gate-baseline.mjs', import.meta.url),'utf8').trim(), expected,
  'Historical gate fixture must exactly match pinned first-party baseline');
const env = {MYBROWSER:{}, CAPTURE_LIMITER:{limit:async()=>({success:true})}};
const n = 100;
const before = await Promise.allSettled(Array.from({length:n},()=>baselineGate(env)));
const after = await Promise.allSettled(Array.from({length:n},()=>candidateGate(env)));
assert.ok(before.every(item=>item.status==='fulfilled'));
assert.ok(after.every(item=>item.status==='rejected'&&item.reason?.message==='CAPTURE_BINDING_MISSING'));
console.log(JSON.stringify({metric:'captures_admitted_without_durable_storage_or_quota',
  baseline:before.filter(x=>x.status==='fulfilled').length,
  candidate:after.filter(x=>x.status==='fulfilled').length,direction:'lower',
  scenario:'100 simulated calls with permissive approximate limiter and intentionally absent R2 and DO bindings; not provider load measurement'}));
