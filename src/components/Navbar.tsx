import React from 'react';
import { Search, Sun, Moon, Shield, ShieldCheck, Sparkles, X, PlusCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { StoreSettings } from '../types';

interface NavbarProps {
  settings: StoreSettings;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAdmin: () => void;
  onOpenNewApp?: () => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
}

export function Navbar({
  settings,
  searchQuery,
  onSearchChange,
  onOpenAdmin,
  onOpenNewApp,
  isAdminView,
  onToggleAdminView,
}: NavbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isAuthenticated, adminUsername } = useAdminAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => { if (isAdminView) onToggleAdminView(); }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md text-white font-bold text-xl relative overflow-hidden transition-transform hover:scale-105"
              style={{
                background: settings.accentColor
                  ? `linear-gradient(135deg, ${settings.accentColor}, #4f46e5)`
                  : 'linear-gradient(135deg, #3b82f6, #4f46e5)'
              }}
            >
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  {settings.siteName || 'AppHaven'}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Verified
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px]">
                {settings.tagline || 'Open App & Game Repository'}
              </p>
            </div>
          </div>

          {/* Search Bar (Only shown on public view or toggles) */}
          {!isAdminView ? (
            <div className="flex-1 max-w-lg mx-2 sm:mx-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search apps, games, tools, or developers..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Owner Administration Console
              </span>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Quick Upload button if admin is logged in */}
            {isAuthenticated && onOpenNewApp && (
              <button
                onClick={onOpenNewApp}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload App</span>
              </button>
            )}

            {/* Admin Switcher / Login button */}
            {isAuthenticated ? (
              <button
                onClick={onToggleAdminView}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isAdminView
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isAdminView ? 'View Store' : 'Admin'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Admin Portal</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
