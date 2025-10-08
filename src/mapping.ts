import type { Asset, Area, Zone, LocationBeacon, AddressInfo, CustomFieldConfig } from './types';

function val(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

// Extract value from object using dot notation path (e.g., "assetInfo.metadata.props.batteryVoltage")
function extractValueByPath(obj: any, path: string): any {
  if (!obj || !path) return null;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  
  return current;
}

// Parse custom field configuration from JSON string
function parseCustomFieldConfig(configJson: string): CustomFieldConfig | null {
  if (!configJson || !configJson.trim()) return null;
  
  try {
    const config = JSON.parse(configJson);
    return config as CustomFieldConfig;
  } catch (e) {
    console.warn('Link Labs Sync: Invalid custom field configuration JSON', e);
    return null;
  }
}

// Extract custom fields from entity using configuration
function extractCustomFields(entity: any, fieldMappings: Record<string, string> | undefined): Record<string, string> {
  const customFields: Record<string, string> = {};
  
  if (!fieldMappings || !entity) return customFields;
  
  for (const [fieldName, path] of Object.entries(fieldMappings)) {
    try {
      const value = extractValueByPath(entity, path);
      customFields[fieldName] = val(value);
    } catch (e) {
      console.warn(`Link Labs Sync: Failed to extract custom field ${fieldName} from path ${path}`, e);
      customFields[fieldName] = '';
    }
  }
  
  return customFields;
}

export function areaToMarkdown(area: Area, siteId: string, siteName?: string | null, orgName?: string | null): string {
  const props = area?.assetInfo?.metadata?.props || {} as any;
  const areaLocation = val(props.areaLocation);
  const zoneCount = val(props.zoneCount);
  const name = val(area.value || props.name || area.id || 'area');
  const points = String(props.points || '').trim();

  // location handling for outdoor: take first tuple from points if present
  let locationVal = '';
  if ((areaLocation || '').toLowerCase() === 'outdoor' && points) {
    const first = points.split(';')[0]?.trim();
    if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(first || '')) {
      const [lonStr, latStr] = first.split(',');
      const lon = (lonStr ?? '').trim();
      const lat = (latStr ?? '').trim();
      // Emit as lat,lon per requirement
      locationVal = `${lat},${lon}`;
    }
  }

  const lines = [
    '---',
    `location: "${locationVal}"`,
    `LL_areaname: ${name}`,
    `LL_areaLocation: ${areaLocation}`,
    `LL_zoneCount: ${zoneCount}`,
    `LL_siteId: ${val(siteId)}`,
    `LL_sitename: ${val(siteName)}`,
    `LL_orgname: ${val(orgName)}`,
    'tags:',
    '  - LL_area',
    '---',
    '',
  ];
  return lines.join('\n');
}

export function chooseAreaFileName(area: Area): string {
  const props = area?.assetInfo?.metadata?.props || {} as any;
  const base = (area.value || props.name || area.id || 'area') as string;
  return sanitizeFileName(base);
}

export function zoneToMarkdown(zone: Zone, siteId: string, areaLocation?: string, siteName?: string | null, orgName?: string | null): string {
  const props = zone?.assetInfo?.metadata?.props || {} as any;
  const zoneCategoryName = val(props.zoneCategoryName);
  const name = val(zone.value || props.name || zone.id || 'zone');
  const points = String(props.points || '').trim();
  const areaId = val(props.areaId);

  // location handling for outdoor zones: take first tuple from points if present and area is outdoor
  let locationVal = '';
  if ((areaLocation || '').toLowerCase() === 'outdoor' && points) {
    const first = points.split(';')[0]?.trim();
    if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(first || '')) {
      const [lonStr, latStr] = first.split(',');
      const lon = (lonStr ?? '').trim();
      const lat = (latStr ?? '').trim();
      // Emit as lat,lon per requirement
      locationVal = `${lat},${lon}`;
    }
  }

  const lines = [
    '---',
    `location: "${locationVal}"`,
    `LL_zonename: ${name}`,
    `LL_zoneCategoryName: ${zoneCategoryName}`,
    `LL_areaId: ${areaId}`,
    `LL_siteId: ${val(siteId)}`,
    `LL_sitename: ${val(siteName)}`,
    `LL_orgname: ${val(orgName)}`,
    'tags:',
    '  - LL_zone',
    '---',
    '',
  ];
  return lines.join('\n');
}

export function chooseZoneFileName(zone: Zone): string {
  const props = zone?.assetInfo?.metadata?.props || {} as any;
  const base = (zone.value || props.name || zone.id || 'zone') as string;
  return sanitizeFileName(base);
}

