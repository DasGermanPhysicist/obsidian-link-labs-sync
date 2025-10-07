# Settings

## Stored Settings
- `username` (string)
- `password` (string, see Security)
- `siteIds` (string[])
- `outputFolder` (string, default: `LinkLabs/`)
- `scheduleMinutes` (number, default: 30)
- `frontmatterTemplate` (string, handlebars-like with defaults)
- `fileNameTemplate` (string, e.g., `{{nodeName}}.md` with fallbacks)
- `concurrency` (number, default: 3)
- `maxPagesPerSite` (number | "all")

## Settings UI
- Credentials inputs (password field obscured).
- Site IDs list (add/remove chips).
- Output folder picker.
- Sync interval (minutes) with enable/disable toggle.
- Advanced: concurrency, pagination, templates (with preview).

## Validation
- Require at least one of: valid credentials + site ID(s).
- Warn if folder missing (offer create).
- Test connection button.
