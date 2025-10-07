# Overview

Goal: An Obsidian plugin that lets users authenticate to Link Labs, select one or more site IDs, and sync asset data into Markdown files inside their vault. Files contain frontmatter matching your current `WO 1.md` example and can be re-synced via commands.

## Core Capabilities
- Sync assets for 1..N `siteId`s (user-configurable).
- Map fields to frontmatter and body as in `WO 1.md`.
- Idempotent writes: only update files when content changes.
- Command palette actions: Sync Now, Configure, Open Latest Updated, Rebuild Index.
- Background scheduled sync with interval.
- Pagination, rate-limiting, retry, and basic error reporting.

## Non-Goals (initial)
- Advanced dashboards. (Potential future work.)
- Complex diff/merge UI. (Keep file writes atomic and minimal.)
