export interface PluginSettings {
  username: string;
  password: string;
  siteIds: string[];
  outputFolder: string; // relative to vault root
  scheduleMinutes: number; // background sync interval
  backgroundSync: boolean;
  concurrency: number; // for future use
  maxPagesPerSite: number; // cap pagination per site
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
