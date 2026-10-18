import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, AppRecord, FileRecord } from './server/db.js';
import { storage, MAX_FILE_SIZE_BYTES } from './server/storage.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Password hashing utility with PBKDF2
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// Authentication Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Owner administrator access required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!db.isValidSession(token)) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '20mb' }));

  // Raw body parser for binary chunks
  app.use('/api/upload/chunk', express.raw({
    type: 'application/octet-stream',
    limit: '25mb'
  }));

  // CORS / Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // ==========================================
  // Public Routes
  // ==========================================

  // Store Settings (Branding, site name, colors)
  app.get('/api/settings', (req, res) => {
    res.json(db.getSettings());
  });

  // Categories list
  app.get('/api/categories', (req, res) => {
    const publishedApps = db.getAllApps(false);
    const categoryCounts: Record<string, number> = {};
    for (const app of publishedApps) {
      categoryCounts[app.category] = (categoryCounts[app.category] || 0) + 1;
    }
    const categories = db.getCategories().map(name => ({
      name,
      count: categoryCounts[name] || 0
    }));
    res.json(categories);
  });

  // List published apps (Visitors only see published)
  app.get('/api/apps', (req, res) => {
    const { category, search, sort, featured } = req.query;
    let apps = db.getAllApps(false); // Only published

    if (category && typeof category === 'string' && category !== 'All') {
      apps = apps.filter(a => a.category.toLowerCase() === category.toLowerCase());
    }

    if (featured === 'true') {
      apps = apps.filter(a => a.featured);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      apps = apps.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        a.shortDescription.toLowerCase().includes(q) ||
        (a.subCategory && a.subCategory.toLowerCase().includes(q))
      );
    }

    if (sort === 'downloads') {
      apps.sort((a, b) => b.downloadsCount - a.downloadsCount);
    } else if (sort === 'rating') {
      apps.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'name') {
      apps.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Default: recent
      apps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json(apps);
  });

  // Get single published app
  app.get('/api/apps/:id', (req, res) => {
    const appItem = db.getAppById(req.params.id, false);
    if (!appItem) {
      res.status(404).json({ error: 'App not found or not published' });
      return;
    }
    res.json(appItem);
  });

  // Rate app
  app.post('/api/apps/:id/rate', async (req, res) => {
    const { rating } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }
    const result = await db.rateApp(req.params.id, rating);
    if (!result) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json(result);
  });

  // Real File Download Stream with proper headers & tracking
  app.get('/api/download/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      const allApps = db.getAllApps(true);
      const appItem = allApps.find(a => a.packageFile?.fileId === fileId);

      if (!appItem || !appItem.packageFile) {
        res.status(404).send('Requested package file not found');
        return;
      }

      // Check if published or admin
      const authHeader = req.headers.authorization;
      const isAdmin = authHeader?.startsWith('Bearer ') && db.isValidSession(authHeader.split(' ')[1]);
      if (appItem.status !== 'published' && !isAdmin) {
        res.status(403).send('This item is currently unpublished');
        return;
      }

      const filePath = storage.getFilePath(appItem.packageFile.storedFileName);
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).send('Binary package file is missing from server storage');
        return;
      }

      // Increment download counter
      await db.incrementDownloads(appItem.id);

      const stat = fs.statSync(filePath);
      const filename = appItem.packageFile.originalName || `${appItem.slug}-v${appItem.version}.${appItem.packageFile.extension}`;

      res.setHeader('Content-Type', appItem.packageFile.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Cache-Control', 'no-cache');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error('Download stream error:', err);
      res.status(500).send('Internal server error during download');
    }
  });

  // Media Serving (Icons, screenshots, preview video) with Range Support
  app.get('/api/media/:fileId', (req, res) => {
    try {
      const { fileId } = req.params;
      const allApps = db.getAllApps(true);

      let targetFile: FileRecord | null = null;
      for (const a of allApps) {
        if (a.icon?.fileId === fileId) {
          targetFile = a.icon;
          break;
        }
        if (a.previewVideo?.fileId === fileId) {
          targetFile = a.previewVideo;
          break;
        }
        const scr = a.screenshots.find(s => s.fileId === fileId);
        if (scr) {
          targetFile = scr;
          break;
        }
      }

      if (!targetFile) {
        // Check if stored file directly
        const filePath = storage.getFilePath(fileId);
        if (filePath && fs.existsSync(filePath)) {
          res.sendFile(filePath);
          return;
        }
        res.status(404).send('Media file not found');
        return;
      }

      const filePath = storage.getFilePath(targetFile.storedFileName);
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).send('Media file not found on disk');
        return;
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Video range streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': targetFile.mimeType || 'video/mp4',
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': targetFile.mimeType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      console.error('Media stream error:', err);
      res.status(500).send('Internal server error streaming media');
    }
  });

  // ==========================================
  // Admin Authentication Endpoints
  // ==========================================

  // Check auth status & whether admin account is initialized
  app.get('/api/admin/status', (req, res) => {
    const adminAuth = db.getAdminAuth();
    const authHeader = req.headers.authorization;
    let isAuthenticated = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      isAuthenticated = db.isValidSession(token);
    }

    res.json({
      isConfigured: adminAuth.isConfigured,
      isAuthenticated,
      adminUsername: adminAuth.isConfigured ? adminAuth.username : null
    });
  });

  // First-time owner setup wizard
  app.post('/api/admin/setup', async (req, res) => {
    const adminAuth = db.getAdminAuth();
    if (adminAuth.isConfigured) {
      res.status(400).json({ error: 'Administrator credentials already configured. Please use sign in.' });
      return;
    }

    const { username, password } = req.body;
    if (!username || username.trim().length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const salt = crypto.randomBytes(32).toString('hex');
    const passwordHash = hashPassword(password, salt);

    await db.setAdminCredentials(username.trim(), salt, passwordHash);

    const token = crypto.randomBytes(32).toString('hex');
    db.addSession(token);

    res.json({
      success: true,
      message: 'Owner administrator setup completed successfully.',
      token,
      username: username.trim()
    });
  });

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const adminAuth = db.getAdminAuth();
    if (!adminAuth.isConfigured) {
      res.status(400).json({ error: 'Administrator has not been initialized yet. Run setup first.' });
      return;
    }

    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const computedHash = hashPassword(password, adminAuth.salt);
    if (username.trim().toLowerCase() !== adminAuth.username.toLowerCase() || computedHash !== adminAuth.passwordHash) {
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.addSession(token);

    res.json({
      success: true,
      token,
      username: adminAuth.username
    });
  });

  // Admin Logout
  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      db.removeSession(token);
    }
    res.json({ success: true });
  });

  // ==========================================
  // Protected Admin Routes
  // ==========================================

  // Get Admin Apps (including drafts)
  app.get('/api/admin/apps', requireAdmin, (req, res) => {
    const apps = db.getAllApps(true);
    res.json(apps);
  });

  // Get Admin Dashboard Stats
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    const basicStats = db.getStats();
    const storageStats = await storage.getStorageStats();
    res.json({
      ...basicStats,
      storageBytes: storageStats.totalBytes,
      storageFormatted: `${(storageStats.totalBytes / (1024 * 1024)).toFixed(2)} MB`,
      totalFilesCount: storageStats.fileCount
    });
  });

  // Update Store Settings
  app.post('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const updated = await db.updateSettings(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  // Create App (Draft or Published)
  app.post('/api/apps', requireAdmin, async (req, res) => {
    try {
      const {
        name,
        developer,
        version,
        category,
        subCategory,
        shortDescription,
        description,
        changelog,
        requirements,
        architecture,
        icon,
        screenshots,
        previewVideo,
        packageFile,
        status,
        featured
      } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'App name is required' });
        return;
      }
      if (!developer || !developer.trim()) {
        res.status(400).json({ error: 'Developer name is required' });
        return;
      }
      if (!version || !version.trim()) {
        res.status(400).json({ error: 'Version is required' });
        return;
      }
      if (!category) {
        res.status(400).json({ error: 'Category is required' });
        return;
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const newApp = await db.createApp({
        name: name.trim(),
        slug,
        developer: developer.trim(),
        version: version.trim(),
        category,
        subCategory: subCategory || '',
        shortDescription: shortDescription || '',
        description: description || '',
        changelog: changelog || '',
        requirements: requirements || 'Windows 10 / Android 8.0+',
        architecture: architecture || 'Universal',
        icon: icon || null,
        screenshots: Array.isArray(screenshots) ? screenshots : [],
        previewVideo: previewVideo || null,
        packageFile: packageFile || null,
        status: status === 'draft' ? 'draft' : 'published',
        featured: Boolean(featured)
      });

      res.status(201).json(newApp);
    } catch (err: any) {
      console.error('Create app error:', err);
      res.status(500).json({ error: err.message || 'Failed to create app' });
    }
  });

  // Update App
  app.put('/api/apps/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await db.updateApp(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'App not found' });
        return;
      }
      res.json(updated);
    } catch (err: any) {
      console.error('Update app error:', err);
      res.status(500).json({ error: err.message || 'Failed to update app' });
    }
  });

  // Delete App and Clean up disk files
  app.delete('/api/apps/:id', requireAdmin, async (req, res) => {
    try {
      const appItem = db.getAppById(req.params.id, true);
      if (!appItem) {
        res.status(404).json({ error: 'App not found' });
        return;
      }

      // Clean up uploaded files from disk
      if (appItem.icon?.storedFileName) {
        await storage.deleteFile(appItem.icon.storedFileName);
      }
      if (appItem.previewVideo?.storedFileName) {
        await storage.deleteFile(appItem.previewVideo.storedFileName);
      }
      if (appItem.packageFile?.storedFileName) {
        await storage.deleteFile(appItem.packageFile.storedFileName);
      }
      for (const scr of appItem.screenshots) {
        if (scr.storedFileName) {
          await storage.deleteFile(scr.storedFileName);
        }
      }

      await db.deleteApp(req.params.id);
      res.json({ success: true, message: 'App and associated stored files deleted successfully.' });
    } catch (err: any) {
      console.error('Delete app error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete app' });
    }
  });

  // ==========================================
  // Resumable Chunked Upload Endpoints (Owner only)
  // ==========================================

  // Step 1: Initialize upload session
  app.post('/api/upload/init', requireAdmin, (req, res) => {
    try {
      const { originalName, fileSize, mimeType, fileCategory, totalChunks } = req.body;
      if (!originalName || typeof fileSize !== 'number' || typeof totalChunks !== 'number') {
        res.status(400).json({ error: 'Invalid parameters: originalName, fileSize, and totalChunks are required.' });
        return;
      }

      const { uploadId } = storage.initUpload({
        originalName,
        fileSize,
        mimeType,
        fileCategory: fileCategory || 'general',
        totalChunks
      });

      res.json({
        uploadId,
        maxFileSize: MAX_FILE_SIZE_BYTES,
        chunkSizeSuggested: 2 * 1024 * 1024 // 2MB chunk size recommended
      });
    } catch (err: any) {
      console.error('Upload init error:', err);
      res.status(400).json({ error: err.message || 'Failed to initialize upload session' });
    }
  });

  // Step 2: Upload chunk binary
  app.post('/api/upload/chunk', requireAdmin, async (req, res) => {
    try {
      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndexStr = req.headers['x-chunk-index'] as string;

      if (!uploadId || chunkIndexStr === undefined) {
        res.status(400).json({ error: 'Missing x-upload-id or x-chunk-index header.' });
        return;
      }

      const chunkIndex = parseInt(chunkIndexStr, 10);
      const buffer = req.body as Buffer;

      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        res.status(400).json({ error: 'No chunk data received.' });
        return;
      }

      const result = await storage.saveChunk(uploadId, chunkIndex, buffer);
      res.json(result);
    } catch (err: any) {
      console.error('Upload chunk error:', err);
      res.status(400).json({ error: err.message || 'Failed to save chunk' });
    }
  });

  // Step 3: Complete upload and stitch chunks
  app.post('/api/upload/complete', requireAdmin, async (req, res) => {
    try {
      const { uploadId } = req.body;
      if (!uploadId) {
        res.status(400).json({ error: 'uploadId is required' });
        return;
      }

      const fileRecord = await storage.completeUpload(uploadId);
      res.json({
        success: true,
        file: fileRecord,
        downloadUrl: `/api/download/${fileRecord.fileId}`,
        mediaUrl: `/api/media/${fileRecord.fileId}`
      });
    } catch (err: any) {
      console.error('Upload complete error:', err);
      res.status(500).json({ error: err.message || 'Failed to complete and assemble file' });
    }
  });

  // Cancel in-progress upload
  app.post('/api/upload/cancel', requireAdmin, async (req, res) => {
    try {
      const { uploadId } = req.body;
      if (uploadId) {
        await storage.cancelUpload(uploadId);
      }
      res.json({ success: true, message: 'Upload cancelled and temporary files cleaned up.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to cancel upload' });
    }
  });

  // Optional: Seed verified demo apps for the owner (only if requested by admin)
  app.post('/api/admin/seed-demo', requireAdmin, async (req, res) => {
    try {
      const sampleApps: Array<Omit<AppRecord, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'ratingCount' | 'downloadsCount' | 'viewsCount'>> = [
        {
          name: 'OpenPixel Pro',
          slug: 'openpixel-pro',
          developer: 'Creative Labs Studio',
          version: '3.2.0',
          category: 'Multimedia',
          subCategory: 'Graphic Design',
          shortDescription: 'High-performance offline digital painting, RAW photo editor and vector illustration suite.',
          description: `OpenPixel Pro delivers studio-grade image manipulation, layer compositing, and vector paths right to your device.

Key Features:
- Non-destructive RAW processing engine
- Hardware accelerated brush dynamics with tilt and pressure sensitivity
- Infinite canvas mode for mind mapping and storyboarding
- Full export support for PNG, SVG, WebP, and multi-layer PSD files
- 100% offline functionality with zero background telemetry`,
          changelog: 'Added AI-assisted selection tools, optimized GPU memory consumption by 35%, fixed dark mode palette contrast.',
          requirements: 'Windows 10/11 64-bit or Android 10.0+',
          architecture: 'Universal',
          icon: null,
          screenshots: [],
          previewVideo: null,
          packageFile: null,
          status: 'published',
          featured: true
        },
        {
          name: 'HyperTerminal SSH',
          slug: 'hyperterminal-ssh',
          developer: 'DevOps Forge',
          version: '1.8.4',
          category: 'Development & IT',
          subCategory: 'Terminal & Networking',
          shortDescription: 'Next-generation terminal emulator with built-in SFTP, port forwarding, and tmux integration.',
          description: `HyperTerminal SSH is built for engineers and sysadmins who demand speed, security, and portability.

Highlights:
- Hardware-accelerated GPU font rendering with Nerd Fonts and Powerline support
- Multi-tab split pane layouts
- Secure credential vault with hardware key (YubiKey) support
- Built-in drag-and-drop SFTP client`,
          changelog: 'Support for Ed25519-SK tokens, improved mouse scroll acceleration in vim.',
          requirements: 'Windows 10+ / Linux / Android 8.0+',
          architecture: 'x86_64 / ARM64',
          icon: null,
          screenshots: [],
          previewVideo: null,
          packageFile: null,
          status: 'published',
          featured: true
        },
        {
          name: 'Chronos Odyssey',
          slug: 'chronos-odyssey',
          developer: 'Nebula Pixel Studios',
          version: '2.0.1',
          category: 'Games',
          subCategory: 'Action RPG',
          shortDescription: 'Epic retro-inspired tactical action RPG with deep lore, real-time combat, and offline gameplay.',
          description: `Embark on a timeless journey through shattered realms in Chronos Odyssey. Master dynamic swordplay, uncover ancient artifacts, and defeat legendary titans.

Game Features:
- 40+ hours of hand-crafted story campaigns
- Full physical gamepad and touch control mapping
- Dynamic weather and day/night system affecting monster spawns
- 60 FPS smooth rendering engine with customizable shaders`,
          changelog: 'New Chapter 5 expansion added, new legendary weapon tier, balanced boss encounter difficulty.',
          requirements: 'OpenGL ES 3.1 / DirectX 11, 4GB RAM minimum',
          architecture: 'arm64-v8a / x86_64',
          icon: null,
          screenshots: [],
          previewVideo: null,
          packageFile: null,
          status: 'published',
          featured: true
        }
      ];

      for (const sample of sampleApps) {
        await db.createApp(sample);
      }

      res.json({ success: true, count: sampleApps.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Vite Dev Server / Production Static Serving
  // ==========================================

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AppHaven server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
