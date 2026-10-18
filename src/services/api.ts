import { AppRecord, StoreSettings, CategoryInfo, AdminStats, AdminStatus, FileRecord } from '../types';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export async function fetchSettings(): Promise<StoreSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to load store settings');
  return res.json();
}

export async function fetchCategories(): Promise<CategoryInfo[]> {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error('Failed to load categories');
  return res.json();
}

export async function fetchApps(params?: {
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
}): Promise<AppRecord[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.featured) searchParams.set('featured', 'true');

  const res = await fetch(`/api/apps?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch apps');
  return res.json();
}

export async function fetchApp(id: string): Promise<AppRecord> {
  const res = await fetch(`/api/apps/${id}`);
  if (!res.ok) throw new Error('App not found');
  return res.json();
}

export async function rateApp(id: string, rating: number): Promise<{ rating: number; ratingCount: number }> {
  const res = await fetch(`/api/apps/${id}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  });
  if (!res.ok) throw new Error('Failed to submit rating');
  return res.json();
}

// Admin APIs
export async function checkAdminStatus(token?: string | null): Promise<AdminStatus> {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/admin/status', { headers });
  if (!res.ok) throw new Error('Failed to check admin status');
  return res.json();
}

export async function adminSetup(username: string, password: string): Promise<{ success: boolean; token: string; username: string }> {
  const res = await fetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to setup admin account');
  return data;
}

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; token: string; username: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid credentials');
  return data;
}

export async function adminLogout(token: string): Promise<void> {
  await fetch('/api/admin/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchAdminApps(token: string): Promise<AppRecord[]> {
  const res = await fetch('/api/admin/apps', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch admin apps');
  return res.json();
}

export async function fetchAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch('/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return res.json();
}

export async function updateStoreSettings(token: string, settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update settings');
  }
  return res.json();
}

export async function createAppRecord(token: string, appData: any): Promise<AppRecord> {
  const res = await fetch('/api/apps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(appData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create app');
  }
  return res.json();
}

export async function updateAppRecord(token: string, id: string, appData: any): Promise<AppRecord> {
  const res = await fetch(`/api/apps/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(appData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update app');
  }
  return res.json();
}

export async function deleteAppRecord(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/apps/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete app');
  }
}

export async function seedDemoApps(token: string): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/admin/seed-demo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to seed demo apps');
  return res.json();
}

// Resumable Chunked Upload Service supporting up to 1000MB with cancellation
export async function uploadChunkedFile(
  file: File,
  fileCategory: 'icon' | 'screenshot' | 'video' | 'package' | 'general',
  token: string,
  onProgress?: (percent: number, speedMbps: number, loadedBytes: number, totalBytes: number) => void,
  abortSignal?: AbortSignal
): Promise<FileRecord> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // 1. Initialize upload session
  const initRes = await fetch('/api/upload/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileCategory,
      totalChunks,
    }),
    signal: abortSignal,
  });

  if (!initRes.ok) {
    const errData = await initRes.json();
    throw new Error(errData.error || 'Failed to initialize upload');
  }

  const { uploadId } = await initRes.json();

  let uploadedBytes = 0;
  const startTime = Date.now();

  try {
    // 2. Upload chunks in sequential pipeline
    for (let i = 0; i < totalChunks; i++) {
      if (abortSignal?.aborted) {
        throw new Error('Upload aborted by user');
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);
      const chunkBuffer = await chunkBlob.arrayBuffer();

      const chunkRes = await fetch('/api/upload/chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-upload-id': uploadId,
          'x-chunk-index': i.toString(),
          Authorization: `Bearer ${token}`,
        },
        body: chunkBuffer,
        signal: abortSignal,
      });

      if (!chunkRes.ok) {
        const err = await chunkRes.json();
        throw new Error(err.error || `Chunk #${i} failed to upload`);
      }

      uploadedBytes += chunkBlob.size;
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speedMbps = elapsedSeconds > 0 ? (uploadedBytes * 8) / (elapsedSeconds * 1024 * 1024) : 0;
      const percent = Math.min(99, Math.round((uploadedBytes / file.size) * 100));

      if (onProgress) {
        onProgress(percent, Number(speedMbps.toFixed(2)), uploadedBytes, file.size);
      }
    }

    // 3. Complete and assemble file on server
    const completeRes = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uploadId }),
      signal: abortSignal,
    });

    if (!completeRes.ok) {
      const err = await completeRes.json();
      throw new Error(err.error || 'Failed to stitch and finalize file upload');
    }

    const completeData = await completeRes.json();

    if (onProgress) {
      onProgress(100, 0, file.size, file.size);
    }

    return completeData.file;
  } catch (error: any) {
    // Cancel and clean up server chunk cache if aborted or errored
    try {
      await fetch('/api/upload/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadId }),
      });
    } catch {
      // Ignore cleanup error
    }
    throw error;
  }
}
