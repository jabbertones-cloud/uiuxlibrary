export { CaptureQuota } from '../cloudflare/capture-quota.mjs';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/health') return Response.json({status:'ok'});
    if (new URL(request.url).pathname !== '/reserve') return new Response('Not Found', {status:404});
    const result = await env.CAPTURE_QUOTA.getByName('owner-v1').reserve();
    return Response.json(result);
  }
};
