# proxy/

The Cloudflare Worker that answers at docs.gettrillion.ai and forwards every request to the Mintlify deployment, so the docs keep Trillion's own address without a separate DNS change.

## Files

| File | Purpose |
|------|---------|
| `worker.mjs` | Forwards each request to `MINTLIFY_HOST` with `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto` and `CF-Connecting-IP` set as Mintlify expects; passes redirects through unchanged. |
| `wrangler.jsonc` | Worker name `trillion-docs`, the custom-domain route `docs.gettrillion.ai`, and the two settings `PUBLIC_HOST` and `MINTLIFY_HOST`. |

## Key Types / Functions

| Name | Shape | Role |
|------|-------|------|
| `fetch(request, env)` | `Request, { PUBLIC_HOST, MINTLIFY_HOST } → Response` | The only handler: one request in, one forwarded request out. |

## Dependencies

**Depends on:** the Mintlify deployment of this repo (`<subdomain>.mintlify.site`, with docs.gettrillion.ai added as its custom domain in the Mintlify dashboard); the gettrillion.ai zone on Cloudflare; `wrangler` signed in to that account.
**Depended on by:** everyone reading docs.gettrillion.ai; app.gettrillion.ai/docs redirects here.
