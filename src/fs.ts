import { App, normalizePath, TFile, TFolder } from 'obsidian';

// In-memory index of LL_macid -> file path for performance
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

// Parse frontmatter from content
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterText = frontmatterMatch[1];
  const body = frontmatterMatch[2];
  const frontmatter: Record<string, any> = {};
  
  // Parse YAML-like frontmatter (simple key: value pairs and arrays)
  const lines = frontmatterText.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];
  
  for (const line of lines) {
    const arrayMatch = line.match(/^\s*-\s+(.+)$/);
    if (arrayMatch && currentKey) {
      // This is an array item
      currentArray.push(arrayMatch[1].trim());
      continue;
    }
    
    // If we were building an array, save it
    if (currentKey && currentArray.length > 0) {
      frontmatter[currentKey] = currentArray;
      currentKey = null;
      currentArray = [];
    }
    
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      if (value === '' || value === null) {
        // This might be the start of an array
        currentKey = key;
        currentArray = [];
      } else {
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        frontmatter[key] = value;
      }
    }
  }
  
  // Handle any remaining array
  if (currentKey && currentArray.length > 0) {
    frontmatter[currentKey] = currentArray;
  }
  
  return { frontmatter, body };
}

// Merge new LL_* properties with existing frontmatter
function mergeWithExistingContent(existingContent: string, newContent: string): string {
  const { frontmatter: existingFm, body: existingBody } = parseFrontmatter(existingContent);
  const { frontmatter: newFm } = parseFrontmatter(newContent);
  
  // Merge frontmatter: preserve existing non-LL fields, update LL fields
  const mergedFm = { ...existingFm };
  
  // Update only LL_* fields, location, and tags from new content
  for (const [key, value] of Object.entries(newFm)) {
    if (key.startsWith('LL_') || key === 'location' || key === 'tags') {
      mergedFm[key] = value;
    }
  }
  
  // Rebuild frontmatter
  const frontmatterLines = ['---'];
  for (const [key, value] of Object.entries(mergedFm)) {
    if (key === 'tags' && Array.isArray(value)) {
      // Handle tags array specially
      frontmatterLines.push('tags:');
      for (const tag of value) {
        frontmatterLines.push(`  - ${tag}`);
      }
    } else if (typeof value === 'string' && (value.includes(',') || value.includes(' ') || value === '')) {
      frontmatterLines.push(`${key}: "${value}"`);
    } else {
      frontmatterLines.push(`${key}: ${value}`);
    }
  }
  frontmatterLines.push('---');
  
  return frontmatterLines.join('\n') + existingBody;
}

// Build index of LL_macid -> file path for a folder
export async function buildMacidIndex(app: App, folderPath: string): Promise<void> {
  const folder = app.vault.getAbstractFileByPath(normalizePath(folderPath));
  if (!folder || !(folder instanceof TFolder)) return;

  const processFile = async (file: TFile) => {
    if (!file.path.endsWith('.md')) return;
    
    try {
      const content = await app.vault.read(file);
      const llMacid = extractMacidFromContent(content);
      if (llMacid) {
        macidIndex.set(llMacid, file.path);
      }
    } catch (e) {
      console.warn(`Link Labs Sync: failed to read file for LL_macid indexing: ${file.path}`, e);
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

// Find existing file by LL_macid
export async function findFileByMacid(app: App, llMacid: string): Promise<TFile | null> {
  if (!llMacid) return null;
  
  const filePath = macidIndex.get(llMacid);
  if (!filePath) return null;
  
  const file = app.vault.getAbstractFileByPath(filePath);
  return (file instanceof TFile) ? file : null;
}

// Update LL_macid index when files are created/updated
export function updateMacidIndex(filePath: string, llMacid: string | null): void {
  if (llMacid) {
    macidIndex.set(llMacid, filePath);
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

// Write file with LL_macid-based tracking (for assets and location beacons)
export async function writeFileWithMacidTracking(
  app: App, 
  preferredFilePath: string, 
  content: string, 
  llMacid: string | null
): Promise<'created' | 'updated' | 'unchanged'> {
  // If no LL_macid, fall back to regular file writing
  if (!llMacid) {
    const result = await writeFileIfChanged(app, preferredFilePath, content);
    return result;
  }

  // Check if file with this LL_macid already exists
  const existingFile = await findFileByMacid(app, llMacid);
  
  if (existingFile) {
    // File exists - preserve filename and merge content selectively
    const currentContent = await app.vault.read(existingFile);
    const mergedContent = mergeWithExistingContent(currentContent, content);
    
    if (currentContent === mergedContent) {
      return 'unchanged';
    }
    
    await app.vault.modify(existingFile, mergedContent);
    return 'updated';
  } else {
    // No existing file with this macid, create new one
    const normalized = normalizePath(preferredFilePath);
    
    // Check if file already exists at the preferred path (could be from outside our tracking)
    const existingAtPath = app.vault.getAbstractFileByPath(normalized);
    if (existingAtPath instanceof TFile) {
      // File exists but not in our macid index - update it instead
      const currentContent = await app.vault.read(existingAtPath);
      const mergedContent = mergeWithExistingContent(currentContent, content);
      
      if (currentContent !== mergedContent) {
        await app.vault.modify(existingAtPath, mergedContent);
      }
      
      // Add to index for future tracking
      updateMacidIndex(normalized, llMacid);
      return currentContent !== mergedContent ? 'updated' : 'unchanged';
    } else {
      // Safe to create new file
      await app.vault.create(normalized, content);
      // Add to index
      updateMacidIndex(normalized, llMacid);
      return 'created';
    }
  }
}
