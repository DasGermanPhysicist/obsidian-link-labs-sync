# Testing & QA

## Unit Tests (where possible)
- `mapping.ts` field mapping.
- Hash/idempotency logic.
- Filename sanitization and deduping.

## Manual Tests
- First-run setup and settings UI.
- API auth failure, 401/403, 429 retry.
- Pagination correctness on large sites.
- Multiple site IDs in one run.
- Idempotent re-run produces 0 changes.

## Performance Tests
- Measure time for 100, 1k, 10k assets.
