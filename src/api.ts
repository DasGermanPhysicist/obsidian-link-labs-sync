import { requestUrl } from 'obsidian';
import type { Asset, Credentials } from './types';

const BASE_URL = 'https://networkasset-conductor.link-labs.com/networkAsset/airfinder/v4/tags';

function basicAuthHeader({ username, password }: Credentials): string {
  // Obsidian renderer should have btoa; add fallback for safety
  const toBase64 = (s: string) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64'));
  const token = toBase64(`${username}:${password}`);
  return `Basic ${token}`;
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
