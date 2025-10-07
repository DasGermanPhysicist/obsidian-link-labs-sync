import { App, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, LinkLabsSettingTab } from './settings';
import type { PluginSettings } from './types';
import { syncAll } from './sync';

export default class LinkLabsSyncPlugin extends Plugin {
  settings!: PluginSettings;
  private intervalId: number | null = null;
  private isSyncing = false;

  async onload() {
    await this.loadSettings();

    // Settings tab
    this.addSettingTab(new LinkLabsSettingTab(this.app, this));

    console.log('Link Labs Sync: onload');
    new Notice('Link Labs Sync: plugin loaded');

    // Commands
    this.addCommand({
      id: 'link-labs-sync-now',
      name: 'Link Labs: Sync Now',
      callback: async () => {
        await this.runSync();
      },
    });

    this.addCommand({
      id: 'link-labs-test-connection',
      name: 'Link Labs: Test Connection',
      callback: async () => {
        await this.testConnection();
      },
    });

    // Status bar
    const statusBar = this.addStatusBarItem();
    statusBar.setText('Link Labs: ready');
    this.registerInterval(window.setInterval(() => {
      // Keep status visible; no-op heartbeat
    }, 60000));

    // Ribbon icon (uses default dot icon)
    this.addRibbonIcon('link', 'Link Labs: Sync Now', async () => {
      await this.runSync();
    });

    // Start scheduler if enabled
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
      console.log('Link Labs Sync: sync already in progress, skipping');
      new Notice('Link Labs Sync: sync already in progress');
      return;
    }
    this.isSyncing = true;
    try {
      console.log('Link Labs Sync: starting sync');
      const results = await syncAll(this.app, this.settings);
      const created = results.reduce((a, r) => a + r.created, 0);
      const updated = results.reduce((a, r) => a + r.updated, 0);
      const unchanged = results.reduce((a, r) => a + r.unchanged, 0);
      const errors = results.reduce((a, r) => a + r.errors, 0);
      new Notice(`Link Labs Sync: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`);
      console.log('Link Labs Sync: finished sync', { created, updated, unchanged, errors });
    } catch (e) {
      console.error('Link Labs Sync: sync failed', e);
      new Notice('Link Labs Sync: sync failed (see console)');
    } finally {
      this.isSyncing = false;
    }
  }

  async testConnection() {
    try {
      const hasCreds = this.settings.username && this.settings.password;
      const firstSite = this.settings.siteIds?.[0];
      if (!hasCreds || !firstSite) {
        new Notice('Link Labs Sync: set username/password and at least one siteId in Settings');
        return;
      }
      new Notice('Link Labs Sync: testing connection...');
      // Reuse a one-off sync but only fetch; piggyback on runSync might write. For now, call sync and rely on idempotency.
      await this.runSync();
    } catch (e) {
      console.error('Link Labs Sync: test failed', e);
      new Notice('Link Labs Sync: test failed (see console)');
    }
  }

  async restartScheduler() {
    this.stopScheduler();
    if (this.settings.backgroundSync) {
      const intervalMs = Math.max(1, this.settings.scheduleMinutes) * 60 * 1000;
      // Run once shortly after startup
      window.setTimeout(() => this.runSync().catch(() => {}), 2000);
      this.intervalId = window.setInterval(() => this.runSync().catch(() => {}), intervalMs) as unknown as number;
      console.log('Link Labs Sync: background scheduler started', { minutes: this.settings.scheduleMinutes });
    }
  }

  stopScheduler() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
