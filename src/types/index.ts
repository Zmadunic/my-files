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
  requirements?: string;
  architecture?: string;
  icon: FileRecord | null;
  screenshots: FileRecord[];
  previewVideo: FileRecord | null;
  packageFile: FileRecord | null;
  status: 'published' | 'draft';
  featured: boolean;
  rating: number;
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
  accentColor: string;
  heroNotice?: string;
  allowPublicRatings: boolean;
  contactEmail?: string;
  footerText?: string;
  defaultTheme: 'dark' | 'light' | 'system';
}

export interface CategoryInfo {
  name: string;
  count: number;
}

export interface AdminStats {
  totalApps: number;
  publishedApps: number;
  draftApps: number;
  totalDownloads: number;
  storageBytes: number;
  storageFormatted: string;
  totalFilesCount: number;
}

export interface AdminStatus {
  isConfigured: boolean;
  isAuthenticated: boolean;
  adminUsername: string | null;
}

export interface UploadProgress {
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  progressPercent: number;
  speedMbps: number;
  isComplete: boolean;
  error?: string;
}
