import type { Asset } from './types';

function val(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function normalizeIsoAssumeUtc(input: any): string | any {
  // If input is a string ISO without timezone info, assume UTC and append 'Z'
  if (typeof input === 'string') {
    const s = input.trim();
    // Match patterns like 2025-09-15T22:40:56 or 2025-09-15T22:40:56.883 (no Z or offset)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      return s + 'Z';
    }
  }
  return input;
}

function toUtcIsoZ(input: any): string {
  if (input === null || input === undefined || input === '') return '';
  const d = new Date(normalizeIsoAssumeUtc(input));
  if (isNaN(d.getTime())) return String(input);
  // toISOString() returns UTC with milliseconds; trim to seconds for consistency
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function toLocalIsoWithOffset(input: any): string {
  if (input === null || input === undefined || input === '') return '';
  const d = new Date(normalizeIsoAssumeUtc(input));
  if (isNaN(d.getTime())) return String(input);
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offH = pad(offsetMin / 60);
  const offM = pad(offsetMin % 60);
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}${sign}${offH}:${offM}`;
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
  const lastEventTimeUtc = toUtcIsoZ(asset.lastEventTime);
  const lastEventTimeLocal = toLocalIsoWithOffset(asset.lastEventTime);
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
    `LL_lastEventTime: "${lastEventTimeUtc}"`,
    `LL_lastEventTimeLocal: "${lastEventTimeLocal}"`,
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
