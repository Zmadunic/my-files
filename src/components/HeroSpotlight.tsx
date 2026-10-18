import React from 'react';
import { ShieldCheck, Download, Zap, Cpu, Bell } from 'lucide-react';
import { AppRecord, StoreSettings } from '../types';

interface HeroSpotlightProps {
  settings: StoreSettings;
  featuredApps: AppRecord[];
  onSelectApp: (app: AppRecord) => void;
  onOpenAdmin: () => void;
  hasApps: boolean;
}

export function HeroSpotlight({
  settings,
  featuredApps,
  onSelectApp,
  onOpenAdmin,
  hasApps,
}: HeroSpotlightProps) {
  return (
    <div className="relative overflow-hidden pt-6 pb-4">
      {/* Optional Admin Hero Notice / Announcement */}
      {settings.heroNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="font-medium flex-1 truncate">{settings.heroNotice}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {featuredApps.length > 0 ? (
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800">
            {/* Background decorative glows */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
                  <Zap className="w-3.5 h-3.5" /> Featured Spotlight
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                  {featuredApps[0].name}
                </h1>
                <p className="text-slate-300 text-sm sm:text-base line-clamp-2 mb-6">
                  {featuredApps[0].shortDescription || featuredApps[0].description}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => onSelectApp(featuredApps[0])}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download App ({featuredApps[0].version})</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
                      {featuredApps[0].architecture || 'Universal'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
                      {featuredApps[0].category}
                    </span>
                    {featuredApps[0].packageFile && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 uppercase font-mono">
                        .{featuredApps[0].packageFile.extension}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* App Icon / Preview */}
              <div className="shrink-0 flex items-center justify-center">
                <div
                  onClick={() => onSelectApp(featuredApps[0])}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-slate-800/90 border border-slate-700 p-3 shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                >
                  {featuredApps[0].icon ? (
                    <img
                      src={`/api/media/${featuredApps[0].icon.fileId}`}
                      alt={featuredApps[0].name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-3xl font-bold">
                      {featuredApps[0].name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Welcome Hero */
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/80 dark:to-slate-950 p-6 sm:p-8 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> High-Speed Private Software Repository
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
              {settings.siteName || 'AppHaven'}
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6">
              {settings.tagline || 'Download verified APKs, executables, ZIP archives, and desktop applications directly from your computer with real chunked high-speed storage.'}
            </p>

            {/* Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left mb-4">
              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">100% Verified Files</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Cryptographic SHA-256 integrity hashes for each build.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Real Object Storage</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Resumable uploads up to 1000 MB directly from your computer.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Multi-Platform</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Built for Android (APK), Windows (EXE/MSI), and ZIP bundles.</p>
                </div>
              </div>
            </div>

            {!hasApps && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">Marketplace is currently empty. Ready to publish your apps?</span>
                <button
                  onClick={onOpenAdmin}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Open Owner Dashboard & Upload First App
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
