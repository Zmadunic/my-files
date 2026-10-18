import React, { useState } from 'react';
import { X, Palette, Check, Save } from 'lucide-react';
import { StoreSettings } from '../../types';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { updateStoreSettings } from '../../services/api';

interface SettingsModalProps {
  currentSettings: StoreSettings;
  onClose: () => void;
  onUpdated: (newSettings: StoreSettings) => void;
}

const COLOR_PRESETS = [
  { name: 'Indigo Blue', hex: '#4f46e5' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Sky Cyan', hex: '#0284c7' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Violet Purple', hex: '#7c3aed' },
  { name: 'Rose Red', hex: '#e11d48' },
  { name: 'Amber Orange', hex: '#d97706' },
  { name: 'Slate Dark', hex: '#334155' },
];

export function SettingsModal({
  currentSettings,
  onClose,
  onUpdated,
}: SettingsModalProps) {
  const { token } = useAdminAuth();

  const [siteName, setSiteName] = useState(currentSettings.siteName);
  const [tagline, setTagline] = useState(currentSettings.tagline);
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoUrl || '');
  const [accentColor, setAccentColor] = useState(currentSettings.accentColor || '#4f46e5');
  const [heroNotice, setHeroNotice] = useState(currentSettings.heroNotice || '');
  const [contactEmail, setContactEmail] = useState(currentSettings.contactEmail || '');
  const [footerText, setFooterText] = useState(currentSettings.footerText || '');
  const [defaultTheme, setDefaultTheme] = useState(currentSettings.defaultTheme || 'system');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await updateStoreSettings(token, {
        siteName: siteName.trim(),
        tagline: tagline.trim(),
        logoUrl: logoUrl.trim(),
        accentColor,
        heroNotice: heroNotice.trim(),
        contactEmail: contactEmail.trim(),
        footerText: footerText.trim(),
        defaultTheme,
      });
      onUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Marketplace Customization & Branding
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Change your marketplace name, tagline, colors, announcement banner, and themes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="overflow-y-auto py-5 space-y-5 flex-1 pr-1">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" /> Settings updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Marketplace Brand Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. AppHaven, NovaStore, PlayVault"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custom Logo URL (Optional)
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... or leave empty for icon"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Store Tagline / Subtitle
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. The Open App & Game Repository — Fast, Verified & Direct Downloads"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Brand Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setAccentColor(color.hex)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    accentColor === color.hex ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {accentColor === color.hex && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="text-xs font-mono text-slate-500">{accentColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hero Announcement Banner (Shown at top of public store)
            </label>
            <input
              type="text"
              value={heroNotice}
              onChange={(e) => setHeroNotice(e.target.value)}
              placeholder="e.g. Welcome! All APK and desktop packages are tested for security."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Color Theme
              </label>
              <select
                value={defaultTheme}
                onChange={(e: any) => setDefaultTheme(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="system">Auto / System Preference</option>
                <option value="dark">Dark Theme Default</option>
                <option value="light">Light Theme Default</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Owner Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Footer Notice / Copyright
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="AppHaven is an independent software repository..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Footer Save Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Brand Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
