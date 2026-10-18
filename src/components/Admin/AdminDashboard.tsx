import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  HardDrive,
  Download,
  ShieldCheck,
  Palette,
  BookOpen,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  FileCode
} from 'lucide-react';
import { AppRecord, AdminStats, StoreSettings } from '../../types';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  fetchAdminApps,
  fetchAdminStats,
  deleteAppRecord,
  updateAppRecord,
  seedDemoApps
} from '../../services/api';

interface AdminDashboardProps {
  settings: StoreSettings;
  onOpenUpload: (appToEdit?: AppRecord) => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onViewStore: () => void;
  onAppCreatedOrUpdated: () => void;
}

export function AdminDashboard({
  settings,
  onOpenUpload,
  onOpenSettings,
  onOpenGuide,
  onViewStore,
  onAppCreatedOrUpdated,
}: AdminDashboardProps) {
  const { token, logout, adminUsername } = useAdminAuth();

  const [apps, setApps] = useState<AppRecord[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [fetchedApps, fetchedStats] = await Promise.all([
        fetchAdminApps(token),
        fetchAdminStats(token),
      ]);
      setApps(fetchedApps);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick toggle status (published vs draft)
  const handleToggleStatus = async (app: AppRecord) => {
    if (!token) return;
    const newStatus = app.status === 'published' ? 'draft' : 'published';
    try {
      await updateAppRecord(token, app.id, { status: newStatus });
      setApps(prev => prev.map(a => (a.id === app.id ? { ...a, status: newStatus } : a)));
      showToast(`Software status changed to ${newStatus}.`);
      onAppCreatedOrUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Delete App
  const handleDeleteApp = async (id: string, name: string) => {
    if (!token) return;
    const confirmed = confirm(`Are you sure you want to permanently delete "${name}"? This will also wipe its binary packages and images from server disk storage.`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteAppRecord(token, id);
      setApps(prev => prev.filter(a => a.id !== id));
      showToast(`"${name}" was permanently removed from storage.`);
      loadData();
      onAppCreatedOrUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete app');
    } finally {
      setDeletingId(null);
    }
  };

  // Seed verified demo apps
  const handleSeedDemo = async () => {
    if (!token) return;
    setSeeding(true);
    try {
      await seedDemoApps(token);
      showToast('3 Verified demo apps added to catalog.');
      await loadData();
      onAppCreatedOrUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to seed demo apps');
    } finally {
      setSeeding(false);
    }
  };

  // Filtered Apps
  const filteredApps = apps.filter(app => {
    if (filterStatus === 'published' && app.status !== 'published') return false;
    if (filterStatus === 'draft' && app.status !== 'draft') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.developer.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar with Admin Welcome and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Authenticated Administrator
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {settings.siteName} Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Logged in as <strong className="text-slate-700 dark:text-slate-300">{adminUsername}</strong> • Only you have permission to upload, edit, or delete items.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenUpload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New App</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Palette className="w-4 h-4 text-indigo-500" />
            <span>Branding & Settings</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Windows & APK Guide</span>
          </button>

          <button
            onClick={onViewStore}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>Public Storefront</span>
          </button>

          <button
            onClick={logout}
            title="Sign out"
            className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics & Storage Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Applications</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats ? stats.totalApps : apps.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {stats ? stats.publishedApps : 0} published • {stats ? stats.draftApps : 0} drafts
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Public Live Items</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats ? stats.publishedApps : 0}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Visible to all visitors</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Downloads</span>
            <Download className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats ? stats.totalDownloads : 0}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Verified download streams</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Disk Storage Used</span>
            <HardDrive className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats?.storageFormatted || '0.00 MB'}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Files stored in /data/uploads/
          </span>
        </div>
      </div>

      {/* App Catalog Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Software Catalog</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredApps.length} item{filteredApps.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('published')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterStatus === 'published'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setFilterStatus('draft')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterStatus === 'draft'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Drafts
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>
        </div>

        {/* Catalog Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading software items...</span>
          </div>
        ) : filteredApps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Software</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Platform</th>
                  <th className="pb-3">Binary File</th>
                  <th className="pb-3">Downloads</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Software info */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                          {app.icon ? (
                            <img src={`/api/media/${app.icon.fileId}`} alt={app.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                              {app.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{app.name}</span>
                            {app.featured && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Featured
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {app.developer} • <code className="font-mono">v{app.version}</code>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 text-slate-700 dark:text-slate-300">
                      <span>{app.category}</span>
                    </td>

                    {/* Platform */}
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        {app.architecture || 'Universal'}
                      </span>
                    </td>

                    {/* Binary File info */}
                    <td className="py-3.5">
                      {app.packageFile ? (
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                          <FileCode className="w-3.5 h-3.5" />
                          <span className="uppercase font-mono font-bold text-[11px]">
                            .{app.packageFile.extension}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({(app.packageFile.fileSize / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No file attached</span>
                      )}
                    </td>

                    {/* Downloads */}
                    <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {app.downloadsCount}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5">
                      <button
                        onClick={() => handleToggleStatus(app)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          app.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                        title="Click to toggle publish / draft"
                      >
                        {app.status === 'published' ? (
                          <>
                            <Eye className="w-3 h-3" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Draft
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenUpload(app)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit software metadata or upload new files"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {app.packageFile && (
                          <a
                            href={`/api/download/${app.packageFile.fileId}`}
                            download
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                            title="Direct download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteApp(app.id, app.name)}
                          disabled={deletingId === app.id}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
                          title="Delete app and storage files"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty Catalog State */
          <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Your Marketplace Catalog is Empty
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              You are the administrator. Upload real APKs, Windows executables, ZIP archives, or game bundles directly from your computer.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onOpenUpload()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload First App from Computer</span>
              </button>

              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{seeding ? 'Seeding...' : 'Populate with 3 Demo Apps'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
