# Performance

- Use `requestUrl` with modest concurrency (2–3) to avoid rate limits.
- Batch writes and avoid unnecessary updates via hashing.
- Debounce background sync when user is actively editing.
- Use streaming pagination where possible.
- Keep memory footprint low by processing assets per page.
