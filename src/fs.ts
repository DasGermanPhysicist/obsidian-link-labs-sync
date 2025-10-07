import { App, normalizePath, TFile, TFolder } from 'obsidian';

export async function ensureFolder(app: App, folderPath: string): Promise<TFolder> {
  const normalized = normalizePath(folderPath);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing && existing instanceof TFolder) return existing;
  if (existing && existing instanceof TFile) throw new Error(`Path exists as a file: ${normalized}`);
  await app.vault.createFolder(normalized);
  const created = app.vault.getAbstractFileByPath(normalized);
  if (created && created instanceof TFolder) return created;
  throw new Error(`Failed to create folder: ${normalized}`);
}

export async function readFileIfExists(app: App, filePath: string): Promise<string | null> {
  const normalized = normalizePath(filePath);
  const file = app.vault.getAbstractFileByPath(normalized);
  if (file && file instanceof TFile) {
    return app.vault.read(file);
  }
  return null;
}

export async function writeFileIfChanged(app: App, filePath: string, content: string): Promise<'created' | 'updated' | 'unchanged'> {
  const normalized = normalizePath(filePath);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing && existing instanceof TFile) {
    const current = await app.vault.read(existing);
    if (current === content) return 'unchanged';
    await app.vault.modify(existing, content);
    return 'updated';
  }
  await app.vault.create(normalized, content);
  return 'created';
}
