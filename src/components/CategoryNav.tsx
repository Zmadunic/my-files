import React from 'react';
import {
  Layers,
  Gamepad2,
  Wrench,
  Briefcase,
  MessageSquare,
  Film,
  Music,
  ShieldCheck,
  Code2,
  GraduationCap
} from 'lucide-react';
import { CategoryInfo } from '../types';

interface CategoryNavProps {
  categories: CategoryInfo[];
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
  totalAppsCount: number;
}

export function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  totalAppsCount,
}: CategoryNavProps) {
  const getIcon = (cat: string) => {
    const l = cat.toLowerCase();
    if (l.includes('game')) return <Gamepad2 className="w-4 h-4" />;
    if (l.includes('tool') || l.includes('util')) return <Wrench className="w-4 h-4" />;
    if (l.includes('prod')) return <Briefcase className="w-4 h-4" />;
    if (l.includes('comm')) return <MessageSquare className="w-4 h-4" />;
    if (l.includes('media') || l.includes('video')) return <Film className="w-4 h-4" />;
    if (l.includes('music') || l.includes('audio')) return <Music className="w-4 h-4" />;
    if (l.includes('sec') || l.includes('priv')) return <ShieldCheck className="w-4 h-4" />;
    if (l.includes('dev') || l.includes('it') || l.includes('code')) return <Code2 className="w-4 h-4" />;
    if (l.includes('edu')) return <GraduationCap className="w-4 h-4" />;
    return <Layers className="w-4 h-4" />;
  };

  return (
    <div className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar scroll-smooth">
          {/* 'All' button */}
          <button
            onClick={() => onSelectCategory('All')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'All'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Categories</span>
            {totalAppsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedCategory === 'All' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {totalAppsCount}
              </span>
            )}
          </button>

          {/* Dynamic categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                onClick={() => onSelectCategory(cat.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {getIcon(cat.name)}
                <span>{cat.name}</span>
                {cat.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
