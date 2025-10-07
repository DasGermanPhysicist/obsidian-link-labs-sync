# Link Labs Sync (Obsidian Plugin)

Sync Link Labs asset data into your Obsidian vault as Markdown notes.

## Features
- Authenticate with username/password (stored in plugin settings)
- Configure one or multiple site IDs
- Background sync every 60 minutes by default (toggle in settings)
- Writes notes to `LinkLabs/<siteId>/` with frontmatter matching your sample
- Idempotent writes (update only if content changed)

## Install (Developer)
1. Build the plugin:
   ```bash
   npm install
   npm run build
   ```
2. Copy the following files to your vault under `.obsidian/plugins/link-labs-sync/`:
   - `manifest.json`
   - `main.js`
   - (optional) `styles.css`
3. In Obsidian, go to Settings → Community plugins → Turn on Developer Mode if needed → Refresh plugins → Enable "Link Labs Sync".

## Usage
- Open Settings → Link Labs Sync
  - Enter username and password
  - Enter one or more site IDs (comma-separated)
  - Optionally adjust output folder (default `LinkLabs`) and background sync interval (default 60 minutes)
- Run command palette → "Link Labs: Sync Now" to perform a manual sync
- Notes will be created/updated at `LinkLabs/<siteId>/*.md`

## Build & Dev
- Build once: `npm run build`
- Watch mode: `npm run dev`

## Notes
- This plugin uses `requestUrl` for API calls and Basic Auth headers
- Default folder structure and frontmatter align with your `WO 1.md` example
