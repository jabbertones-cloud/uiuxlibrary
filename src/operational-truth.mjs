const STATES = new Set(['ACTIVE', 'PARKED', 'API_ONLY', 'REDIRECT', 'UNKNOWN']);

export function normalizeOperational(site, origin, routes) {
  const value = site.operational;
  if (value === undefined) return { state: 'UNKNOWN', observation: null };
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !STATES.has(value.state)) throw new Error('Invalid operational state');
  if (typeof value.observedUrl !== 'string' || typeof value.observedAt !== 'string' ||
      typeof value.claim !== 'string' || value.claim.length < 12 || value.claim.length > 320)
    throw new Error('Operational status requires a dated source claim');
  const observed = new URL(value.observedUrl);
  if (observed.origin !== origin || !routes.includes(observed.pathname) ||
      observed.username || observed.password || observed.search || observed.hash)
    throw new Error('Operational observation must be on a declared route');
  const date = Date.parse(value.observedAt + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.observedAt) ||
      !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== value.observedAt)
    throw new Error('Operational observation must have a valid YYYY-MM-DD date');
  if (value.state !== 'REDIRECT' && value.redirectDestination !== undefined)
    throw new Error('Redirect target requires REDIRECT state');
  if (value.state === 'REDIRECT') {
    const target = new URL(value.redirectDestination);
    if (target.protocol !== 'https:' || target.username || target.password ||
        target.origin === origin || target.search || target.hash)
      throw new Error('Redirect target must be a distinct HTTPS destination');
  }
  return { state: value.state, observation: {
    observedUrl: observed.href, observedAt: value.observedAt, claim: value.claim,
    ...(value.redirectDestination ? { redirectDestination: value.redirectDestination } : {})
  } };
}

export function auditDisposition(operational) {
  const skip = ['REDIRECT', 'API_ONLY'].includes(operational.state);
  return { skip, customerTaskStatus: operational.state === 'PARKED' || skip ? 'HOLD' : 'NOT_TESTED' };
}
