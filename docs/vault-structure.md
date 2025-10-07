# Vault Structure & Templates

## Default layout
- Folder: `LinkLabs/`
- Subfolder per site: `LinkLabs/<siteId>/`
- Files: `LinkLabs/<siteId>/<nodeName>.md`

## Frontmatter template
```
---
location: {{latitude}},{{longitude}}
LL_macid: {{macAddress}}
LL_nodename: {{nodeNameOrDescription}}
LL_categoryName: {{categoryName}}
groupName: {{groupName}}
LL_areaName: {{areaName}}
LL_zoneName: {{zoneName}}
LL_lastEventTime: {{lastEventTime}}
LL_siteId: {{siteId}}
---

#ll_asset
```

- Fields mirror `WO 1.md`.
- Allow users to customize via `frontmatterTemplate`.

## Index note (optional)
- Generate `LinkLabs/<siteId>/Index.md` with a table of assets.
