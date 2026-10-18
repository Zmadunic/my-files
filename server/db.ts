import fs from 'fs';
import path from 'path';

export interface FileRecord {
  fileId: string;
  originalName: string;
  storedFileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  extension: string;
  sha256?: string;
  uploadedAt: string;
  fileTypeCategory: 'icon' | 'screenshot' | 'video' | 'package' | 'general';
}

export interface AppRecord {
  id: string;
  name: string;
  slug: string;
  developer: string;
  version: string;
  category: string;
  subCategory?: string;
  shortDescription: string;
  description: string;
  changelog?: string;
  requirements?: string; // e.g. "Android 8.0+", "Windows 10/11 64-bit"
  architecture?: string; // e.g. "Universal", "arm64-v8a", "x86_64"
  icon: FileRecord | null;
  screenshots: FileRecord[];
  previewVideo: FileRecord | null;
  packageFile: FileRecord | null;
  status: 'published' | 'draft';
  featured: boolean;
  rating: number; // 0.0 to 5.0
  ratingCount: number;
  downloadsCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  siteName: string;
  tagline: string;
  logoUrl?: string;
  accentColor: string; // hex color or preset
  heroNotice?: string;
  allowPublicRatings: boolean;
  contactEmail?: string;
  footerText?: string;
  defaultTheme: 'dark' | 'light' | 'system';
}

export interface AdminAuthRecord {
  isConfigured: boolean;
  username: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

export interface SessionRecord {
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface DatabaseData {
  settings: StoreSettings;
  adminAuth: AdminAuthRecord;
  apps: AppRecord[];
  categories: string[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_CATEGORIES = [
  'Games',
  'Tools & Utilities',
  'Productivity',
  'Communication',
  'Entertainment',
  'Multimedia',
  'Security & Privacy',
  'Development & IT',
  'Education'
];

const DEFAULT_SETTINGS: StoreSettings = {
  siteName: 'AppHaven',
  tagline: 'The Open App & Game Repository — Fast, Verified & Direct Downloads',
  logoUrl: '',
  accentColor: '#3b82f6', // blue-500
  heroNotice: 'Welcome to AppHaven! Browse verified software, tools, and games with direct downloads.',
  allowPublicRatings: true,
  contactEmail: 'admin@apphaven.local',
  footerText: 'AppHaven is an independent software repository. All trademarks belong to their respective owners.',
  defaultTheme: 'system'
};

const DEFAULT_ADMIN_AUTH: AdminAuthRecord = {
  isConfigured: false,
  username: 'admin',
  salt: '',
  passwordHash: '',
  updatedAt: new Date().toISOString()
};

class JSONDatabase {
  private data: DatabaseData;
  private sessions: Map<string, SessionRecord> = new Map();
  private writeLock = false;

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          adminAuth: { ...DEFAULT_ADMIN_AUTH, ...(parsed.adminAuth || {}) },
          apps: parsed.apps || [],
          categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES
        };
      }
    } catch (err) {
      console.error('Failed to read db.json, initializing defaults:', err);
    }

    const initial: DatabaseData = {
      settings: DEFAULT_SETTINGS,
      adminAuth: DEFAULT_ADMIN_AUTH,
      apps: [], // Starts completely empty as requested by user
      categories: DEFAULT_CATEGORIES
    };
    this.saveImmediate(initial);
    return initial;
  }

  private saveImmediate(data: DatabaseData) {
    this.ensureDirectory();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public async save(): Promise<void> {
    if (this.writeLock) {
      await new Promise(res => setTimeout(res, 50));
      return this.save();
    }
    this.writeLock = true;
    try {
      this.ensureDirectory();
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.promises.rename(tempFile, DB_FILE);
    } catch (err) {
      console.error('Database write error:', err);
      throw err;
    } finally {
      this.writeLock = false;
    }
  }

  // --- Settings ---
  public getSettings(): StoreSettings {
    return { ...this.data.settings };
  }

  public async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    this.data.settings = { ...this.data.settings, ...updates };
    await this.save();
    return this.data.settings;
  }

