import fleet from '../examples/smat-mcp-fleet.json' with { type: 'json' };

export const CAPTURE_SIZES = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 }
};

export function siteFor(id) {
  const site = fleet.sites.find(item => item.id === id && item.routes.includes('/'));
  if (!site || !site.origin.startsWith('https://')) throw new Error('SITE_NOT_AUTHORIZED');
  return site;
}

export async function captureGate(env) {
  if (!env.MYBROWSER || !env.CAPTURE_LIMITER || !env.CAPTURE_QUOTA || !env.CAPTURE_EVIDENCE) throw new Error('CAPTURE_BINDING_MISSING');
  const attempt = await env.CAPTURE_LIMITER.limit({ key: 'owner-capture-v1' });
  if (!attempt.success) throw new Error('CAPTURE_RATE_LIMITED');
  const reservation = await env.CAPTURE_QUOTA.getByName('owner-v1').reserve();
  if (!reservation?.allowed || !reservation.id) throw new Error('CAPTURE_QUOTA_EXCEEDED');
  return reservation.id;
}
