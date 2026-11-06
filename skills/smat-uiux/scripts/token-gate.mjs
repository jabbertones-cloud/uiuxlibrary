/**
 * SMAT-specific THREE-TIER GOVERNANCE, not a claim that DTCG mandates tiers.
 * DTCG token syntax is used; all parsing/validation of generic data relies on
 * JavaScript's JSON parser and native iteration. No replacement token engine.
 */
const TIERS = ['primitive', 'semantic', 'component'];
const FULL_ALIAS = /^\{([a-zA-Z0-9_.-]+)\}$/;

function walk(obj, path, output, errors) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push({ code: 'INVALID_GROUP', path: path.join('.') });
    return;
  }
  if (Object.hasOwn(obj, '$value')) {
    const key = path.join('.');
    if (path.length < 3) errors.push({ code: 'TOKEN_PATH_TOO_SHORT', path: key });
    if (typeof obj.$type !== 'string' || !obj.$type.trim())
      errors.push({ code: 'TOKEN_TYPE_MISSING', path: key });
    output.set(key, obj);
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // group metadata is permitted by DTCG
    walk(value, [...path, key], output, errors);
  }
}

function aliases(value) {
  if (typeof value === 'string') {
    const match = FULL_ALIAS.exec(value);
    return match ? [match[1]] : [];
  }
  if (Array.isArray(value)) return value.flatMap(aliases);
  if (value && typeof value === 'object') return Object.values(value).flatMap(aliases);
  return [];
}

function suspiciousAliasSyntax(value) {
  if (typeof value === 'string') return value.includes('{') || value.includes('}');
  if (Array.isArray(value)) return value.some(suspiciousAliasSyntax);
  if (value && typeof value === 'object') return Object.values(value).some(suspiciousAliasSyntax);
  return false;
}

export function auditTokens(document) {
  const errors = [];
  const tokens = new Map();
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return { status: 'FAIL', tokenCount: 0, errors: [{ code: 'INVALID_DOCUMENT', path: '$' }] };
  }
  for (const tier of TIERS) {
    if (!document[tier]) {
      errors.push({ code: 'MISSING_TIER', path: tier });
      continue;
    }
    walk(document[tier], [tier], tokens, errors);
    if (![...tokens.keys()].some(key => key.startsWith(`${tier}.`)))
      errors.push({ code: 'EMPTY_TIER', path: tier });
  }
  for (const key of Object.keys(document)) {
    if (!TIERS.includes(key) && !key.startsWith('$'))
      errors.push({ code: 'UNEXPECTED_TOP_LEVEL_GROUP', path: key });
  }
  for (const [key, token] of tokens) {
    const tier = key.split('.')[0];
    const refs = aliases(token.$value);
    if (suspiciousAliasSyntax(token.$value) && !refs.length)
      errors.push({ code: 'INVALID_ALIAS_FORMAT', path: key });
    if (tier === 'primitive' && refs.length)
      errors.push({ code: 'PRIMITIVE_USES_ALIAS', path: key });
    if (tier !== 'primitive' && refs.length === 0)
      errors.push({ code: 'MISSING_REQUIRED_REFERENCE', path: key });
    const mustReference = tier === 'component' ? 'semantic' : 'primitive';
    for (const ref of refs) {
      if (!tokens.has(ref)) errors.push({ code: 'UNKNOWN_ALIAS', path: key, reference: ref });
      if (tier !== 'primitive' && !ref.startsWith(`${mustReference}.`))
        errors.push({ code: 'WRONG_TIER_REFERENCE', path: key, reference: ref, expected: mustReference });
      if (token.$type && tokens.has(ref) && tokens.get(ref).$type && token.$type !== tokens.get(ref).$type)
        errors.push({ code: 'ALIAS_TYPE_MISMATCH', path: key, reference: ref });
    }
  }
  // Full alias edges cannot cycle within this tier architecture. Defend in case
  // a future schema allows additional within-tier aliases.
  const visiting = new Set();
  const visited = new Set();
  function dfs(key) {
    if (visiting.has(key)) { errors.push({ code: 'ALIAS_CYCLE', path: key }); return; }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const ref of aliases(tokens.get(key)?.$value)) if (tokens.has(ref)) dfs(ref);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of tokens.keys()) dfs(key);
  return {
    status: errors.length ? 'FAIL' : 'PASS_STRUCTURAL_ONLY',
    tokenCount: tokens.size,
    perTier: Object.fromEntries(TIERS.map(tier => [tier, [...tokens.keys()].filter(key => key.startsWith(tier + '.')).length])),
    errors
  };
}