  // --- Admin Auth ---
  public getAdminAuth(): AdminAuthRecord {
    return { ...this.data.adminAuth };
  }

  public async setAdminCredentials(username: string, salt: string, passwordHash: string): Promise<void> {
    this.data.adminAuth = {
      isConfigured: true,
      username,
      salt,
      passwordHash,
      updatedAt: new Date().toISOString()
    };
    await this.save();
  }

  public addSession(token: string, durationMs = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    this.sessions.set(token, {
      token,
      createdAt: now,
      expiresAt: now + durationMs
    });
  }

  public isValidSession(token: string): boolean {
    if (!token) return false;
    const session = this.sessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  public removeSession(token: string): void {
    this.sessions.delete(token);
  }

  // --- Apps ---
  public getAllApps(includeDrafts = false): AppRecord[] {
    if (includeDrafts) {
      return [...this.data.apps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.apps
      .filter(app => app.status === 'published')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAppById(id: string, includeDrafts = false): AppRecord | null {
    const found = this.data.apps.find(a => a.id === id || a.slug === id);
    if (!found) return null;
    if (!includeDrafts && found.status !== 'published') return null;
    return { ...found };
  }

  public async createApp(appData: Omit<AppRecord, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'ratingCount' | 'downloadsCount' | 'viewsCount'>): Promise<AppRecord> {
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newApp: AppRecord = {
      ...appData,
      id,
      rating: 0,
      ratingCount: 0,
      downloadsCount: 0,
      viewsCount: 0,
      createdAt: now,
      updatedAt: now
    };
    this.data.apps.unshift(newApp);
    await this.save();
    return newApp;
  }

  public async updateApp(id: string, updates: Partial<AppRecord>): Promise<AppRecord | null> {
    const idx = this.data.apps.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const existing = this.data.apps[idx];
    const updated: AppRecord = {
      ...existing,
      ...updates,
      id: existing.id, // prevent id overwrite
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    this.data.apps[idx] = updated;
    await this.save();
    return updated;
  }

  public async deleteApp(id: string): Promise<AppRecord | null> {
    const idx = this.data.apps.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const [deleted] = this.data.apps.splice(idx, 1);
    await this.save();
    return deleted;
  }

  public async incrementDownloads(id: string): Promise<number> {
    const app = this.data.apps.find(a => a.id === id || a.packageFile?.fileId === id);
    if (!app) return 0;
    app.downloadsCount = (app.downloadsCount || 0) + 1;
    await this.save();
    return app.downloadsCount;
  }

  public async rateApp(id: string, stars: number): Promise<{ rating: number; ratingCount: number } | null> {
    const app = this.data.apps.find(a => a.id === id);
    if (!app) return null;
    const clamped = Math.max(1, Math.min(5, stars));
    const currentTotal = app.rating * app.ratingCount;
    app.ratingCount = (app.ratingCount || 0) + 1;
    app.rating = Number(((currentTotal + clamped) / app.ratingCount).toFixed(1));
    await this.save();
    return { rating: app.rating, ratingCount: app.ratingCount };
  }

  // --- Categories ---
  public getCategories(): string[] {
    return [...this.data.categories];
  }

  public async addCategory(name: string): Promise<string[]> {
    if (!this.data.categories.includes(name)) {
      this.data.categories.push(name);
      await this.save();
    }
    return this.data.categories;
  }

  // --- Stats ---
  public getStats() {
    const totalApps = this.data.apps.length;
    const publishedApps = this.data.apps.filter(a => a.status === 'published').length;
    const draftApps = totalApps - publishedApps;
    const totalDownloads = this.data.apps.reduce((sum, a) => sum + (a.downloadsCount || 0), 0);
    return {
      totalApps,
      publishedApps,
      draftApps,
      totalDownloads
    };
  }
}

export const db = new JSONDatabase();
