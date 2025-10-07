import type { Asset } from './types';

function val(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export function assetToMarkdown(asset: Asset): string {
  const latitude = val(asset.latitude);
  const longitude = val(asset.longitude);
  const mac = val(asset.macAddress);
  const nodeOrDesc = val(asset.nodeName || asset.description);
  const category = val(asset.categoryName);
  const groupName = asset.groupName === undefined ? '' : String(asset.groupName);
  const area = val(asset.areaName);
  const zone = val(asset.zoneName);
  const lastEventTime = val(asset.lastEventTime);
  const siteId = val(asset.siteId);
  const siteName = val(asset.siteName);
  const orgName = val(asset.orgName);

  const lines = [
    '---',
    `location: "${latitude},${longitude}"`,
    `LL_macid: ${mac}`,
    `LL_nodename: ${nodeOrDesc}`,
    `LL_categoryName: ${category}`,
    `groupName: ${groupName || 'null'}`,
    `LL_areaName: ${area}`,
    `LL_zoneName: ${zone}`,
    `LL_lastEventTime: ${lastEventTime}`,
    `LL_siteId: ${siteId}`,
    `LL_sitename: ${siteName}`,
    `LL_orgname: ${orgName}`,
    '---',
    '',
    '#ll_asset',
    '',
  ];

  return lines.join('\n');
}

export function chooseBaseFileName(asset: Asset): string {
  const primary = (asset.nodeName || asset.description || asset.macAddress || 'asset') as string;
  return sanitizeFileName(primary);
}

export function sanitizeFileName(name: string): string {
  const replaced = String(name)
    .replace(/[\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const limited = replaced.slice(0, 120);
  return limited || 'asset';
}
