import { App, Notice, normalizePath } from 'obsidian';
import type { Asset, Credentials, PluginSettings, SyncSummary } from './types';
import { fetchAssetsForSite, fetchSiteInfo, fetchAreasForSite, fetchZonesForArea, fetchLocationBeaconsForSite, resolveAddress } from './api';
import { assetToMarkdown, chooseBaseFileName, areaToMarkdown, chooseAreaFileName, zoneToMarkdown, chooseZoneFileName, locationBeaconToMarkdown, chooseLocationBeaconFileName } from './mapping';
import { ensureFolder, writeFileIfChanged, buildMacidIndex, writeFileWithMacidTracking } from './fs';

// Helper function to create site folder name from siteName and siteId
function createSiteFolderName(siteName: string | null, siteId: string): string {
  if (siteName && siteName.trim()) {
    // Sanitize siteName for use in folder name
    const cleanSiteName = siteName.replace(/[<>:"/\\|?*]/g, '_').trim();
    return `${cleanSiteName} (${siteId})`;
  }
  // Fallback to just siteId if no siteName
  return siteId;
}

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

  // Build macid index for existing files to enable macid-based tracking
  console.log('Link Labs Sync: building macid index');
  await buildMacidIndex(app, outputFolder);

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

      // Ensure site folder exists (used for assets and areas)
      const siteFolderName = createSiteFolderName(siteName, siteId);
      const siteFolder = normalizePath(`${outputFolder}/${siteFolderName}`);
      await ensureFolder(app, outputFolder); // root
      await ensureFolder(app, siteFolder);

      // Fetch and write Areas and Zones (optional)
      if (settings.syncAreas ?? true) {
        try {
          const areas = await fetchAreasForSite(siteId, creds);
          if (areas.length) {
            const areasFolder = normalizePath(`${siteFolder}/Areas`);
            await ensureFolder(app, areasFolder);
            for (const area of areas) {
              try {
                const md = areaToMarkdown(area, siteId, siteName, orgName);
                const base = chooseAreaFileName(area);
                const filePath = normalizePath(`${areasFolder}/${base}.md`);
                const result = await writeFileIfChanged(app, filePath, md);
                if (result === 'created') summary.created += 1;
                else if (result === 'updated') summary.updated += 1;
                else summary.unchanged += 1;

                // Fetch and write Zones for this area
                if (area.id) {
                  try {
                    const zones = await fetchZonesForArea(area.id, creds);
                    if (zones.length) {
                      const zonesFolder = normalizePath(`${areasFolder}/${base}_Zones`);
                      await ensureFolder(app, zonesFolder);
                      const areaLocation = area?.assetInfo?.metadata?.props?.areaLocation || undefined;
                      for (const zone of zones) {
                        try {
                          const zoneMd = zoneToMarkdown(zone, siteId, areaLocation, siteName, orgName);
                          const zoneBase = chooseZoneFileName(zone);
                          const zoneFilePath = normalizePath(`${zonesFolder}/${zoneBase}.md`);
                          const zoneResult = await writeFileIfChanged(app, zoneFilePath, zoneMd);
                          if (zoneResult === 'created') summary.created += 1;
                          else if (zoneResult === 'updated') summary.updated += 1;
                          else summary.unchanged += 1;
                        } catch (e) {
                          console.error('Link Labs Sync: failed to write a zone note', e);
                          summary.errors += 1;
                        }
                      }
                    }
                  } catch (e) {
                    console.error(`Link Labs Sync: error fetching zones for area ${area.id}`, e);
                    summary.errors += 1;
                  }
                }
              } catch (e) {
                console.error('Link Labs Sync: failed to write an area note', e);
                summary.errors += 1;
              }
            }
          }
        } catch (e) {
          console.error('Link Labs Sync: error fetching areas', e);
          summary.errors += 1;
        }
      }

      // Fetch and write Location Beacons (optional)
      if (settings.syncLocationBeacons ?? true) {
        try {
          const beacons = await fetchLocationBeaconsForSite(siteId, creds);
          if (beacons.length) {
            const beaconsFolder = normalizePath(`${siteFolder}/LocationBeacons`);
            await ensureFolder(app, beaconsFolder);
            for (const beacon of beacons) {
              try {
                // Resolve address if enabled and coordinates available
                let addressInfo = null;
                if (settings.resolveAddresses) {
                  const props = beacon?.assetInfo?.metadata?.props;
                  const lat = props?.installedLatitude;
                  const lon = props?.installedLongitude;
                  if (lat && lon) {
                    try {
                      addressInfo = await resolveAddress(lat, lon);
                      // Add small delay to avoid overwhelming the geocoding service
                      await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (e) {
                      console.warn('Link Labs Sync: address resolution failed for beacon', e);
                    }
                  }
                }

                const md = locationBeaconToMarkdown(beacon, siteId, siteName, orgName, addressInfo, settings.customFields);
                const base = chooseLocationBeaconFileName(beacon);
                const filePath = normalizePath(`${beaconsFolder}/${base}.md`);
                const llMacid = beacon?.assetInfo?.metadata?.props?.macAddress || null; // LL_macid value from frontmatter
                const result = await writeFileWithMacidTracking(app, filePath, md, llMacid);
                if (result === 'created') summary.created += 1;
                else if (result === 'updated') summary.updated += 1;
                else summary.unchanged += 1;
              } catch (e) {
                console.error('Link Labs Sync: failed to write a location beacon note', e);
                summary.errors += 1;
              }
            }
          }
        } catch (e) {
          console.error('Link Labs Sync: error fetching location beacons', e);
          summary.errors += 1;
        }
      }

      for (const asset of assets) {
        try {
          // Ensure siteId is present in asset for frontmatter mapping
          (asset as Asset).siteId = siteId;
          (asset as Asset).siteName = siteName ?? null;
          (asset as Asset).orgName = orgName ?? null;

          // Resolve address if enabled and coordinates available
          let addressInfo = null;
          if (settings.resolveAddresses) {
            const lat = asset.latitude;
            const lon = asset.longitude;
            if (lat && lon) {
              try {
                addressInfo = await resolveAddress(lat, lon);
                // Add small delay to avoid overwhelming the geocoding service
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (e) {
                console.warn('Link Labs Sync: address resolution failed for asset', e);
              }
            }
          }

          const md = assetToMarkdown(asset, addressInfo, settings.customFields);
          const base = chooseBaseFileName(asset);
          const filePath = normalizePath(`${siteFolder}/${base}.md`);
          const llMacid = asset.macAddress || null; // LL_macid value from frontmatter
          const result = await writeFileWithMacidTracking(app, filePath, md, llMacid);
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
