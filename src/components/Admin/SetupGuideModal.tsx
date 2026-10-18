import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Terminal,
  Server,
  Smartphone,
  Copy,
  Check,
  Cloud,
  HardDrive,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface SetupGuideModalProps {
  onClose: () => void;
}

export function SetupGuideModal({ onClose }: SetupGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'windows' | 'deploy' | 'storage' | 'android'>('windows');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Setup, Deployment & Android APK Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed instructions for running on Windows, deploying online, and wrapping as an Android APK.
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

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pt-3 shrink-0">
          <button
            onClick={() => setActiveTab('windows')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'windows'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Windows Setup Guide
          </button>

          <button
            onClick={() => setActiveTab('deploy')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'deploy'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" /> Deploy Online (VPS / Cloud)
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'storage'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" /> Object Storage (1GB+)
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'android'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Convert to Android APK
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto py-5 space-y-4 flex-1 text-xs text-slate-600 dark:text-slate-300 pr-1">
          {/* TAB 1: WINDOWS SETUP */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-500" /> Running AppHaven on Windows (10/11)
                </h3>
                <p className="leading-relaxed mb-3">
                  AppHaven runs natively on Windows using Node.js. No complex Docker setup required.
                </p>

                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Step 1: Install Node.js LTS</span>
                    <p className="text-slate-500 mt-0.5">Download and install Node.js 20+ from <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">https://nodejs.org</code></p>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Step 2: Clone / Extract the project</span>
                    <p className="text-slate-500 mt-0.5">Open PowerShell or Command Prompt in the project directory:</p>
                    <div className="relative mt-1">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
npm install
                      </pre>
                      <button
                        onClick={() => copyCode('npm install', 1)}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Step 3: Run the Development or Production Server</span>
                    <div className="relative mt-1">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
# To run locally in development mode:
npm run dev

# To build for production and launch:
npm run build
npm start
                      </pre>
                      <button
                        onClick={() => copyCode('npm run dev', 2)}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Step 4: Open in Your Browser</span>
                    <p className="text-slate-500 mt-0.5">Navigate to <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-500">http://localhost:3000</code>. On your first visit, open the Admin Portal to set your private master credentials.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPLOY ONLINE */}
          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-500" /> Deploying to Production (Cloud Run / VPS / Docker)
                </h3>
                <p className="leading-relaxed mb-3">
                  Because AppHaven has its own built-in Express server with chunked storage and atomic JSON database, you can deploy it on any Node.js host.
                </p>

                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Option A: Docker Deployment (Recommended for VPS / Hetzner / DigitalOcean)</span>
                    <div className="relative mt-1">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
# Dockerfile snippet:
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["npm", "start"]
                      </pre>
                      <button
                        onClick={() => copyCode('docker build -t apphaven . && docker run -d -p 3000:3000 -v apphaven_data:/app/data apphaven', 3)}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Option B: PM2 on Linux Server</span>
                    <div className="relative mt-1">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
npm install -g pm2
npm run build
pm2 start server.ts --name apphaven --interpreter ./node_modules/.bin/tsx
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OBJECT STORAGE */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-500" /> File Storage & 1000 MB Upload Engine
                </h3>
                <p className="leading-relaxed mb-3">
                  AppHaven includes a high-performance <strong>Resumable Chunked Storage Engine</strong> in <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">server/storage.ts</code>.
                </p>

                <div className="space-y-2">
                  <p>
                    <strong>1. Local High-Speed Storage (Default):</strong> Uploads are received in 2MB chunks, streamed directly to disk in <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">data/uploads/</code>, verified with SHA-256 hash checks, and cleaned up automatically if cancelled. Files up to 1000MB are supported with zero external cloud dependencies!
                  </p>
                  <p>
                    <strong>2. Cloud Object Storage (S3 / Supabase / Cloudflare R2 / Firebase):</strong> If you want to offload files to Amazon S3, Cloudflare R2, or Supabase Storage, you can simply set the following environment variables in your <code className="font-mono">.env</code>:
                  </p>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_BUCKET=my-app-store
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ANDROID APK */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500" /> Converting AppHaven into an Android App / APK
                </h3>
                <p className="leading-relaxed mb-3">
                  You can convert this repository into an installable Android APK file using Capacitor or Bubblewrap (Google's official Trusted Web Activity tool).
                </p>

                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Method 1: Capacitor (Recommended for Full APK Build)</span>
                    <div className="relative mt-1">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor
npx cap init "AppHaven" "com.apphaven.store"

# 3. Add Android platform
npx cap add android

# 4. Open in Android Studio and build APK
npx cap open android
# In Android Studio: Select Build | Build Bundle(s) / APK(s) | Build APK(s)
                      </pre>
                      <button
                        onClick={() => copyCode('npx cap add android && npx cap open android', 4)}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {copiedIndex === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Method 2: Google Bubblewrap (Instant Play Store APK / AAB)</span>
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto mt-1">
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://your-domain.com/manifest.json
bubblewrap build
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