export function locationBeaconToMarkdown(beacon: LocationBeacon, siteId: string, siteName?: string | null, orgName?: string | null, addressInfo?: AddressInfo | null, customFieldConfig?: string | null): string {
  const props = beacon?.assetInfo?.metadata?.props || {} as any;
  const name = val(beacon.nodeName || props.name || beacon.nodeAddress || 'beacon');
  const macAddress = val(props.macAddress);
  const installedLatitude = val(props.installedLatitude);
  const installedLongitude = val(props.installedLongitude);
  const zoneId = val(props.zoneId);
  const zoneName = val(props.zoneName);

  // location handling: use installedLatitude and installedLongitude when available
  let locationVal = '';
  if (installedLatitude && installedLongitude) {
    locationVal = `${installedLatitude},${installedLongitude}`;
  }

  const lines = [
    '---',
    `location: "${locationVal}"`,
    `LL_name: ${name}`,
    `LL_macid: ${macAddress}`,
    `LL_siteId: ${val(siteId)}`,
    `LL_sitename: ${val(siteName)}`,
    `LL_orgname: ${val(orgName)}`,
    `LL_zoneId: ${zoneId}`,
    `LL_zoneName: ${zoneName}`,
  ];

  // Add address fields if available
  if (addressInfo) {
    lines.push(`LL_road: ${val(addressInfo.road)}`);
    lines.push(`LL_city: ${val(addressInfo.city)}`);
    lines.push(`LL_county: ${val(addressInfo.county)}`);
    lines.push(`LL_state: ${val(addressInfo.state)}`);
    lines.push(`LL_postcode: ${val(addressInfo.postcode)}`);
    lines.push(`LL_country: ${val(addressInfo.country)}`);
    lines.push(`LL_address: ${val(addressInfo.display_name)}`);
  }

  // Add custom fields if configured
  if (customFieldConfig) {
    const config = parseCustomFieldConfig(customFieldConfig);
    if (config?.locationBeacons) {
      const customFields = extractCustomFields(beacon, config.locationBeacons);
      for (const [fieldName, value] of Object.entries(customFields)) {
        lines.push(`${fieldName}: ${value}`);
      }
    }
  }

  lines.push('tags:', '  - LL_locationbeacon', '---', '');
  return lines.join('\n');
}

export function chooseLocationBeaconFileName(beacon: LocationBeacon): string {
  const props = beacon?.assetInfo?.metadata?.props || {} as any;
  const base = (beacon.nodeName || props.name || beacon.nodeAddress || 'beacon') as string;
  const macAddress = props.macAddress;
  
  // If we have a macAddress, append last 4 characters to make filename unique
  if (macAddress && macAddress.length >= 4) {
    const suffix = macAddress.slice(-5).replace(':', ''); // Last 4 chars without colon
    return sanitizeFileName(`${base}_${suffix}`);
  }
  
  return sanitizeFileName(base);
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

export function assetToMarkdown(asset: Asset, addressInfo?: AddressInfo | null, customFieldConfig?: string | null): string {
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
  const field1 = val((asset as any).field1);
  const field2 = val((asset as any).field2);

  const lines = [
    '---',
    `location: "${latitude},${longitude}"`,
    `LL_macid: ${mac}`,
    `LL_name: ${nodeOrDesc}`,
    `LL_categoryName: ${category}`,
    `LL_groupName: ${groupName || 'null'}`,
    `LL_areaName: ${area}`,
    `LL_zoneName: ${zone}`,
    `LL_lastEventTime: "${lastEventTimeUtc}"`,
    `LL_lastEventTimeLocal: "${lastEventTimeLocal}"`,
    `LL_siteId: ${siteId}`,
    `LL_sitename: ${siteName}`,
    `LL_orgname: ${orgName}`,
    `LL_field1: ${field1}`,
    `LL_field2: ${field2}`,
  ];

  // Add address fields if available
  if (addressInfo) {
    lines.push(`LL_road: ${val(addressInfo.road)}`);
    lines.push(`LL_city: ${val(addressInfo.city)}`);
    lines.push(`LL_county: ${val(addressInfo.county)}`);
    lines.push(`LL_state: ${val(addressInfo.state)}`);
    lines.push(`LL_postcode: ${val(addressInfo.postcode)}`);
    lines.push(`LL_country: ${val(addressInfo.country)}`);
    lines.push(`LL_address: ${val(addressInfo.display_name)}`);
  }

  // Add custom fields if configured
  if (customFieldConfig) {
    const config = parseCustomFieldConfig(customFieldConfig);
    if (config?.assets) {
      const customFields = extractCustomFields(asset, config.assets);
      for (const [fieldName, value] of Object.entries(customFields)) {
        lines.push(`${fieldName}: ${value}`);
      }
    }
  }

  lines.push('tags:', '  - LL_asset', '---', '');

  return lines.join('\n');
}

export function chooseBaseFileName(asset: Asset): string {
  const primary = (asset.nodeName || asset.description || 'asset') as string;
  const macAddress = asset.macAddress;
  
  // If we have a macAddress, append last 4 characters to make filename unique
  if (macAddress && macAddress.length >= 4) {
    const suffix = macAddress.slice(-5).replace(':', ''); // Last 4 chars without colon
    return sanitizeFileName(`${primary}_${suffix}`);
  }
  
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
