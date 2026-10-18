import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Filter,
  ArrowUpDown,
  Search,
  Sparkles,
  ShieldCheck,
  HardDrive,
  Cpu,
  Layers,
  ChevronDown
} from 'lucide-react';
import { AppRecord, StoreSettings, CategoryInfo } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { fetchSettings, fetchCategories, fetchApps } from './services/api';
import { Navbar } from './components/Navbar';
import { CategoryNav } from './components/CategoryNav';
import { HeroSpotlight } from './components/HeroSpotlight';
import { AppCard } from './components/AppCard';
import { AppDetailModal } from './components/AppDetailModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminAuthModal } from './components/Admin/AdminAuthModal';
import { AppUploadModal } from './components/Admin/AppUploadModal';
import { SettingsModal } from './components/Admin/SettingsModal';
import { SetupGuideModal } from './components/Admin/SetupGuideModal';

const DEFAULT_SETTINGS: StoreSettings = {
  siteName: 'AppHaven',
  tagline: 'The Open App & Game Repository — Fast, Verified & Direct Downloads',
  accentColor: '#4f46e5',
  allowPublicRatings: true,
  footerText: 'AppHaven is an independent software repository. All software packages are tested for cryptographic integrity.',
  defaultTheme: 'system',
};

function MarketplaceContent() {
  const { isAuthenticated, isConfigured } = useAdminAuth();

  // Settings & Navigation
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'recent' | 'downloads' | 'rating' | 'name'>('recent');

  // App catalog data
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);

  // Admin view & Modals
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [appToEdit, setAppToEdit] = useState<AppRecord | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Download notification toast
  const [activeDownload, setActiveDownload] = useState<{
    appName: string;
    version: string;
    ext: string;
  } | null>(null);

  // Load Settings and Categories
  const loadInitialMeta = useCallback(async () => {
    try {
      const [st, cats] = await Promise.all([fetchSettings(), fetchCategories()]);
      setSettings(st);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load initial marketplace metadata:', err);
    }
  }, []);

  // Load Published Apps for Public Storefront
  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApps({
        category: selectedCategory,
        search: searchQuery,
        sort: sortOption,
      });
      setApps(data);
    } catch (err) {
      console.error('Failed to fetch store apps:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortOption]);

  useEffect(() => {
    loadInitialMeta();
  }, [loadInitialMeta]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // Direct File Download Trigger
  const handleDownload = (app: AppRecord) => {
    if (!app.packageFile) return;

    setActiveDownload({
      appName: app.name,
      version: app.version,
      ext: app.packageFile.extension.toUpperCase(),
    });

    // Increment downloads in local state immediately for responsive feel
    setApps(prev =>
      prev.map(a => (a.id === app.id ? { ...a, downloadsCount: (a.downloadsCount || 0) + 1 } : a))
    );
    if (selectedApp && selectedApp.id === app.id) {
      setSelectedApp(prev => prev ? { ...prev, downloadsCount: (prev.downloadsCount || 0) + 1 } : null);
    }

    // Trigger browser download via invisible link
    const downloadUrl = `/api/download/${app.packageFile.fileId}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = app.packageFile.originalName || `${app.name}.${app.packageFile.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setActiveDownload(null);
    }, 4000);
  };

  const handleQuickDownload = (e: React.MouseEvent, app: AppRecord) => {
    e.stopPropagation();
    handleDownload(app);
  };

  const handleOpenAdmin = () => {
    if (isAuthenticated) {
      setIsAdminView(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const featuredApps = apps.filter(a => a.featured);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        settings={settings}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAdmin={handleOpenAdmin}
        onOpenNewApp={
          isAuthenticated
            ? () => {
                setAppToEdit(null);
                setIsUploadModalOpen(true);
              }
            : undefined
        }
        isAdminView={isAdminView}
        onToggleAdminView={() => setIsAdminView(!isAdminView)}
      />

      {/* Main Content Area */}
      {isAdminView && isAuthenticated ? (
        /* Owner Administrator Dashboard */
        <main className="flex-1">
          <AdminDashboard
            settings={settings}
            onOpenUpload={(app) => {
              setAppToEdit(app || null);
              setIsUploadModalOpen(true);
            }}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenGuide={() => setIsGuideModalOpen(true)}
            onViewStore={() => setIsAdminView(false)}
            onAppCreatedOrUpdated={() => {
              loadApps();
              loadInitialMeta();
            }}
          />
        </main>
      ) : (
        /* Public Marketplace Storefront */
        <main className="flex-1 pb-16">
          {/* Category Bar */}
          <CategoryNav
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            totalAppsCount={apps.length}
          />

          {/* Hero Spotlight / Welcome */}
          {!searchQuery && selectedCategory === 'All' && (
            <HeroSpotlight
              settings={settings}
              featuredApps={featuredApps}
              onSelectApp={setSelectedApp}
              onOpenAdmin={handleOpenAdmin}
              hasApps={apps.length > 0}
            />
          )}

          {/* Apps Section Header & Sort Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {searchQuery
                    ? `Search results for "${searchQuery}"`
                    : selectedCategory === 'All'
                    ? 'Explore Software & Games'
                    : `${selectedCategory}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct, high-speed downloads with verified SHA-256 security checksums.
                </p>
              </div>

              {/* Sort controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
                </span>
                <select
                  value={sortOption}
                  onChange={(e: any) => setSortOption(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-xs"
                >
                  <option value="recent">Recently Added</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Software Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-medium text-slate-400">Loading verified applications...</p>
              </div>
            ) : apps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-6">
                {apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onClick={() => setSelectedApp(app)}
                    onQuickDownload={handleQuickDownload}
                  />
                ))}
              </div>
            ) : (
              /* Empty Storefront State */
              <div className="py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800/80 p-8 my-6">
                <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {searchQuery ? 'No matching applications found' : 'No applications published yet'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms or browsing another category.'
                    : 'The marketplace currently has no published software. Open the Owner Dashboard to upload APKs, ZIPs, or executables directly from your computer.'}
                </p>

                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    Clear Search Query
                  </button>
                ) : (
                  <button
                    onClick={handleOpenAdmin}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
                  >
                    Open Owner Dashboard
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-200">{settings.siteName}</span>
            <span className="ml-2">— {settings.footerText}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Windows & APK Guide
            </button>
            <span>•</span>
            <button
              onClick={handleOpenAdmin}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Owner Portal
            </button>
          </div>
        </div>
      </footer>

      {/* Real-time Download Toast Notification */}
      {activeDownload && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-indigo-900 text-white shadow-2xl border border-indigo-700 flex items-center gap-3 animate-fadeIn">
          <div className="p-2 rounded-xl bg-indigo-600">
            <Download className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-bold">
              Downloading {activeDownload.appName} ({activeDownload.ext})
            </p>
            <p className="text-[11px] text-indigo-300">
              Streaming binary directly from storage...
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onDownload={handleDownload}
          onAppUpdated={(updated) => {
            setSelectedApp(updated);
            setApps(prev => prev.map(a => (a.id === updated.id ? updated : a)));
          }}
        />
      )}

      {/* Admin Auth / Setup Wizard Modal */}
      {isAuthModalOpen && (
        <AdminAuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            setIsAdminView(true);
          }}
        />
      )}

      {/* App Upload & Edit Modal */}
      {isUploadModalOpen && (
        <AppUploadModal
          initialApp={appToEdit}
          categories={categories.map(c => c.name)}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            loadApps();
            loadInitialMeta();
          }}
        />
      )}

      {/* Settings / Branding Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          currentSettings={settings}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdated={(newSettings) => {
            setSettings(newSettings);
          }}
        />
      )}

      {/* Setup Guide Modal */}
      {isGuideModalOpen && (
        <SetupGuideModal onClose={() => setIsGuideModalOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <MarketplaceContent />
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
