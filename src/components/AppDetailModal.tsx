import React, { useState } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  Star,
  Copy,
  Check,
  Calendar,
  Cpu,
  HardDrive,
  User,
  Hash,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PlayCircle
} from 'lucide-react';
import { AppRecord } from '../types';
import { rateApp } from '../services/api';

interface AppDetailModalProps {
  app: AppRecord;
  onClose: () => void;
  onDownload: (app: AppRecord) => void;
  onAppUpdated?: (updatedApp: AppRecord) => void;
}

export function AppDetailModal({
  app,
  onClose,
  onDownload,
  onAppUpdated,
}: AppDetailModalProps) {
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
  };

  const handleCopyHash = () => {
    if (app.packageFile?.sha256) {
      navigator.clipboard.writeText(app.packageFile.sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyDownloadLink = () => {
    if (app.packageFile) {
      const fullUrl = `${window.location.origin}/api/download/${app.packageFile.fileId}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRate = async (stars: number) => {
    if (userRating !== null || isSubmittingRating) return;
    setIsSubmittingRating(true);
    try {
      const res = await rateApp(app.id, stars);
      setUserRating(stars);
      setRatingMessage(`Thank you for rating ${stars} stars!`);
      if (onAppUpdated) {
        onAppUpdated({
          ...app,
          rating: res.rating,
          ratingCount: res.ratingCount
        });
      }
    } catch {
      setRatingMessage('Unable to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const ext = app.packageFile?.extension?.toUpperCase() || 'FILE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {app.category}
            </span>
            {app.subCategory && (
              <span className="text-xs text-slate-400">/ {app.subCategory}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1">
          {/* Header section with Icon, Name, Developer, and Download Button */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-start sm:items-center gap-4">
              {/* Large App Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 shrink-0 shadow-md overflow-hidden flex items-center justify-center">
                {app.icon ? (
                  <img
                    src={`/api/media/${app.icon.fileId}`}
                    alt={app.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-3xl">
                    {app.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {app.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{app.developer}</span>
                  <span>•</span>
                  <span className="font-mono">v{app.version}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{app.rating > 0 ? app.rating.toFixed(1) : 'New'} ({app.ratingCount || 0} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Action Section: Direct Download Button */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {app.packageFile ? (
                <>
                  <button
                    onClick={() => onDownload(app)}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>Download {ext} ({formatSize(app.packageFile.fileSize).split(' ')[0]} MB)</span>
                  </button>

                  <button
                    onClick={handleCopyDownloadLink}
                    title="Copy direct download link"
                    className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                  >
                    {copiedLink ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <div className="px-5 py-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                  Package file pending upload by administrator
                </div>
              )}
            </div>
          </div>

          {/* Optional Preview Video */}
          {app.previewVideo && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-indigo-500" /> Gameplay / App Preview Video
              </h3>
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[380px] shadow-lg border border-slate-800">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                  src={`/api/media/${app.previewVideo.fileId}`}
                >
                  Your browser does not support HTML5 video preview.
                </video>
              </div>
            </div>
          )}

          {/* Screenshots Gallery */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Screenshots ({app.screenshots.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar scroll-smooth">
                {app.screenshots.map((scr, idx) => (
                  <div
                    key={scr.fileId}
                    onClick={() => setSelectedScreenshotIndex(idx)}
                    className="relative shrink-0 w-44 sm:w-60 h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer hover:scale-102 transition-transform bg-slate-100 dark:bg-slate-950"
                  >
                    <img
                      src={`/api/media/${scr.fileId}`}
                      alt={`${app.name} screenshot ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Short & Full Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              About this app
            </h3>
            {app.shortDescription && (
              <p className="text-base text-slate-700 dark:text-slate-200 font-medium leading-relaxed mb-4">
                {app.shortDescription}
              </p>
            )}
            <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed space-y-2">
              {app.description}
            </div>
          </div>

          {/* Changelog / What's New */}
          {app.changelog && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                What's New in v{app.version}
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {app.changelog}
              </p>
            </div>
          )}

          {/* Interactive Rating Widget for Visitors */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Rate this software</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your experience to help the community discover quality apps.
              </p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-1">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRate(star)}
                    disabled={userRating !== null || isSubmittingRating}
                    className="p-1 text-slate-300 dark:text-slate-700 hover:text-amber-400 dark:hover:text-amber-400 transition-colors disabled:cursor-not-allowed"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (userRating !== null && star <= userRating) || (app.rating >= star)
                          ? 'text-amber-400 fill-amber-400'
                          : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              {ratingMessage && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {ratingMessage}
                </span>
              )}
            </div>
          </div>

          {/* Technical Specifications & Cryptographic Security Hashes */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Technical Specifications & Integrity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> Package Size
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatSize(app.packageFile?.fileSize)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Architecture
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {app.architecture || 'Universal'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Minimum OS
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {app.requirements || 'Windows 10 / Android 8.0+'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Developer
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {app.developer}
                </span>
              </div>

              {/* SHA-256 Checksum */}
              {app.packageFile?.sha256 && (
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    <Hash className="w-3.5 h-3.5 text-indigo-500" /> SHA-256 Checksum
                  </span>
                  <div className="flex items-center gap-2 max-w-full overflow-hidden">
                    <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate bg-slate-200/60 dark:bg-slate-900 px-2 py-1 rounded">
                      {app.packageFile.sha256}
                    </code>
                    <button
                      onClick={handleCopyHash}
                      className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400 shrink-0"
                      title="Copy SHA-256"
                    >
                      {copiedHash ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Screenshot Lightbox Modal */}
        {selectedScreenshotIndex !== null && app.screenshots && (
          <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <button
              onClick={() => setSelectedScreenshotIndex(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {app.screenshots.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedScreenshotIndex(prev => (prev! > 0 ? prev! - 1 : app.screenshots.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setSelectedScreenshotIndex(prev => (prev! < app.screenshots.length - 1 ? prev! + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <img
              src={`/api/media/${app.screenshots[selectedScreenshotIndex].fileId}`}
              alt="Screenshot full preview"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
