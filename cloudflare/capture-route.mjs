/** Read-only Browser Run network policy, borrowed from Interface Lab's proven local adapter. */
export async function installCaptureRoutes(context, origin, counts) {
  if (typeof context.routeWebSocket !== 'function')
    throw new Error('WEBSOCKET_CONTROL_UNAVAILABLE');
  await context.routeWebSocket('**/*', ws => { counts.websocketBlocks++; ws.close(); });
  await context.route('**/*', route => {
    const request = route.request();
    let parsed;
    try { parsed = new URL(request.url()); } catch { counts.blocked++; return route.abort(); }
    if (['GET', 'HEAD'].includes(request.method()) && parsed.origin === origin)
      return route.continue();
    if (request.method() === 'GET' && parsed.hostname === 'static.cloudflareinsights.com' &&
        parsed.pathname.startsWith('/beacon.min.js')) counts.telemetry++;
    else {
      counts.blocked++;
      counts.blockedHosts.add(parsed.hostname);
    }
    return route.abort();
  });
}
