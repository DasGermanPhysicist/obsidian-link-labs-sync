import { App, PluginSettingTab, Setting } from 'obsidian';
import type LinkLabsSyncPlugin from './main';
import type { PluginSettings } from './types';

export const DEFAULT_SETTINGS: PluginSettings = {
  username: '',
  password: '',
  siteIds: [],
  outputFolder: 'LinkLabs',
  scheduleMinutes: 60,
  backgroundSync: true,
  concurrency: 2,
  maxPagesPerSite: 1,
};

export class LinkLabsSettingTab extends PluginSettingTab {
  plugin: LinkLabsSyncPlugin;

  constructor(app: App, plugin: LinkLabsSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Link Labs Sync Settings' });

    new Setting(containerEl)
      .setName('Username')
      .setDesc('Your Link Labs account username (email).')
      .addText((text) =>
        text
          .setPlaceholder('name@example.com')
          .setValue(this.plugin.settings.username)
          .onChange(async (value) => {
            this.plugin.settings.username = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Password')
      .setDesc('Stored in plugin data. Consider vault security.')
      .addText((text) => {
        text
          .setPlaceholder('••••••••')
          .setValue(this.plugin.settings.password)
          .onChange(async (value) => {
            this.plugin.settings.password = value;
            await this.plugin.saveSettings();
          });
        // Mask as password field
        text.inputEl.type = 'password';
      });

    new Setting(containerEl)
      .setName('Site IDs')
      .setDesc('Comma-separated list of site IDs to sync')
      .addText((text) =>
        text
          .setPlaceholder('siteId1,siteId2,...')
          .setValue(this.plugin.settings.siteIds.join(','))
          .onChange(async (value) => {
            this.plugin.settings.siteIds = value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Output folder')
      .setDesc('Folder under your vault where notes will be written')
      .addText((text) =>
        text
          .setPlaceholder('LinkLabs')
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim() || 'LinkLabs';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Background sync')
      .setDesc('Run automatic sync on an interval')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.backgroundSync).onChange(async (value) => {
          this.plugin.settings.backgroundSync = value;
          await this.plugin.saveSettings();
          await this.plugin.restartScheduler();
        })
      );

    new Setting(containerEl)
      .setName('Sync interval (minutes)')
      .setDesc('How often to run background sync (default 60)')
      .addText((text) =>
        text
          .setPlaceholder('60')
          .setValue(String(this.plugin.settings.scheduleMinutes))
          .onChange(async (value) => {
            const n = Number(value);
            if (!Number.isNaN(n) && n > 0) {
              this.plugin.settings.scheduleMinutes = Math.floor(n);
              await this.plugin.saveSettings();
              await this.plugin.restartScheduler();
            }
          })
      );

    new Setting(containerEl)
      .setName('Max pages per site')
      .setDesc('Limit pagination per site during sync (default 1 for testing)')
      .addText((text) =>
        text
          .setPlaceholder('1')
          .setValue(String(this.plugin.settings.maxPagesPerSite))
          .onChange(async (value) => {
            const n = Number(value);
            if (!Number.isNaN(n) && n > 0) {
              this.plugin.settings.maxPagesPerSite = Math.floor(n);
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
