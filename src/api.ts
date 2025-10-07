import { requestUrl } from 'obsidian';
import type { Asset, Credentials, Area, Zone, LocationBeacon, AddressInfo } from './types';

const BASE_URL = 'https://networkasset-conductor.link-labs.com/networkAsset/airfinder/v4/tags';
const SITE_URL = 'https://networkasset-conductor.link-labs.com/networkAsset/airfinder/site';
const AREAS_URL = 'https://networkasset-conductor.link-labs.com/networkAsset/airfinder/areas';
const ZONES_URL = 'https://networkasset-conductor.link-labs.com/networkAsset/airfinder/zones';
const LOCATIONS_URL = 'https://networkasset-conductor.link-labs.com/networkAsset/airfinder/locations';
const GEOCODE_URL = 'https://api.george.airfinder.com/reverse.php';

function basicAuthHeader({ username, password }: Credentials): string {
  // Obsidian renderer should have btoa; add fallback for safety
  const toBase64 = (s: string) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64'));
  const token = toBase64(`${username}:${password}`);
  return `Basic ${token}`;
}

export async function fetchAreasForSite(siteId: string, creds: Credentials): Promise<Area[]> {
  const url = `${AREAS_URL}?siteId=${encodeURIComponent(siteId)}`;
  const headers = {
    Authorization: basicAuthHeader(creds),
    Accept: 'application/json',
  } as Record<string, string>;

  const res = await requestWithRetry(url, headers, { method: 'GET' });
  if (res.status >= 400) {
    console.warn(`Link Labs Sync: areas ${res.status} for ${siteId}`);
    return [];
  }
  let data: any = null;
  try {
    data = typeof res.json === 'function' ? await res.json() : JSON.parse(res.text || '[]');
  } catch (e) {
    data = [];
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : [];
  return list as Area[];
}

export async function fetchZonesForArea(areaId: string, creds: Credentials): Promise<Zone[]> {
  const url = `${ZONES_URL}?areaId=${encodeURIComponent(areaId)}`;
  const headers = {
    Authorization: basicAuthHeader(creds),
    Accept: 'application/json',
  } as Record<string, string>;

  const res = await requestWithRetry(url, headers, { method: 'GET' });
  if (res.status >= 400) {
    console.warn(`Link Labs Sync: zones ${res.status} for area ${areaId}`);
    return [];
  }
  let data: any = null;
  try {
    data = typeof res.json === 'function' ? await res.json() : JSON.parse(res.text || '[]');
  } catch (e) {
    data = [];
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : [];
  return list as Zone[];
}

export async function fetchLocationBeaconsForSite(siteId: string, creds: Credentials): Promise<LocationBeacon[]> {
  const url = `${LOCATIONS_URL}?siteId=${encodeURIComponent(siteId)}`;
  const headers = {
    Authorization: basicAuthHeader(creds),
    Accept: 'application/json',
  } as Record<string, string>;

  const res = await requestWithRetry(url, headers, { method: 'GET' });
  if (res.status >= 400) {
    console.warn(`Link Labs Sync: location beacons ${res.status} for site ${siteId}`);
    return [];
  }
  let data: any = null;
  try {
    data = typeof res.json === 'function' ? await res.json() : JSON.parse(res.text || '[]');
  } catch (e) {
    data = [];
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : [];
  return list as LocationBeacon[];
}

export async function fetchSiteInfo(siteId: string, creds: Credentials): Promise<{ siteName: string | null; orgName: string | null }> {
  const url = `${SITE_URL}/${encodeURIComponent(siteId)}`;
  const headers = {
    Authorization: basicAuthHeader(creds),
    Accept: 'application/json',
  } as Record<string, string>;

  const res = await requestWithRetry(url, headers, { method: 'GET' });
  if (res.status >= 400) {
    // Non-fatal: return nulls so sync can proceed
    console.warn(`Link Labs Sync: site info ${res.status} for ${siteId}`);
    return { siteName: null, orgName: null };
  }

  let data: any = null;
  try {
    data = typeof res.json === 'function' ? await res.json() : JSON.parse(res.text || 'null');
  } catch (e) {
    data = null;
  }

  const siteName = (data?.value ?? null) as string | null;
  const orgName = (data?.assetInfo?.metadata?.props?.organizationName ?? null) as string | null;
  return { siteName, orgName };
}

async function requestWithRetry(url: string, headers: Record<string, string>, options: { method?: string }, maxRetries = 5): Promise<ReturnType<typeof requestUrl>> {
  let attempt = 0;
  let delayMs = 300;
  while (true) {
    try {
      const res = await requestUrl({ url, headers, method: options.method || 'GET' });
      // Retry on 429/5xx
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= maxRetries) return res;
        await delay(delayMsWithJitter(delayMs));
        attempt++;
        delayMs *= 2;
        continue;
      }
      return res;
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Retry on transient network errors like ERR_NETWORK_IO_SUSPENDED
      if (/ERR_NETWORK_IO_SUSPENDED|ECONNRESET|ENETDOWN|ETIMEDOUT|EAI_AGAIN/i.test(msg) && attempt < maxRetries) {
        await delay(delayMsWithJitter(delayMs));
        attempt++;
        delayMs *= 2;
        continue;
      }
      throw e;
    }
  }
}

export async function fetchAssetsForSite(siteId: string, creds: Credentials, maxPages = Infinity): Promise<Asset[]> {
  const all: Asset[] = [];
  let page = 1;
  while (page <= maxPages) {
    const url = `${BASE_URL}?siteId=${encodeURIComponent(siteId)}&groupBy=none&page=${page}&sortBy=lastEventTime&sort=dsc`;
    const headers = {
      Authorization: basicAuthHeader(creds),
      Accept: 'application/json',
    } as Record<string, string>;

    console.log('Link Labs Sync: fetching', { siteId, page, url });
    const res = await requestWithRetry(url, headers, { method: 'GET' });

    if (res.status >= 400) {
      throw new Error(`API ${res.status}: ${res.text?.slice(0, 200)}`);
    }

    let data: any;
    try {
      data = typeof res.json === 'function' ? await res.json() : JSON.parse(res.text || '[]');
    } catch (e) {
      data = [];
    }

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
      ? data.data
      : [];

    if (!list.length) {
      console.log('Link Labs Sync: no items on page', { siteId, page });
      break;
    }
    all.push(...(list as Asset[]));
    page += 1;
    await delay(150);
  }
  return all;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayMsWithJitter(base: number) {
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

export async function resolveAddress(latitude: string | number, longitude: string | number): Promise<AddressInfo | null> {
  if (!latitude || !longitude) return null;
  
  const lat = String(latitude);
  const lon = String(longitude);
  const url = `${GEOCODE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&format=jsonv2`;
  
  try {
    const res = await requestWithRetry(url, {}, { method: 'GET' });
    if (res.status >= 400) {
      console.warn(`Link Labs Sync: address resolution ${res.status} for ${lat},${lon}`);
      return null;
    }
    
    let data: any = null;
    try {
      data = typeof res.json === 'function' ? await res.json() : JSON.parse(res.text || 'null');
    } catch (e) {
      console.warn('Link Labs Sync: failed to parse address resolution response', e);
      return null;
    }
    
    if (!data || !data.address) return null;
    
    const address = data.address;
    return {
      road: address.road || null,
      city: address.city || null,
      county: address.county || null,
      state: address.state || null,
      postcode: address.postcode || null,
      country: address.country || null,
      display_name: data.display_name || null,
    };
  } catch (e) {
    console.warn('Link Labs Sync: address resolution failed', e);
    return null;
  }
}
