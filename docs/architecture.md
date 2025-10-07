# Architecture

## Plugin Structure
- `manifest.json`: Plugin metadata.
- `main.ts`: Extends `Plugin`. Registers settings, commands, ribbon/status UI, and starts the scheduler.
- `settings.tsx`: `PluginSettingTab` UI for credentials, site IDs, folder, interval, and template options.
- `api.ts`: API client using Obsidian `requestUrl` with Basic Auth, pagination, and error normalization.
- `sync.ts`: Sync engine orchestrating fetch → map → write, concurrency, and idempotency.
- `mapping.ts`: Field mapping to Markdown frontmatter/body (matching `WO 1.md`).
- `fs.ts`: Vault read/write, hashing, and safe updates.
- `types.ts`: Shared types for Asset, Settings, etc.

## Data Flow
1. Settings loaded via `this.loadData()`.
2. Command or scheduler triggers `sync(siteIds)`.
3. For each siteId: fetch pages → normalize assets → map to Markdown → compute hash → write if changed.
4. Report results via notices and status bar.

## Key Obsidian APIs
- `this.app.vault.create/modify/getAbstractFileByPath` for file IO.
- `requestUrl` for network calls (supports headers).
- `PluginSettingTab` for settings UI.
- `addCommand`, ribbon icon, status bar for UX.
- `this.loadData()/this.saveData()` for persistent plugin data.
