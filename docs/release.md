# Release & Distribution

## Build
- Use `pnpm` or `npm` with `esbuild` to produce `main.js`.
- Bundle minimal dependencies.

## Manifest
- Provide `manifest.json` with plugin id, name, version, minAppVersion, description.

## Distribution
- GitHub repo with `manifest.json`, `main.js`, `styles.css` (optional), `README.md`.
- Optional: submit to Obsidian Community Plugins with required PR.

## Versioning
- SemVer for changes; document breaking changes.
