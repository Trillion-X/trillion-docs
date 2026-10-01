// proxy/worker.mjs
//
// Purpose: serve the docs site at this Worker's own address (docs.gettrillion.ai) from the Mintlify deployment.
//   Mintlify hosts the pages; this Worker only forwards each request to the Mintlify host with the headers Mintlify
//   uses to recognise the custom domain, and returns the answer unchanged.
// Invariants:
//   1. It knows no page, path or product: the upstream host and the public host are settings (wrangler.jsonc vars).
//   2. Every request is forwarded, including /.well-known/ (certificate checks), /mintlify-assets/ and /_mintlify/.
//   3. It holds no secret and no storage; one request in is one request out, redirects passed through unchanged.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const publicHost = env.PUBLIC_HOST || url.host;
    url.hostname = env.MINTLIFY_HOST;
    url.protocol = 'https:';
    url.port = '';
    const forwarded = new Request(url, request);
    forwarded.headers.set('Host', env.MINTLIFY_HOST);
    forwarded.headers.set('X-Forwarded-Host', publicHost);
    forwarded.headers.set('X-Forwarded-Proto', 'https');
    const client = request.headers.get('CF-Connecting-IP');
    if (client) forwarded.headers.set('CF-Connecting-IP', client);
    return fetch(forwarded, { redirect: 'manual' });
  },
};
