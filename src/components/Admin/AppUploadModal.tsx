import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image,
  Video,
  FileCode,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Trash2,
  HardDrive,
  RefreshCw,
  Plus
} from 'lucide-react';
import { AppRecord, FileRecord } from '../../types';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { uploadChunkedFile, createAppRecord, updateAppRecord } from '../../services/api';

interface AppUploadModalProps {
  initialApp?: AppRecord | null;
  categories: string[];
  onClose: () => void;
  onSuccess: (savedApp: AppRecord) => void;
}

interface UploadProgressState {
  currentFile: string;
  percent: number;
  speedMbps: number;
  loadedBytes: number;
  totalBytes: number;
  status: 'idle' | 'uploading' | 'saving' | 'complete' | 'cancelled' | 'error';
  errorMessage?: string;
}

export function AppUploadModal({
  initialApp,
  categories,
  onClose,
  onSuccess,
}: AppUploadModalProps) {
  const { token } = useAdminAuth();
  const isEditing = Boolean(initialApp);

  // Form states
  const [name, setName] = useState(initialApp?.name || '');
  const [developer, setDeveloper] = useState(initialApp?.developer || '');
  const [category, setCategory] = useState(initialApp?.category || (categories[0] || 'Tools & Utilities'));
  const [subCategory, setSubCategory] = useState(initialApp?.subCategory || '');
  const [version, setVersion] = useState(initialApp?.version || '1.0.0');
  const [architecture, setArchitecture] = useState(initialApp?.architecture || 'Universal');
  const [requirements, setRequirements] = useState(initialApp?.requirements || 'Windows 10 / Android 8.0+');
  const [shortDescription, setShortDescription] = useState(initialApp?.shortDescription || '');
  const [description, setDescription] = useState(initialApp?.description || '');
  const [changelog, setChangelog] = useState(initialApp?.changelog || '');
  const [featured, setFeatured] = useState(initialApp?.featured || false);
  const [status, setStatus] = useState<'published' | 'draft'>(initialApp?.status || 'published');

  // File states (Local files to be uploaded)
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(
    initialApp?.icon ? `/api/media/${initialApp.icon.fileId}` : null
  );

  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<FileRecord[]>(
    initialApp?.screenshots || []
  );

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(
    initialApp?.previewVideo ? `/api/media/${initialApp.previewVideo.fileId}` : null
  );

  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [existingPackage, setExistingPackage] = useState<FileRecord | null>(
    initialApp?.packageFile || null
  );

  // Upload progress and abort control
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    currentFile: '',
    percent: 0,
    speedMbps: 0,
    loadedBytes: 0,
    totalBytes: 0,
    status: 'idle',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle icon selection
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  // Handle screenshot selection
  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setScreenshotFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeNewScreenshot = (index: number) => {
    setScreenshotFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingScreenshot = (fileId: string) => {
    setExistingScreenshots(prev => prev.filter(s => s.fileId !== fileId));
  };

  // Handle video selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle package binary selection (.apk, .zip, .exe, etc.)
  const handlePackageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPackageFile(file);
    }
  };

  // Cancel in-flight upload
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploadProgress({
      currentFile: '',
      percent: 0,
      speedMbps: 0,
      loadedBytes: 0,
      totalBytes: 0,
      status: 'cancelled',
      errorMessage: 'Upload operation was cancelled.',
    });
  };

  // Submit and upload form
  const handleSubmit = async (targetStatus: 'published' | 'draft') => {
    if (!token) {
      setUploadProgress(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Administrator authentication required.',
      }));
      return;
    }

    if (!name.trim()) {
      alert('App name is required.');
      return;
    }
    if (!developer.trim()) {
      alert('Developer name is required.');
      return;
    }
    if (!version.trim()) {
      alert('Version is required.');
      return;
    }

    // Require package file for brand new published app
    if (!isEditing && !packageFile && targetStatus === 'published') {
      const confirmNoPackage = confirm(
        'You have not selected an executable or APK package file yet. Do you want to save this as a Draft instead?'
      );
      if (!confirmNoPackage) return;
      targetStatus = 'draft';
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let finalIconRecord: FileRecord | null = initialApp?.icon || null;
      let finalScreenshots: FileRecord[] = [...existingScreenshots];
      let finalVideoRecord: FileRecord | null = initialApp?.previewVideo || null;
      let finalPackageRecord: FileRecord | null = existingPackage;

      // 1. Upload Icon if new
      if (iconFile) {
        setUploadProgress({
          currentFile: `Uploading App Icon: ${iconFile.name}`,
          percent: 0,
          speedMbps: 0,
          loadedBytes: 0,
          totalBytes: iconFile.size,
          status: 'uploading',
        });
        finalIconRecord = await uploadChunkedFile(
          iconFile,
          'icon',
          token,
          (pct, speed, loaded, total) => {
            setUploadProgress(prev => ({
              ...prev,
              percent: pct,
              speedMbps: speed,
              loadedBytes: loaded,
              totalBytes: total,
            }));
          },
          signal
        );
      }

      // 2. Upload Screenshots if new
      if (screenshotFiles.length > 0) {
        for (let i = 0; i < screenshotFiles.length; i++) {
          const scrFile = screenshotFiles[i];
          setUploadProgress({
            currentFile: `Uploading Screenshot (${i + 1}/${screenshotFiles.length}): ${scrFile.name}`,
            percent: 0,
            speedMbps: 0,
            loadedBytes: 0,
            totalBytes: scrFile.size,
            status: 'uploading',
          });
          const uploadedScr = await uploadChunkedFile(
            scrFile,
            'screenshot',
            token,
            (pct, speed, loaded, total) => {
              setUploadProgress(prev => ({
                ...prev,
                percent: pct,
                speedMbps: speed,
                loadedBytes: loaded,
                totalBytes: total,
              }));
            },
            signal
          );
          finalScreenshots.push(uploadedScr);
        }
      }

      // 3. Upload Video if new
      if (videoFile) {
        setUploadProgress({
          currentFile: `Uploading Preview Video: ${videoFile.name}`,
          percent: 0,
          speedMbps: 0,
          loadedBytes: 0,
          totalBytes: videoFile.size,
          status: 'uploading',
        });
        finalVideoRecord = await uploadChunkedFile(
          videoFile,
          'video',
          token,
          (pct, speed, loaded, total) => {
            setUploadProgress(prev => ({
              ...prev,
              percent: pct,
              speedMbps: speed,
              loadedBytes: loaded,
              totalBytes: total,
            }));
          },
          signal
        );
      }

      // 4. Upload Binary Package if new (up to 1000MB with chunked resumable protocol)
      if (packageFile) {
        setUploadProgress({
          currentFile: `Uploading Software Package (${(packageFile.size / (1024 * 1024)).toFixed(1)} MB): ${packageFile.name}`,
          percent: 0,
          speedMbps: 0,
          loadedBytes: 0,
          totalBytes: packageFile.size,
          status: 'uploading',
        });
        finalPackageRecord = await uploadChunkedFile(
          packageFile,
          'package',
          token,
          (pct, speed, loaded, total) => {
            setUploadProgress(prev => ({
              ...prev,
              percent: pct,
              speedMbps: speed,
              loadedBytes: loaded,
              totalBytes: total,
            }));
          },
          signal
        );
      }

      // 5. Save App Record into Database
      setUploadProgress(prev => ({
        ...prev,
        currentFile: 'Saving app metadata to database...',
        percent: 100,
        status: 'saving',
      }));

      const payload = {
        name: name.trim(),
        developer: developer.trim(),
        category,
        subCategory: subCategory.trim(),
        version: version.trim(),
        architecture,
        requirements,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        changelog: changelog.trim(),
        featured,
        status: targetStatus,
        icon: finalIconRecord,
        screenshots: finalScreenshots,
        previewVideo: finalVideoRecord,
        packageFile: finalPackageRecord,
      };

      let savedApp: AppRecord;
      if (isEditing && initialApp) {
        savedApp = await updateAppRecord(token, initialApp.id, payload);
      } else {
        savedApp = await createAppRecord(token, payload);
      }

      setUploadProgress(prev => ({
        ...prev,
        status: 'complete',
        currentFile: 'App published successfully!',
      }));

      setTimeout(() => {
        onSuccess(savedApp);
      }, 1000);
    } catch (err: any) {
      if (signal.aborted) {
        // Handled in handleCancelUpload
        return;
      }
      setUploadProgress(prev => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'An error occurred during upload.',
      }));
    }
  };

  const isUploading = uploadProgress.status === 'uploading' || uploadProgress.status === 'saving';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              {isEditing ? <RefreshCw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Edit Software: ${initialApp?.name}` : 'Add New App or Game to Marketplace'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct computer file upload with real chunked storage (up to 1000 MB).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Progress Overlay / Banner */}
        {isUploading && (
          <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-950/80 border-b border-indigo-200 dark:border-indigo-800 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                {uploadProgress.currentFile}
              </span>
              <span>{uploadProgress.percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${uploadProgress.percent}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                {(uploadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB /{' '}
                {(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                {uploadProgress.speedMbps > 0 && ` • ${uploadProgress.speedMbps} Mbps`}
              </span>
              <button
                type="button"
                onClick={handleCancelUpload}
                className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        )}

        {/* Error / Success message */}
        {uploadProgress.status === 'error' && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadProgress.errorMessage}
            </span>
            <button
              onClick={() => setUploadProgress(p => ({ ...p, status: 'idle' }))}
              className="text-xs font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {uploadProgress.status === 'complete' && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Success! The software has been saved to the repository.</span>
          </div>
        )}

        {/* Form Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
          {/* Section 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                App or Game Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VLC Media Player, Pixel Strike, 7-Zip"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Developer / Studio Name *
              </label>
              <input
                type="text"
                required
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="e.g. VideoLAN, Igor Pavlov"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sub-Category / Genre
              </label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. Action RPG, Video Editor, Compression"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Version *
              </label>
              <input
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.4.2"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Architecture
              </label>
              <select
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="Universal">Universal</option>
                <option value="arm64-v8a">arm64-v8a (Android / Apple Silicon)</option>
                <option value="armeabi-v7a">armeabi-v7a (Android 32-bit)</option>
                <option value="x86_64">x86_64 (Windows 64-bit)</option>
                <option value="x86">x86 (32-bit)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Operating System / Minimum Requirements
              </label>
              <input
                type="text"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="e.g. Android 8.0+ / Windows 10 or 11 (64-bit)"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Section 2: Real Binary & Media Uploads Directly From Computer */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" /> Files From Your Computer
            </h3>

            {/* A. Executable / Package File Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Executable / Application Package (.apk, .zip, .exe, .pdf, .msi, .dmg...) *
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-white dark:bg-slate-900">
                <input
                  type="file"
                  id="packageInput"
                  onChange={handlePackageChange}
                  className="hidden"
                  accept=".apk,.xapk,.zip,.exe,.msi,.dmg,.pkg,.deb,.rpm,.tar.gz,.7z,.ipa,.pdf,.jar"
                />
                <label htmlFor="packageInput" className="cursor-pointer block">
                  <FileCode className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
                  {packageFile ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Selected: {packageFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {(packageFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for chunked upload
                      </p>
                    </div>
                  ) : existingPackage ? (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Current File: {existingPackage.originalName} ({(existingPackage.fileSize / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                      <p className="text-[11px] text-slate-400">Click to replace with a newer package file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Click or drag package file from your computer
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports APK, EXE, ZIP, MSI, PDF, DMG, 7Z up to 1000 MB (1 GB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* B. App Icon Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  App Icon / Logo Image
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {iconPreview ? (
                      <img src={iconPreview} alt="App icon" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <label className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-center">
                    <span>{iconFile ? 'Change Icon' : 'Select Icon File'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleIconChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* C. Preview Video Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preview Video (.mp4 / .webm)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {videoPreviewUrl ? (
                      <Video className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Video className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <label className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-center truncate">
                    <span>{videoFile ? videoFile.name : videoPreviewUrl ? 'Change Video' : 'Upload Video File'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleVideoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* D. Screenshots Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  App Screenshots & Pictures
                </label>
                <label className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Screenshots</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleScreenshotsChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-3 overflow-x-auto py-1">
                {/* Existing Screenshots */}
                {existingScreenshots.map((scr) => (
                  <div key={scr.fileId} className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 group">
                    <img src={`/api/media/${scr.fileId}`} alt="screenshot" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingScreenshot(scr.fileId)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Newly Selected Local Screenshot Files */}
                {screenshotFiles.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 border-2 border-indigo-500 group">
                    <img src={URL.createObjectURL(file)} alt="new preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewScreenshot(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {existingScreenshots.length === 0 && screenshotFiles.length === 0 && (
                  <div className="w-full py-4 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                    No screenshots added yet. You can upload preview pictures from your computer.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Descriptions & Changelog */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Short Description (1-2 sentences for store cards)
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary shown on cards and search results..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Description & Features
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed overview of what this application does, key features, instructions..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                What's New in this Version (Changelog)
              </label>
              <textarea
                rows={2}
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="List new features, bug fixes, or improvements..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              ></textarea>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="featuredCheck"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="featuredCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Spotlight this item in the Featured Hero Banner on the home page
              </label>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Current Status:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              status === 'published'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            }`}>
              {status === 'published' ? 'Will be Published' : 'Draft Only'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleSubmit('published')}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isEditing ? 'Update & Publish' : 'Upload & Publish Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
