export async function captureGate(env) {
  if (!env.MYBROWSER || !env.CAPTURE_LIMITER) throw new Error('CAPTURE_BINDING_MISSING');
  const attempt = await env.CAPTURE_LIMITER.limit({ key: 'owner-capture-v1' });
  if (!attempt.success) throw new Error('CAPTURE_RATE_LIMITED');
}
