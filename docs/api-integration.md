# API Integration

Endpoint base:
`https://networkasset-conductor.link-labs.com/networkAsset/airfinder/v4/tags`

Query params:
- `siteId` (variable; multiple site IDs fetched sequentially or with limited concurrency)
- `groupBy=none`
- `page` (paginate from 1..N)
- `sortBy=lastEventTime`
- `sort=dsc`

Auth:
- HTTP Basic Auth header: `Authorization: Basic <base64(user:pass)>`

Obsidian API:
- Use `requestUrl({ url, headers })` instead of `fetch`.

Pagination strategy:
- Fetch page=1..N until an empty page or known `totalPages`.
- Respect backoff on HTTP 429/5xx; apply exponential retry with jitter.

Response normalization:
- Ensure result is an array. If wrapped (`{items}`/`{data}`), unwrap.

Rate limiting:
- Limit concurrent requests (e.g., 2–3).
- Add small delay between pages.
