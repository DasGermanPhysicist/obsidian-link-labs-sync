# Sync Engine

## Goals
- Deterministic, idempotent, safe on re-run.
- Minimal file churn: only write when content changes.

## Steps per siteId
1. Fetch all pages of assets.
2. Map each asset to Markdown text via `mapping.ts`.
3. Compute content hash (e.g., SHA-256) and compare to on-disk (frontmatter + body).
4. If changed or missing → write/update.
5. Record summary (created, updated, unchanged, errors).

## Concurrency
- Process sites sequentially by default; inside each site, write with limited concurrency.

## File naming
- Default: `{{nodeName}}.md`, fallbacks: `{{description}}`, `{{macAddress}}`.
- Deduplicate with suffix (`-xxxx` last 4 of MAC, or counter).

## Deletions
- Optional setting: remove notes for assets not returned (with a dry-run prompt).

## Large syncs
- Chunk writing operations; yield to UI to avoid blocking.
