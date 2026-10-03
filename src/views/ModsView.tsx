import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Download,
  Check,
  Sparkles,
  Sliders,
  ExternalLink,
  Flame,
  FolderGit2,
  Zap,
  Star,
  Layers,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { ModItem, Instance, InstalledMod } from '../types';

interface ModsViewProps {
  onInstallProject: (
    projectId: string,
    projectType: string,
    instanceId?: string,
    gameVersion?: string,
    loader?: string
  ) => Promise<{ success: boolean; filename: string; dependencies?: string[] }>;
  activeInstance?: Instance;
  installedMods?: InstalledMod[];
  onShowToast?: (toast: {
    type: 'success' | 'error' | 'info';
    title: string;
    message?: string;
    details?: string[];
    actionLabel?: string;
    onAction?: () => void;
  }) => void;
  onNavigateTab?: (tab: 'installed-mods') => void;
}

export const ModsView: React.FC<ModsViewProps> = ({
  onInstallProject,
  activeInstance,
  installedMods,
  onShowToast,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');
  const [projectType, setProjectType] = useState<'mod' | 'shader' | 'resourcepack'>('mod');
  const [loader, setLoader] = useState<'fabric' | 'forge' | 'neoforge' | 'quilt' | 'all'>(
    (activeInstance?.loader as any) || 'fabric'
  );
  const [mods, setMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  // Quick preset filter chips
  const quickChips = [
    { label: '⚡ Макс. FPS', search: 'sodium' },
    { label: '✨ Шейдеры Iris', search: 'iris' },
    { label: '🗺️ Миникарта', search: 'xaero' },
    { label: '🍎 Инфо о еде', search: 'appleskin' },
    { label: '🛠️ Create', search: 'create' },
    { label: '📖 Рецепты JEI', search: 'jei' },
    { label: '🌌 Оптимизация памяти', search: 'ferritecore' },
  ];

  const searchProjects = async (customQuery?: string) => {
    setLoading(true);
    const q = customQuery !== undefined ? customQuery : query;
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.searchModrinth(q, {
          projectType,
          loader: loader === 'all' ? undefined : loader,
          version: activeInstance?.minecraftVersion,
          limit: 28,
        });
        setMods(res.hits || []);
      }
    } catch (e) {
      console.error('Failed to search mods:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeInstance?.loader && activeInstance.loader !== 'vanilla') {
      setLoader(activeInstance.loader as any);
    }
  }, [activeInstance?.loader]);

  useEffect(() => {
    searchProjects();
  }, [projectType, loader, activeInstance?.minecraftVersion, activeInstance?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    searchProjects();
  };

  const handleChipClick = (term: string) => {
    sounds.playClick();
    setQuery(term);
    searchProjects(term);
  };

  const handleInstall = async (mod: ModItem) => {
    sounds.playClick();
    const targetId = mod.project_id || mod.slug || mod.id;
    if (!targetId) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Ошибка',
          message: 'Идентификатор проекта Modrinth не найден',
        });
      }
      return;
    }

    setInstallingId(targetId);
    try {
      const effectiveLoader = (activeInstance?.loader && activeInstance.loader !== 'vanilla')
        ? activeInstance.loader
        : (loader && loader !== 'all' ? loader : 'fabric');

      const res = await onInstallProject(
        targetId,
        projectType,
        activeInstance?.id,
        activeInstance?.minecraftVersion,
        effectiveLoader
      );
      if (res && res.success) {
        sounds.playPop();
        setInstalledIds((prev) => new Set([...prev, targetId]));
        const depsCount = res.dependencies?.length || 0;
        const msg = depsCount > 0
          ? `Успешно установлен файл "${res.filename}" и ${depsCount} зависимостей.`
          : `Файл "${res.filename}" успешно добавлен в сборку.`;

        if (onShowToast) {
          onShowToast({
            type: 'success',
            title: `Мод "${mod.title}" установлен!`,
            message: msg,
            details: res.dependencies && res.dependencies.length > 0 ? res.dependencies : undefined,
            actionLabel: 'Мои моды',
            onAction: () => onNavigateTab?.('installed-mods'),
          });
        }
      }
    } catch (e) {
      sounds.playError();
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Ошибка при установке мода',
          message: (e as any)?.message || 'Не удалось скачать мод',
        });
      }
    } finally {
      setInstallingId(null);
    }
  };

  const formatDownloads = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-emerald-400" />
            <span>Каталог модов Modrinth</span>
          </h1>

          {/* Active instance target badge */}
          {activeInstance && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Установка в экземпляр:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold shadow-inner">
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeInstance.name}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-[11px] text-cyan-300">MC {activeInstance.minecraftVersion}</span>
                <span className="text-slate-500">•</span>
                <span className="capitalize text-[11px]">{activeInstance.loader}</span>
              </span>
            </div>
          )}
        </div>

        {/* Project type filter */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
          <button
            onClick={() => {
              sounds.playClick();
              setProjectType('mod');
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              projectType === 'mod'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Моды
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setProjectType('shader');
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              projectType === 'shader'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Шейдеры
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setProjectType('resourcepack');
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              projectType === 'resourcepack'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ресурспаки
          </button>
        </div>
      </div>

      {/* Quick Search Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex-shrink-0 mr-1">
          Быстрый поиск:
        </span>
        {quickChips.map((c) => (
          <button
            key={c.label}
            onClick={() => handleChipClick(c.search)}
            className="flex-shrink-0 px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs text-slate-300 hover:text-white transition-all font-medium"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search Bar & Loader Filter */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              projectType === 'mod'
                ? 'Поиск модов (Sodium, Iris, Lithium, JEI, WorldEdit...)'
                : projectType === 'shader'
                ? 'Поиск шейдеров (Complementary, BSL, Bliss...)'
                : 'Поиск текстурпаков (Faithful, Bare Bones...)'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 shadow-inner select-text cursor-text"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-colors shadow-sm"
          >
            Найти
          </button>
        </form>

        {projectType === 'mod' && (
          <select
            value={loader}
            onChange={(e) => setLoader(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 font-medium"
          >
            <option value="fabric">Fabric</option>
            <option value="forge">Forge</option>
            <option value="neoforge">NeoForge</option>
            <option value="quilt">Quilt</option>
            <option value="all">Все загрузчики</option>
          </select>
        )}
      </div>

      {/* Grid of Mods */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Sparkles className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="font-medium">Загрузка каталога Modrinth...</span>
          </div>
        ) : mods.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Package className="w-8 h-8 opacity-30 mb-2" />
            <span>Ничего не найдено по вашему запросу</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 pb-4">
            {mods.map((mod) => {
              const targetId = mod.project_id || mod.slug || mod.id;
              const isMatchByInstalledMods = installedMods?.some((m) => {
                const fname = m.filename.toLowerCase();
                const slug = (mod.slug || '').toLowerCase();
                const titleSlug = (mod.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return (
                  (slug && fname.includes(slug)) ||
                  (titleSlug.length > 3 && fname.replace(/[^a-z0-9]/g, '').includes(titleSlug))
                );
              });
              const isInstalled = installedIds.has(targetId) || isMatchByInstalledMods;
              const isBusy = installingId === targetId;

              return (
                <div
                  key={targetId}
                  className="flex items-start justify-between p-4 rounded-3xl glass-card hover:border-emerald-500/40 transition-all hover:scale-[1.01] group shadow-md"
                >
                  <div className="flex items-start gap-3.5 overflow-hidden pr-2 flex-1 min-w-0">
                    {mod.icon_url ? (
                      <img
                        src={mod.icon_url}
                        alt={mod.title}
                        className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl object-cover bg-black/40 flex-shrink-0 border border-white/[0.08] shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                        <Package className="w-6 h-6" />
                      </div>
                    )}

                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-xs truncate group-hover:text-emerald-300 transition-colors">
                          {mod.title}
                        </h3>
                        {isInstalled && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> В сборке
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 truncate">от {mod.author}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {mod.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 flex items-center gap-1 font-mono font-semibold border border-white/5">
                          <Download className="w-3 h-3 text-emerald-400" />
                          {formatDownloads(mod.downloads)}
                        </span>

                        {mod.categories?.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
                            className="text-[9px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono capitalize border border-emerald-500/20 font-bold"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Install button */}
                  <button
                    onClick={() => handleInstall(mod)}
                    disabled={isBusy}
                    title={isInstalled ? 'Нажмите, чтобы переустановить или обновить' : undefined}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs flex-shrink-0 transition-all ${
                      isInstalled
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 hover:text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                    } disabled:opacity-50`}
                  >
                    {isBusy ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Скачивание...</span>
                      </>
                    ) : isInstalled ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                        <span>Установлен</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Скачать</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
