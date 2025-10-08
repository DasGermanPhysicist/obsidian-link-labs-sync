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
  syncLocationBeacons?: boolean; // enable/disable syncing of Location Beacons
  resolveAddresses?: boolean; // enable/disable address resolution from coordinates
  customFields?: string; // JSON configuration for custom field extraction
}

export interface Credentials {
  username: string;
  password: string;
}

export interface AddressInfo {
  road?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  display_name?: string | null;
}

export interface CustomFieldConfig {
  assets?: Record<string, string>;
  locationBeacons?: Record<string, string>;
  areas?: Record<string, string>;
  zones?: Record<string, string>;
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

export interface Zone {
  id?: string | null;
  type?: string | null;
  value?: string | null; // display name
  assetInfo?: {
    metadata?: {
      props?: {
        areaId?: string | null;
        name?: string | null; // often same as value
        points?: string | null; // "lon,lat;lon,lat;..."
        siteId?: string | null;
        zoneCategoryId?: string | null;
        zoneCategoryName?: string | null;
      } | null;
      tags?: any[];
    } | null;
    enabled?: boolean;
  } | null;
}

export interface LocationBeacon {
  nodeAddress?: string | null;
  nodeName?: string | null;
  initialDetectionTime?: string | null;
  registrationTime?: string | null;
  registrationToken?: string | null;
  assetInfo?: {
    metadata?: {
      props?: {
        installedLatitude?: string | null;
        installedLongitude?: string | null;
        latitude?: string | null;
        longitude?: string | null;
        macAddress?: string | null;
        name?: string | null;
        siteId?: string | null;
        siteName?: string | null;
        areaId?: string | null;
        areaName?: string | null;
        zoneId?: string | null;
        zoneName?: string | null;
        lastEventTime?: string | null;
        deviceType?: string | null;
        batteryVoltage?: string | null;
        batteryStatus?: string | null;
        [key: string]: any;
      } | null;
      tags?: any[];
    } | null;
    enabled?: boolean;
  } | null;
}
