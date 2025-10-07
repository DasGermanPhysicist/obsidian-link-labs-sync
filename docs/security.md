# Security & Credentials

## Credentials
- Store `username`/`password` in plugin data via `this.saveData()` with user opt-in.
- Recommend using environment variables only in the CLI tool; in Obsidian, offer an option to avoid storing password (prompt on sync).
- If persistence is desired, consider simple encryption at rest with a user-provided passphrase (note: security through obscurity; document limitations).

## Network
- Always use HTTPS endpoint.
- Do not log credentials.

## File Writes
- Write atomically where possible; avoid partial files.
- Sanitize file names.
