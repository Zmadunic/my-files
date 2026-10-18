import React from 'react';
import { Download, Star, ShieldCheck, HardDrive, Smartphone } from 'lucide-react';
import { AppRecord } from '../types';

interface AppCardProps {
  app: AppRecord;
  onClick: () => void;
  onQuickDownload: (e: React.MouseEvent, app: AppRecord) => void;
}

export function AppCard({ app, onClick, onQuickDownload }: AppCardProps) {
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const extension = app.packageFile?.extension?.toUpperCase() || 'FILE';

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start gap-3.5 mb-3">
          {/* App Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
            {app.icon ? (
              <img
                src={`/api/media/${app.icon.fileId}`}
                alt={app.name}
                className="w-full h-full object-cover rounded-xl"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
                {app.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Title & Developer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {app.name}
              </h3>
              <span title="Verified package integrity">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mb-1">
              {app.developer}
            </p>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {app.category}
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                v{app.version}
              </span>
            </div>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
          {app.shortDescription || app.description}
        </p>
      </div>

      {/* Bottom Metadata & Download Bar */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {/* Rating */}
          <div className="flex items-center gap-1 font-semibold text-amber-500 dark:text-amber-400">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{app.rating > 0 ? app.rating.toFixed(1) : 'New'}</span>
          </div>

          {/* Size & Format */}
          <div className="flex items-center gap-1 text-[11px]">
            <HardDrive className="w-3 h-3 text-slate-400" />
            <span>{formatSize(app.packageFile?.fileSize)}</span>
          </div>

          {/* Downloads count */}
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <Download className="w-3 h-3 text-slate-400" />
            <span>{app.downloadsCount}</span>
          </div>
        </div>

        {/* Action Button */}
        {app.packageFile ? (
          <button
            onClick={(e) => onQuickDownload(e, app)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all hover:scale-105 active:scale-95"
            title={`Download ${app.name} (${extension})`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{extension}</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 italic">No package</span>
        )}
      </div>
    </div>
  );
}
