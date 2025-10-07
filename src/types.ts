export interface PluginSettings {
  username: string;
  password: string;
  siteIds: string[];
  outputFolder: string; // relative to vault root
  scheduleMinutes: number; // background sync interval
  backgroundSync: boolean;
  concurrency: number; // for future use
  maxPagesPerSite: number; // cap pagination per site
  syncAreas?: boolean; // enable/disable syncing of Areas
}

export interface Credentials {
  username: string;
  password: string;
}

export interface Asset {
  latitude?: string | number | null;
  longitude?: string | number | null;
  macAddress?: string | null;
  nodeName?: string | null;
  description?: string | null;
  categoryName?: string | null;
  groupName?: string | null;
  areaName?: string | null;
  zoneName?: string | null;
  lastEventTime?: string | null;
  siteId?: string | null;
  // Augmented fields from site metadata
  siteName?: string | null;
  orgName?: string | null;
  [key: string]: any;
}

export interface SyncSummary {
  siteId: string;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
}

export interface Area {
  id?: string | null;
  type?: string | null;
  value?: string | null; // display name
  assetInfo?: {
    metadata?: {
      props?: {
        areaLocation?: string | null; // "indoor" | "outdoor"
        geoReferenced?: string | boolean | null;
        indoorMapping?: string | null;
        locationCount?: string | number | null;
        name?: string | null; // often same as value
        points?: string | null; // "lon,lat;lon,lat;..."
        siteId?: string | null;
        zoneCount?: string | number | null;
      } | null;
      tags?: any[];
    } | null;
    enabled?: boolean;
  } | null;
}
