import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FileRecord } from './db';

const STORAGE_ROOT = path.resolve(process.cwd(), 'data', 'uploads');
const FILES_DIR = path.join(STORAGE_ROOT, 'files');
const CHUNKS_DIR = path.join(STORAGE_ROOT, 'chunks');

// Maximum file size: 1000 MB (1 GB)
export const MAX_FILE_SIZE_BYTES = 1000 * 1024 * 1024;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = new Set([
  // Packages & Executables
  'apk', 'xapk', 'zip', 'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'tar.gz', 'tgz', 'rar', '7z', 'ipa', 'pdf', 'jar',
  // Media & Images
  'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico',
  // Videos
  'mp4', 'webm', 'mkv', 'mov'
]);

export interface UploadSession {
  uploadId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileCategory: 'icon' | 'screenshot' | 'video' | 'package' | 'general';
  totalChunks: number;
  uploadedChunks: Set<number>;
  createdAt: number;
}

class StorageManager {
  private activeSessions: Map<string, UploadSession> = new Map();

  constructor() {
    this.ensureDirs();
  }

  private ensureDirs() {
    if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
    if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  }

  public initUpload(params: {
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileCategory: 'icon' | 'screenshot' | 'video' | 'package' | 'general';
    totalChunks: number;
  }): { uploadId: string } {
    this.ensureDirs();

    const { originalName, fileSize, mimeType, fileCategory, totalChunks } = params;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 1000 MB.`);
    }

    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`File extension .${ext} is not permitted. Permitted types include APK, ZIP, EXE, PDF, MSI, DMG, PNG, JPG, WEBP, MP4.`);
    }

    const uploadId = `upl_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const chunkDir = path.join(CHUNKS_DIR, uploadId);
    fs.mkdirSync(chunkDir, { recursive: true });

    const session: UploadSession = {
      uploadId,
      originalName,
      fileSize,
      mimeType: mimeType || 'application/octet-stream',
      fileCategory,
      totalChunks,
      uploadedChunks: new Set<number>(),
      createdAt: Date.now()
    };

    this.activeSessions.set(uploadId, session);
    return { uploadId };
  }

  public async saveChunk(uploadId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<{ success: boolean; progress: number }> {
    const session = this.activeSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found or expired.');
    }

    const chunkPath = path.join(CHUNKS_DIR, uploadId, `chunk_${chunkIndex}`);
    await fs.promises.writeFile(chunkPath, chunkBuffer);

    session.uploadedChunks.add(chunkIndex);
    const progress = Math.round((session.uploadedChunks.size / session.totalChunks) * 100);

    return { success: true, progress };
  }

  public async completeUpload(uploadId: string): Promise<FileRecord> {
    const session = this.activeSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found or expired.');
    }

    const chunkDir = path.join(CHUNKS_DIR, uploadId);

    // Verify all chunks exist
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk #${i}. Please retry or resume upload.`);
      }
    }

    const ext = path.extname(session.originalName).replace('.', '').toLowerCase();
    const fileId = `file_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const storedFileName = `${fileId}${ext ? '.' + ext : ''}`;
    const finalFilePath = path.join(FILES_DIR, storedFileName);

    // Stream and stitch all chunks sequentially
    const writeStream = fs.createWriteStream(finalFilePath);
    const hash = crypto.createHash('sha256');

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      const data = await fs.promises.readFile(chunkPath);
      hash.update(data);
      await new Promise<void>((resolve, reject) => {
        if (!writeStream.write(data)) {
          writeStream.once('drain', resolve);
        } else {
          resolve();
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const sha256 = hash.digest('hex');
    const stat = await fs.promises.stat(finalFilePath);

    // Clean up chunks
    try {
      await fs.promises.rm(chunkDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to clean up chunk dir:', e);
    }
    this.activeSessions.delete(uploadId);

    const record: FileRecord = {
      fileId,
      originalName: session.originalName,
      storedFileName,
      fileSize: stat.size,
      mimeType: session.mimeType,
      extension: ext,
      sha256,
      uploadedAt: new Date().toISOString(),
      fileTypeCategory: session.fileCategory
    };

    return record;
  }

  public async cancelUpload(uploadId: string): Promise<void> {
    const chunkDir = path.join(CHUNKS_DIR, uploadId);
    if (fs.existsSync(chunkDir)) {
      await fs.promises.rm(chunkDir, { recursive: true, force: true });
    }
    this.activeSessions.delete(uploadId);
  }

  public getFilePath(storedFileName: string): string | null {
    // Prevent path traversal
    const safeName = path.basename(storedFileName);
    const fullPath = path.join(FILES_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }

  public async deleteFile(storedFileName: string): Promise<boolean> {
    const filePath = this.getFilePath(storedFileName);
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  public async getStorageStats(): Promise<{ totalBytes: number; fileCount: number }> {
    this.ensureDirs();
    let totalBytes = 0;
    let fileCount = 0;

    try {
      const files = await fs.promises.readdir(FILES_DIR);
      for (const file of files) {
        try {
          const stat = await fs.promises.stat(path.join(FILES_DIR, file));
          if (stat.isFile()) {
            totalBytes += stat.size;
            fileCount++;
          }
        } catch {
          // ignore stat errors
        }
      }
    } catch (err) {
      console.error('Error reading storage directory stats:', err);
    }

    return { totalBytes, fileCount };
  }
}

export const storage = new StorageManager();
