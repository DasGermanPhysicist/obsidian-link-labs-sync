import { App, normalizePath, TFile, TFolder } from 'obsidian';

// In-memory index of macid -> file path for performance
const macidIndex = new Map<string, string>();

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

// Extract LL_macid from frontmatter
function extractMacidFromContent(content: string): string | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;
  
  const frontmatter = frontmatterMatch[1];
  const macidMatch = frontmatter.match(/^LL_macid:\s*(.+)$/m);
  return macidMatch ? macidMatch[1].trim() : null;
}

// Build index of macid -> file path for a folder
export async function buildMacidIndex(app: App, folderPath: string): Promise<void> {
  const folder = app.vault.getAbstractFileByPath(normalizePath(folderPath));
  if (!folder || !(folder instanceof TFolder)) return;

  const processFile = async (file: TFile) => {
    if (!file.path.endsWith('.md')) return;
    
    try {
      const content = await app.vault.read(file);
      const macid = extractMacidFromContent(content);
      if (macid) {
        macidIndex.set(macid, file.path);
      }
    } catch (e) {
      console.warn(`Link Labs Sync: failed to read file for macid indexing: ${file.path}`, e);
    }
  };

  const processFolder = async (folder: TFolder) => {
    for (const child of folder.children) {
      if (child instanceof TFile) {
        await processFile(child);
      } else if (child instanceof TFolder) {
        await processFolder(child);
      }
    }
  };

  await processFolder(folder);
}

// Find existing file by macid
export async function findFileByMacid(app: App, macid: string): Promise<TFile | null> {
  if (!macid) return null;
  
  const filePath = macidIndex.get(macid);
  if (!filePath) return null;
  
  const file = app.vault.getAbstractFileByPath(filePath);
  return (file instanceof TFile) ? file : null;
}

// Update macid index when files are created/updated
export function updateMacidIndex(filePath: string, macid: string | null): void {
  if (macid) {
    macidIndex.set(macid, filePath);
  }
}

// Remove from macid index when files are deleted/renamed
export function removeMacidIndex(filePath: string, macid?: string): void {
  if (macid) {
    macidIndex.delete(macid);
  } else {
    // If we don't know the macid, search by file path
    for (const [key, value] of macidIndex.entries()) {
      if (value === filePath) {
        macidIndex.delete(key);
        break;
      }
    }
  }
}

// Write file with macid-based tracking (for assets and location beacons)
export async function writeFileWithMacidTracking(
  app: App, 
  preferredFilePath: string, 
  content: string, 
  macid: string | null
): Promise<'created' | 'updated' | 'unchanged' | 'renamed'> {
  // If no macid, fall back to regular file writing
  if (!macid) {
    const result = await writeFileIfChanged(app, preferredFilePath, content);
    return result;
  }

  // Check if file with this macid already exists
  const existingFile = await findFileByMacid(app, macid);
  
  if (existingFile) {
    // File exists, check if we need to rename it
    const preferredNormalized = normalizePath(preferredFilePath);
    
    if (existingFile.path !== preferredNormalized) {
      // Need to rename the file
      const current = await app.vault.read(existingFile);
      if (current === content) {
        // Content is the same, just rename
        await app.vault.rename(existingFile, preferredNormalized);
        // Update index with new path
        updateMacidIndex(preferredNormalized, macid);
        return 'renamed';
      } else {
        // Content changed and need to rename
        await app.vault.rename(existingFile, preferredNormalized);
        await app.vault.modify(app.vault.getAbstractFileByPath(preferredNormalized) as TFile, content);
        // Update index with new path
        updateMacidIndex(preferredNormalized, macid);
        return 'updated';
      }
    } else {
      // File path is correct, just check content
      const current = await app.vault.read(existingFile);
      if (current === content) return 'unchanged';
      await app.vault.modify(existingFile, content);
      return 'updated';
    }
  } else {
    // No existing file with this macid, create new one
    const normalized = normalizePath(preferredFilePath);
    await app.vault.create(normalized, content);
    // Add to index
    updateMacidIndex(normalized, macid);
    return 'created';
  }
}
