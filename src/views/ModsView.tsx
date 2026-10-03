import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Search,
  Download,
  Check,
  Sparkles,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  Palette,
  Eye,
  Filter,
  Layers,
  Upload,
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
  const [projectType, setProjectType] = useState<'mod' | 'modpack' | 'shader' | 'resourcepack'>('mod');
  const [loader, setLoader] = useState<'fabric' | 'forge' | 'neoforge' | 'quilt' | 'all'>(
    (activeInstance?.loader as any) || 'fabric'
  );
  const [filterByVersion, setFilterByVersion] = useState<boolean>(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalHits, setTotalHits] = useState(0);

  const [mods, setMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [packProgress, setPackProgress] = useState<{ status: string; progress: number; current?: number; total?: number } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Listen to live modpack installation progress
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onMrpackProgress) return;
    const unsub = api.onMrpackProgress((data: any) => {
      setPackProgress(data);
      if (data.progress >= 100) {
        setTimeout(() => setPackProgress(null), 3000);
      }
    });
    return () => unsub?.();
  }, []);

  // Context-aware Quick Search Chips
  const modChips = [
    { label: '⚡ Макс. FPS', search: 'sodium' },
    { label: '✨ Шейдеры Iris', search: 'iris' },
    { label: '🗺️ Миникарта', search: 'xaero' },
    { label: '🍎 Инфо о еде', search: 'appleskin' },
    { label: '🛠️ Create', search: 'create' },
    { label: '📖 Рецепты JEI', search: 'jei' },
    { label: '🌌 Память FerriteCore', search: 'ferritecore' },
    { label: '🔊 Звуки шагов', search: 'presence footsteps' },
  ];

  const modpackChips = [
    { label: '🚀 Fabulously Optimized', search: 'fabulously optimized' },
    { label: '🐾 Cobblemon', search: 'cobblemon' },
    { label: '⚡ Simply Optimized', search: 'simply optimized' },
    { label: '🏰 Medieval MC', search: 'medieval' },
    { label: '⚙️ Better MC', search: 'better mc' },
    { label: '🧟 Zombie 100 Days', search: 'zombie' },
    { label: '🌌 All the Mods', search: 'all the mods' },
    { label: '✨ Adrenaline', search: 'adrenaline' },
  ];

  const shaderChips = [
    { label: '🌟 Complementary Reimagined', search: 'complementary reimagined' },
    { label: '✨ BSL Shaders', search: 'bsl' },
    { label: '🌄 Solas Shaders', search: 'solas' },
    { label: '🌿 Complementary Unbound', search: 'complementary unbound' },
    { label: '⚡ MakeUp Ultra Fast', search: 'makeup' },
    { label: '💎 Bliss Shaders', search: 'bliss' },
    { label: '☀️ AstraLex', search: 'astralex' },
    { label: '🕯️ Sildur\'s', search: 'sildur' },
  ];

  const resourcePackChips = [
    { label: '🏃 Fresh Animations', search: 'fresh animations' },
    { label: '📦 Bare Bones', search: 'bare bones' },
    { label: '🎨 Faithful 32x', search: 'faithful' },
    { label: '🌳 Stay True', search: 'stay true' },
    { label: '⚔️ Compliance 32x', search: 'compliance' },
    { label: '🌙 Темный интерфейс', search: 'dark' },
    { label: '🔥 Low Fire / PvP', search: 'low fire' },
    { label: '🍃 Better Leaves', search: 'better leaves' },
  ];

  const currentChips =
    projectType === 'shader'
      ? shaderChips
      : projectType === 'resourcepack'
      ? resourcePackChips
      : projectType === 'modpack'
      ? modpackChips
      : modChips;

  const searchProjects = async (
    customQuery?: string,
    targetPage: number = 1,
    customType?: 'mod' | 'modpack' | 'shader' | 'resourcepack',
    customLoader?: string,
    customFilterVersion?: boolean
  ) => {
    setLoading(true);
    const q = customQuery !== undefined ? customQuery : query;
    const type = customType || projectType;
    const effLoader = customLoader !== undefined ? customLoader : loader;
    const shouldFilterVersion =
      customFilterVersion !== undefined
        ? customFilterVersion
        : type === 'mod'
        ? true
        : filterByVersion;

    const offset = Math.max(0, (targetPage - 1) * pageSize);

    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.searchModrinth(q, {
          projectType: type,
          loader: (type === 'mod' || type === 'modpack') && effLoader !== 'all' ? effLoader : undefined,
          version: shouldFilterVersion ? activeInstance?.minecraftVersion : undefined,
          limit: pageSize,
          offset,
        });

        setMods(res.hits || []);
        setTotalHits(res.total_hits || 0);
        setPage(targetPage);
      }
    } catch (e) {
      console.error('Failed to search projects:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sync loader filter when active instance changes
  useEffect(() => {
    if (activeInstance?.loader && activeInstance.loader !== 'vanilla') {
      setLoader(activeInstance.loader as any);
    }
  }, [activeInstance?.loader]);

  // Initial and reactive search
  useEffect(() => {
    searchProjects(query, 1, projectType, loader, filterByVersion);
  }, [projectType, loader, filterByVersion, activeInstance?.minecraftVersion, activeInstance?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    searchProjects(query, 1);
  };

  const handleChipClick = (term: string) => {
    sounds.playClick();
    setQuery(term);
    searchProjects(term, 1);
  };

  const handleTypeChange = (newType: 'mod' | 'modpack' | 'shader' | 'resourcepack') => {
    sounds.playClick();
    setProjectType(newType);
    setQuery('');
    setPage(1);
    setFilterByVersion(false);
    searchProjects('', 1, newType, loader, false);
  };

  const handleImportMrpack = async () => {
    sounds.playClick();
    const api = (window as any).electronAPI;
    if (!api?.selectMrpackFile || !api?.installMrpack) return;
    try {
      const filePath = await api.selectMrpackFile();
      if (!filePath) return;
      setLoading(true);
      const res = await api.installMrpack({ filePath });
      sounds.playLevelUp();
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: `Сборка "${res.name}" импортирована!`,
          message: `Создан отдельный экземпляр (${res.modsCount} модов, ${res.loader.toUpperCase()} ${res.minecraftVersion}) и выбран для запуска.`,
        });
      }
    } catch (err: any) {
      sounds.playError();
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Ошибка импорта сборки',
          message: err?.message || 'Не удалось импортировать файл .mrpack',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    sounds.playClick();
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    searchProjects(query, newPage);
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
      const effectiveLoader =
        activeInstance?.loader && activeInstance.loader !== 'vanilla'
          ? activeInstance.loader
          : loader && loader !== 'all'
          ? loader
          : 'fabric';

      const res = await onInstallProject(
        targetId,
        projectType,
        activeInstance?.id,
        activeInstance?.minecraftVersion,
        effectiveLoader
      );

      if (res && res.success) {
        setInstalledIds((prev) => new Set([...prev, targetId]));

        if (projectType === 'modpack') {
          sounds.playLevelUp();
          if (onShowToast) {
            onShowToast({
              type: 'success',
              title: `Сборка "${mod.title}" установлена!`,
              message: `Создан отдельный экземпляр "${res.filename || mod.title}" и выбран для запуска.`,
            });
          }
          return;
        }

        sounds.playPop();
        const depsCount = res.dependencies?.length || 0;

        let typeLabel = 'Мод';
        let folderLabel = 'папку mods';
        if (projectType === 'shader') {
          typeLabel = 'Шейдер';
          folderLabel = 'папку shaderpacks';
        } else if (projectType === 'resourcepack') {
          typeLabel = 'Ресурспак';
          folderLabel = 'папку resourcepacks';
        }

        const msg =
          depsCount > 0
            ? `Успешно скачан файл "${res.filename}" и ${depsCount} зависимостей в ${folderLabel}.`
            : `Файл "${res.filename}" успешно добавлен в ${folderLabel}.`;

        if (onShowToast) {
          onShowToast({
            type: 'success',
            title: `${typeLabel} "${mod.title}" установлен!`,
            message: msg,
            details: res.dependencies && res.dependencies.length > 0 ? res.dependencies : undefined,
            actionLabel: projectType === 'mod' ? 'Мои моды' : undefined,
            onAction: projectType === 'mod' ? () => onNavigateTab?.('installed-mods') : undefined,
          });
        }
      }
    } catch (e: any) {
      sounds.playError();
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Ошибка при установке',
          message: e?.message || 'Не удалось скачать файл проекта',
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

  const totalPages = Math.max(1, Math.ceil(totalHits / pageSize));

  // Smart page numbers pagination generator
  const getPageNumbers = (current: number, total: number): (number | '...')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            {projectType === 'shader' ? (
              <Sparkles className="w-6 h-6 text-amber-400" />
            ) : projectType === 'resourcepack' ? (
              <Palette className="w-6 h-6 text-cyan-400" />
            ) : projectType === 'modpack' ? (
              <Layers className="w-6 h-6 text-purple-400" />
            ) : (
              <Package className="w-6 h-6 text-emerald-400" />
            )}
            <span>
              {projectType === 'shader'
                ? 'Каталог шейдеров Modrinth'
                : projectType === 'resourcepack'
                ? 'Каталог текстурпаков Modrinth'
                : projectType === 'modpack'
                ? 'Каталог сборок Modrinth (.mrpack)'
                : 'Каталог модов Modrinth'}
            </span>
          </h1>

          {/* Active instance target badge */}
          {activeInstance && projectType !== 'modpack' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Экземпляр:</span>
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
          {projectType === 'modpack' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-purple-300">
                Сборки устанавливаются в новые изолированные экземпляры с полной конфигурацией
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {projectType === 'modpack' && (
            <button
              onClick={handleImportMrpack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Выбрать и распаковать файл .mrpack с диска"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Импорт .mrpack</span>
            </button>
          )}

          {/* Project type filter */}
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <button
              onClick={() => handleTypeChange('mod')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                projectType === 'mod'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Моды
            </button>
            <button
              onClick={() => handleTypeChange('modpack')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                projectType === 'modpack'
                  ? 'bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Сборки (.mrpack)
            </button>
            <button
              onClick={() => handleTypeChange('shader')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                projectType === 'shader'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Шейдеры
            </button>
            <button
              onClick={() => handleTypeChange('resourcepack')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                projectType === 'resourcepack'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Текстурпаки
            </button>
          </div>
        </div>
      </div>

      {/* Modpack live installation progress banner */}
      {packProgress && (
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
              <span>{packProgress.status}</span>
            </div>
            <span className="font-mono text-purple-200 font-bold">{packProgress.progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
              style={{ width: `${packProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Search Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex-shrink-0 mr-1 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Топ:
        </span>
        {currentChips.map((c) => (
          <button
            key={c.label}
            onClick={() => handleChipClick(c.search)}
            className="flex-shrink-0 px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs text-slate-300 hover:text-white transition-all font-medium"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search Bar & Filters */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              projectType === 'mod'
                ? 'Поиск модов (Sodium, Iris, Lithium, JEI, WorldEdit...)'
                : projectType === 'shader'
                ? 'Поиск шейдеров (Complementary, BSL, Solas, Bliss, MakeUp...)'
                : 'Поиск текстурпаков (Fresh Animations, Bare Bones, Faithful...)'
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

        {/* Loader dropdown for Mods */}
        {projectType === 'mod' && (
          <select
            value={loader}
            onChange={(e) => {
              sounds.playClick();
              setLoader(e.target.value as any);
              setPage(1);
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 font-medium cursor-pointer"
          >
            <option value="fabric">Fabric</option>
            <option value="forge">Forge</option>
            <option value="neoforge">NeoForge</option>
            <option value="quilt">Quilt</option>
            <option value="all">Все загрузчики</option>
          </select>
        )}

        {/* Version filter toggle for Shaders & Resourcepacks */}
        {projectType !== 'mod' && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setFilterByVersion(!filterByVersion);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
              filterByVersion
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              {filterByVersion
                ? `Только MC ${activeInstance?.minecraftVersion || 'версия'}`
                : 'Все версии'}
            </span>
          </button>
        )}
      </div>

      {/* Grid of Mods / Shaders / Resourcepacks */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Sparkles className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="font-medium">Загрузка каталога Modrinth...</span>
          </div>
        ) : mods.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <Package className="w-8 h-8 opacity-30" />
            <span>Ничего не найдено по вашему запросу</span>
            {filterByVersion && (
              <button
                onClick={() => setFilterByVersion(false)}
                className="text-emerald-400 hover:underline text-xs"
              >
                Показать для всех версий
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 pb-2">
            {mods.map((mod) => {
              const targetId = mod.project_id || mod.slug || mod.id;

              const isMatchByInstalledMods =
                projectType === 'mod' &&
                installedMods?.some((m) => {
                  const fname = m.filename.toLowerCase();
                  const slug = (mod.slug || '').toLowerCase();
                  const titleSlug = (mod.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  return (
                    (slug && fname.includes(slug)) ||
                    (titleSlug.length > 3 && fname.replace(/[^a-z0-9]/g, '').includes(titleSlug))
                  );
                });

              const isInstalled = installedIds.has(targetId) || Boolean(isMatchByInstalledMods);
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
                        {projectType === 'shader' ? (
                          <Sparkles className="w-6 h-6 text-amber-400" />
                        ) : projectType === 'resourcepack' ? (
                          <Palette className="w-6 h-6 text-cyan-400" />
                        ) : projectType === 'modpack' ? (
                          <Layers className="w-6 h-6 text-purple-400" />
                        ) : (
                          <Package className="w-6 h-6" />
                        )}
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
                        : projectType === 'modpack'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                    } disabled:opacity-50`}
                  >
                    {isBusy ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>{projectType === 'modpack' ? 'Установка...' : 'Скачивание...'}</span>
                      </>
                    ) : isInstalled ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                        <span>Установлен</span>
                      </>
                    ) : projectType === 'modpack' ? (
                      <>
                        <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Установить сборку</span>
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

      {/* Pagination Bar at the Bottom */}
      {totalHits > pageSize && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md flex-shrink-0">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <span>Показано</span>
            <span className="text-emerald-400 font-bold font-mono">
              {Math.min(totalHits, (page - 1) * pageSize + 1)}–{Math.min(totalHits, page * pageSize)}
            </span>
            <span>из</span>
            <span className="text-white font-bold font-mono">{totalHits.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs text-slate-300 hover:text-white transition-all font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>

            {/* Page Numbers */}
            {getPageNumbers(page, totalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-600 select-none">
                  •••
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => handlePageChange(Number(p))}
                  disabled={loading}
                  className={`w-7 h-7 rounded-xl text-xs font-bold font-mono transition-all ${
                    page === p
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs text-slate-300 hover:text-white transition-all font-semibold"
            >
              <span>Вперед</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
