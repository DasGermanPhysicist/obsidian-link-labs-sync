import { App, Notice, normalizePath } from 'obsidian';
import type { Asset, Credentials, PluginSettings, SyncSummary } from './types';
import { fetchAssetsForSite, fetchSiteInfo } from './api';
import { assetToMarkdown, chooseBaseFileName } from './mapping';
import { ensureFolder, writeFileIfChanged } from './fs';

export async function syncAll(app: App, settings: PluginSettings): Promise<SyncSummary[]> {
  const { username, password, siteIds, outputFolder } = settings;
  if (!username || !password || !siteIds?.length) {
    new Notice('Link Labs Sync: Missing credentials or site IDs in settings');
    console.warn('Link Labs Sync: settings incomplete', {
      hasUsername: Boolean(username),
      hasPassword: Boolean(password),
      siteIdsCount: siteIds?.length || 0,
    });
    return [];
  }

  const summaries: SyncSummary[] = [];
  console.log('Link Labs Sync: starting syncAll', { siteIdsCount: siteIds.length, outputFolder });

  for (const siteId of siteIds) {
    const summary: SyncSummary = { siteId, created: 0, updated: 0, unchanged: 0, errors: 0 };
    try {
      const creds: Credentials = { username, password };
      console.log('Link Labs Sync: fetching assets for site', { siteId });
      const assets = await fetchAssetsForSite(siteId, creds, settings.maxPagesPerSite ?? 1);
      console.log('Link Labs Sync: fetched count', { siteId, count: assets.length });
      // Fetch site metadata (siteName/orgName) once per site
      const { siteName, orgName } = await fetchSiteInfo(siteId, creds);
      if (assets.length === 0) {
        new Notice(`Link Labs Sync: no assets returned for site ${siteId}`);
      }

      // Ensure site folder exists
      const siteFolder = normalizePath(`${outputFolder}/${siteId}`);
      await ensureFolder(app, outputFolder); // root
      await ensureFolder(app, siteFolder);

      for (const asset of assets) {
        try {
          // Ensure siteId is present in asset for frontmatter mapping
          (asset as Asset).siteId = siteId;
          (asset as Asset).siteName = siteName ?? null;
          (asset as Asset).orgName = orgName ?? null;
          const md = assetToMarkdown(asset);
          const base = chooseBaseFileName(asset);
          const filePath = normalizePath(`${siteFolder}/${base}.md`);
          const result = await writeFileIfChanged(app, filePath, md);
          if (result === 'created') summary.created += 1;
          else if (result === 'updated') summary.updated += 1;
          else summary.unchanged += 1;
        } catch (e) {
          console.error('Link Labs Sync: failed to write an asset note', e);
          summary.errors += 1;
        }
      }
    } catch (e) {
      console.error(`Link Labs Sync: error syncing site ${siteId}`, e);
      summary.errors += 1;
    }
    summaries.push(summary);
  }

  return summaries;
}
