/*
THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
*/
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LinkLabsSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  username: "",
  password: "",
  siteIds: [],
  outputFolder: "LinkLabs",
  scheduleMinutes: 60,
  backgroundSync: true,
  concurrency: 2,
  maxPagesPerSite: 1,
  syncAreas: true
};
var LinkLabsSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Link Labs Sync Settings" });
    new import_obsidian.Setting(containerEl).setName("Username").setDesc("Your Link Labs account username (email).").addText(
      (text) => text.setPlaceholder("name@example.com").setValue(this.plugin.settings.username).onChange(async (value) => {
        this.plugin.settings.username = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Password").setDesc("Stored in plugin data. Consider vault security.").addText((text) => {
      text.setPlaceholder("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022").setValue(this.plugin.settings.password).onChange(async (value) => {
        this.plugin.settings.password = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "password";
    });
    new import_obsidian.Setting(containerEl).setName("Site IDs").setDesc("Comma-separated list of site IDs to sync").addText(
      (text) => text.setPlaceholder("siteId1,siteId2,...").setValue(this.plugin.settings.siteIds.join(",")).onChange(async (value) => {
        this.plugin.settings.siteIds = value.split(",").map((s) => s.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Output folder").setDesc("Folder under your vault where notes will be written").addText(
      (text) => text.setPlaceholder("LinkLabs").setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
        this.plugin.settings.outputFolder = value.trim() || "LinkLabs";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Sync Areas").setDesc("Also fetch and write Area notes under each site").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.syncAreas ?? true).onChange(async (value) => {
        this.plugin.settings.syncAreas = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Background sync").setDesc("Run automatic sync on an interval").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.backgroundSync).onChange(async (value) => {
        this.plugin.settings.backgroundSync = value;
        await this.plugin.saveSettings();
        await this.plugin.restartScheduler();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Sync interval (minutes)").setDesc("How often to run background sync (default 60)").addText(
      (text) => text.setPlaceholder("60").setValue(String(this.plugin.settings.scheduleMinutes)).onChange(async (value) => {
        const n = Number(value);
        if (!Number.isNaN(n) && n > 0) {
          this.plugin.settings.scheduleMinutes = Math.floor(n);
          await this.plugin.saveSettings();
          await this.plugin.restartScheduler();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Max pages per site").setDesc("Limit pagination per site during sync (default 1 for testing)").addText(
      (text) => text.setPlaceholder("1").setValue(String(this.plugin.settings.maxPagesPerSite)).onChange(async (value) => {
        const n = Number(value);
        if (!Number.isNaN(n) && n > 0) {
          this.plugin.settings.maxPagesPerSite = Math.floor(n);
          await this.plugin.saveSettings();
        }
      })
    );
  }
};

// src/sync.ts
var import_obsidian4 = require("obsidian");

// src/api.ts
var import_obsidian2 = require("obsidian");
var BASE_URL = "https://networkasset-conductor.link-labs.com/networkAsset/airfinder/v4/tags";
var SITE_URL = "https://networkasset-conductor.link-labs.com/networkAsset/airfinder/site";
var AREAS_URL = "https://networkasset-conductor.link-labs.com/networkAsset/airfinder/areas";
function basicAuthHeader({ username, password }) {
  const toBase64 = (s) => typeof btoa === "function" ? btoa(s) : Buffer.from(s, "utf8").toString("base64");
  const token = toBase64(`${username}:${password}`);
  return `Basic ${token}`;
}
async function fetchAreasForSite(siteId, creds) {
  const url = `${AREAS_URL}?siteId=${encodeURIComponent(siteId)}`;
  const headers = {
    Authorization: basicAuthHeader(creds),
    Accept: "application/json"
  };
  const res = await requestWithRetry(url, headers, { method: "GET" });
  if (res.status >= 400) {
    console.warn(`Link Labs Sync: areas ${res.status} for ${siteId}`);
    return [];
  }
  let data = null;
  try {
    data = typeof res.json === "function" ? await res.json() : JSON.parse(res.text || "[]");
  } catch (e) {
    data = [];
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
  return list;
}
async function fetchSiteInfo(siteId, creds) {
  const url = `${SITE_URL}/${encodeURIComponent(siteId)}`;
  const headers = {
    Authorization: basicAuthHeader(creds),
    Accept: "application/json"
  };
  const res = await requestWithRetry(url, headers, { method: "GET" });
  if (res.status >= 400) {
    console.warn(`Link Labs Sync: site info ${res.status} for ${siteId}`);
    return { siteName: null, orgName: null };
  }
  let data = null;
  try {
    data = typeof res.json === "function" ? await res.json() : JSON.parse(res.text || "null");
  } catch (e) {
    data = null;
  }
  const siteName = data?.value ?? null;
  const orgName = data?.assetInfo?.metadata?.props?.organizationName ?? null;
  return { siteName, orgName };
}
async function requestWithRetry(url, headers, options, maxRetries = 5) {
  let attempt = 0;
  let delayMs = 300;
  while (true) {
    try {
      const res = await (0, import_obsidian2.requestUrl)({ url, headers, method: options.method || "GET" });
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= maxRetries) return res;
        await delay(delayMsWithJitter(delayMs));
        attempt++;
        delayMs *= 2;
        continue;
      }
      return res;
    } catch (e) {
      const msg = String(e?.message || e);
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
async function fetchAssetsForSite(siteId, creds, maxPages = Infinity) {
  const all = [];
  let page = 1;
  while (page <= maxPages) {
    const url = `${BASE_URL}?siteId=${encodeURIComponent(siteId)}&groupBy=none&page=${page}&sortBy=lastEventTime&sort=dsc`;
    const headers = {
      Authorization: basicAuthHeader(creds),
      Accept: "application/json"
    };
    console.log("Link Labs Sync: fetching", { siteId, page, url });
    const res = await requestWithRetry(url, headers, { method: "GET" });
    if (res.status >= 400) {
      throw new Error(`API ${res.status}: ${res.text?.slice(0, 200)}`);
    }
    let data;
    try {
      data = typeof res.json === "function" ? await res.json() : JSON.parse(res.text || "[]");
    } catch (e) {
      data = [];
    }
    const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
    if (!list.length) {
      console.log("Link Labs Sync: no items on page", { siteId, page });
      break;
    }
    all.push(...list);
    page += 1;
    await delay(150);
  }
  return all;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function delayMsWithJitter(base) {
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

// src/mapping.ts
function val(v) {
  if (v === null || v === void 0) return "";
  return String(v);
}
function areaToMarkdown(area, siteId) {
  const props = area?.assetInfo?.metadata?.props || {};
  const areaLocation = val(props.areaLocation);
  const zoneCount = val(props.zoneCount);
  const name = val(area.value || props.name || area.id || "area");
  const points = String(props.points || "").trim();
  let locationVal = "";
  if ((areaLocation || "").toLowerCase() === "outdoor" && points) {
    const first = points.split(";")[0]?.trim();
    if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(first || "")) {
      const [lonStr, latStr] = first.split(",");
      const lon = (lonStr ?? "").trim();
      const lat = (latStr ?? "").trim();
      locationVal = `${lat},${lon}`;
    }
  }
  const lines = [
    "---",
    `location: "${locationVal}"`,
    `LL_areaname: ${name}`,
    `LL_areaLocation: ${areaLocation}`,
    `LL_zoneCount: ${zoneCount}`,
    `LL_siteId: ${val(siteId)}`,
    "---",
    "",
    "#LL_area",
    ""
  ];
  return lines.join("\n");
}
function chooseAreaFileName(area) {
  const props = area?.assetInfo?.metadata?.props || {};
  const base = area.value || props.name || area.id || "area";
  return sanitizeFileName(base);
}
function normalizeIsoAssumeUtc(input) {
  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      return s + "Z";
    }
  }
  return input;
}
function toUtcIsoZ(input) {
  if (input === null || input === void 0 || input === "") return "";
  const d = new Date(normalizeIsoAssumeUtc(input));
  if (isNaN(d.getTime())) return String(input);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
function toLocalIsoWithOffset(input) {
  if (input === null || input === void 0 || input === "") return "";
  const d = new Date(normalizeIsoAssumeUtc(input));
  if (isNaN(d.getTime())) return String(input);
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const offH = pad(offsetMin / 60);
  const offM = pad(offsetMin % 60);
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}${sign}${offH}:${offM}`;
}
function assetToMarkdown(asset) {
  const latitude = val(asset.latitude);
  const longitude = val(asset.longitude);
  const mac = val(asset.macAddress);
  const nodeOrDesc = val(asset.nodeName || asset.description);
  const category = val(asset.categoryName);
  const groupName = asset.groupName === void 0 ? "" : String(asset.groupName);
  const area = val(asset.areaName);
  const zone = val(asset.zoneName);
  const lastEventTimeUtc = toUtcIsoZ(asset.lastEventTime);
  const lastEventTimeLocal = toLocalIsoWithOffset(asset.lastEventTime);
  const siteId = val(asset.siteId);
  const siteName = val(asset.siteName);
  const orgName = val(asset.orgName);
  const lines = [
    "---",
    `location: "${latitude},${longitude}"`,
    `LL_macid: ${mac}`,
    `LL_nodename: ${nodeOrDesc}`,
    `LL_categoryName: ${category}`,
    `LL_groupName: ${groupName || "null"}`,
    `LL_areaName: ${area}`,
    `LL_zoneName: ${zone}`,
    `LL_lastEventTime: "${lastEventTimeUtc}"`,
    `LL_lastEventTimeLocal: "${lastEventTimeLocal}"`,
    `LL_siteId: ${siteId}`,
    `LL_sitename: ${siteName}`,
    `LL_orgname: ${orgName}`,
    "---",
    "",
    "#LL_asset",
    ""
  ];
  return lines.join("\n");
}
function chooseBaseFileName(asset) {
  const primary = asset.nodeName || asset.description || asset.macAddress || "asset";
  return sanitizeFileName(primary);
}
function sanitizeFileName(name) {
  const replaced = String(name).replace(/[\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  const limited = replaced.slice(0, 120);
  return limited || "asset";
}

// src/fs.ts
var import_obsidian3 = require("obsidian");
async function ensureFolder(app, folderPath) {
  const normalized = (0, import_obsidian3.normalizePath)(folderPath);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing && existing instanceof import_obsidian3.TFolder) return existing;
  if (existing && existing instanceof import_obsidian3.TFile) throw new Error(`Path exists as a file: ${normalized}`);
  await app.vault.createFolder(normalized);
  const created = app.vault.getAbstractFileByPath(normalized);
  if (created && created instanceof import_obsidian3.TFolder) return created;
  throw new Error(`Failed to create folder: ${normalized}`);
}
async function writeFileIfChanged(app, filePath, content) {
  const normalized = (0, import_obsidian3.normalizePath)(filePath);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing && existing instanceof import_obsidian3.TFile) {
    const current = await app.vault.read(existing);
    if (current === content) return "unchanged";
    await app.vault.modify(existing, content);
    return "updated";
  }
  await app.vault.create(normalized, content);
  return "created";
}

// src/sync.ts
async function syncAll(app, settings) {
  const { username, password, siteIds, outputFolder } = settings;
  if (!username || !password || !siteIds?.length) {
    new import_obsidian4.Notice("Link Labs Sync: Missing credentials or site IDs in settings");
    console.warn("Link Labs Sync: settings incomplete", {
      hasUsername: Boolean(username),
      hasPassword: Boolean(password),
      siteIdsCount: siteIds?.length || 0
    });
    return [];
  }
  const summaries = [];
  console.log("Link Labs Sync: starting syncAll", { siteIdsCount: siteIds.length, outputFolder });
  for (const siteId of siteIds) {
    const summary = { siteId, created: 0, updated: 0, unchanged: 0, errors: 0 };
    try {
      const creds = { username, password };
      console.log("Link Labs Sync: fetching assets for site", { siteId });
      const assets = await fetchAssetsForSite(siteId, creds, settings.maxPagesPerSite ?? 1);
      console.log("Link Labs Sync: fetched count", { siteId, count: assets.length });
      const { siteName, orgName } = await fetchSiteInfo(siteId, creds);
      if (assets.length === 0) {
        new import_obsidian4.Notice(`Link Labs Sync: no assets returned for site ${siteId}`);
      }
      const siteFolder = (0, import_obsidian4.normalizePath)(`${outputFolder}/${siteId}`);
      await ensureFolder(app, outputFolder);
      await ensureFolder(app, siteFolder);
      if (settings.syncAreas ?? true) {
        try {
          const areas = await fetchAreasForSite(siteId, creds);
          if (areas.length) {
            const areasFolder = (0, import_obsidian4.normalizePath)(`${siteFolder}/Areas`);
            await ensureFolder(app, areasFolder);
            for (const area of areas) {
              try {
                const md = areaToMarkdown(area, siteId);
                const base = chooseAreaFileName(area);
                const filePath = (0, import_obsidian4.normalizePath)(`${areasFolder}/${base}.md`);
                const result = await writeFileIfChanged(app, filePath, md);
                if (result === "created") summary.created += 1;
                else if (result === "updated") summary.updated += 1;
                else summary.unchanged += 1;
              } catch (e) {
                console.error("Link Labs Sync: failed to write an area note", e);
                summary.errors += 1;
              }
            }
          }
        } catch (e) {
          console.error("Link Labs Sync: error fetching areas", e);
          summary.errors += 1;
        }
      }
      for (const asset of assets) {
        try {
          asset.siteId = siteId;
          asset.siteName = siteName ?? null;
          asset.orgName = orgName ?? null;
          const md = assetToMarkdown(asset);
          const base = chooseBaseFileName(asset);
          const filePath = (0, import_obsidian4.normalizePath)(`${siteFolder}/${base}.md`);
          const result = await writeFileIfChanged(app, filePath, md);
          if (result === "created") summary.created += 1;
          else if (result === "updated") summary.updated += 1;
          else summary.unchanged += 1;
        } catch (e) {
          console.error("Link Labs Sync: failed to write an asset note", e);
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

// src/main.ts
var LinkLabsSyncPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.intervalId = null;
    this.isSyncing = false;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new LinkLabsSettingTab(this.app, this));
    console.log("Link Labs Sync: onload");
    new import_obsidian5.Notice("Link Labs Sync: plugin loaded");
    this.addCommand({
      id: "link-labs-sync-now",
      name: "Link Labs: Sync Now",
      callback: async () => {
        await this.runSync();
      }
    });
    this.addCommand({
      id: "link-labs-test-connection",
      name: "Link Labs: Test Connection",
      callback: async () => {
        await this.testConnection();
      }
    });
    const statusBar = this.addStatusBarItem();
    statusBar.setText("Link Labs: ready");
    this.registerInterval(window.setInterval(() => {
    }, 6e4));
    this.addRibbonIcon("link", "Link Labs: Sync Now", async () => {
      await this.runSync();
    });
    await this.restartScheduler();
  }
  onunload() {
    this.stopScheduler();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async runSync() {
    if (this.isSyncing) {
      console.log("Link Labs Sync: sync already in progress, skipping");
      new import_obsidian5.Notice("Link Labs Sync: sync already in progress");
      return;
    }
    this.isSyncing = true;
    try {
      console.log("Link Labs Sync: starting sync");
      const results = await syncAll(this.app, this.settings);
      const created = results.reduce((a, r) => a + r.created, 0);
      const updated = results.reduce((a, r) => a + r.updated, 0);
      const unchanged = results.reduce((a, r) => a + r.unchanged, 0);
      const errors = results.reduce((a, r) => a + r.errors, 0);
      new import_obsidian5.Notice(`Link Labs Sync: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`);
      console.log("Link Labs Sync: finished sync", { created, updated, unchanged, errors });
    } catch (e) {
      console.error("Link Labs Sync: sync failed", e);
      new import_obsidian5.Notice("Link Labs Sync: sync failed (see console)");
    } finally {
      this.isSyncing = false;
    }
  }
  async testConnection() {
    try {
      const hasCreds = this.settings.username && this.settings.password;
      const firstSite = this.settings.siteIds?.[0];
      if (!hasCreds || !firstSite) {
        new import_obsidian5.Notice("Link Labs Sync: set username/password and at least one siteId in Settings");
        return;
      }
      new import_obsidian5.Notice("Link Labs Sync: testing connection...");
      await this.runSync();
    } catch (e) {
      console.error("Link Labs Sync: test failed", e);
      new import_obsidian5.Notice("Link Labs Sync: test failed (see console)");
    }
  }
  async restartScheduler() {
    this.stopScheduler();
    if (this.settings.backgroundSync) {
      const intervalMs = Math.max(1, this.settings.scheduleMinutes) * 60 * 1e3;
      window.setTimeout(() => this.runSync().catch(() => {
      }), 2e3);
      this.intervalId = window.setInterval(() => this.runSync().catch(() => {
      }), intervalMs);
      console.log("Link Labs Sync: background scheduler started", { minutes: this.settings.scheduleMinutes });
    }
  }
  stopScheduler() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
