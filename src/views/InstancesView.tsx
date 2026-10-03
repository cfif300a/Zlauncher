import React from 'react';
import {
  FolderGit2,
  Plus,
  Play,
  CheckCircle,
  FolderOpen,
  Trash2,
  Zap,
  Hammer,
  Flame,
  Feather,
  Box,
  HardDrive,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { Instance } from '../types';

interface InstancesViewProps {
  instances: Instance[];
  activeInstanceId: string;
  onSelectInstance: (id: string) => void;
  onOpenCreateModal: () => void;
  onDeleteInstance: (id: string) => void;
  onOpenInstanceFolder: (id: string) => void;
  onImportMrpack?: () => void;
}

export const InstancesView: React.FC<InstancesViewProps> = ({
  instances,
  activeInstanceId,
  onSelectInstance,
  onOpenCreateModal,
  onDeleteInstance,
  onOpenInstanceFolder,
  onImportMrpack,
}) => {
  const getLoaderDetails = (loader: string) => {
    switch (loader) {
      case 'fabric':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />,
          badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
          gradient: 'from-cyan-900/30 to-slate-900/40',
        };
      case 'forge':
        return {
          icon: <Hammer className="w-3.5 h-3.5 text-amber-400" />,
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          gradient: 'from-amber-900/30 to-slate-900/40',
        };
      case 'neoforge':
        return {
          icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
          badge: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
          gradient: 'from-orange-900/30 to-slate-900/40',
        };
      case 'quilt':
        return {
          icon: <Feather className="w-3.5 h-3.5 text-purple-400" />,
          badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
          gradient: 'from-purple-900/30 to-slate-900/40',
        };
      default:
        return {
          icon: <Box className="w-3.5 h-3.5 text-emerald-400" />,
          badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          gradient: 'from-emerald-900/30 to-slate-900/40',
        };
    }
  };

  const getEmojiIcon = (icon: string) => {
    switch (icon) {
      case 'diamond':
        return '💎';
      case 'crafting':
        return '🛠️';
      case 'netherite':
        return '🛡️';
      case 'potion':
        return '🧪';
      case 'redstone':
        return '🔴';
      case 'book':
        return '📖';
      case 'ender':
        return '👁️';
      case 'grass':
      default:
        return '🌱';
    }
  };

  const totalMods = instances.reduce((acc, i) => acc + (i.modsCount || 0), 0);

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-emerald-400" />
            <span>Экземпляры и Профили</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Изолированные игровые сборки с независимыми наборами модов, настройками и сохранениями
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onImportMrpack && (
            <button
              onClick={onImportMrpack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Импортировать готовую сборку .mrpack с компьютера"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Импорт .mrpack</span>
            </button>
          )}

          <button
            onClick={() => {
              sounds.playLevelUp();
              onOpenCreateModal();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Создать экземпляр</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-3xl flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">{instances.length}</div>
            <div className="text-[11px] text-slate-400">Всего сборок / профилей</div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">{totalMods}</div>
            <div className="text-[11px] text-slate-400">Суммарно модов во всех сборках</div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black text-white truncate max-w-[170px]">
              {instances.find((i) => i.id === activeInstanceId)?.name || 'Основной'}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">Текущий активный профиль</div>
          </div>
        </div>
      </div>

      {/* Grid of Instances */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4 pb-4">
          {instances.map((inst) => {
            const isActive = inst.id === activeInstanceId;
            const loaderData = getLoaderDetails(inst.loader);

            return (
              <div
                key={inst.id}
                className={`flex flex-col justify-between p-5 rounded-3xl border transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-500/15 via-slate-900/60 to-slate-950/80 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'bg-white/[0.02] hover:bg-white/[0.045] border-white/[0.06]'
                }`}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                        {getEmojiIcon(inst.icon)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-white text-base tracking-tight truncate max-w-[190px]">
                            {inst.name}
                          </h3>
                          {isActive && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Активен
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg border font-mono ${loaderData.badge}`}
                          >
                            {loaderData.icon}
                            <span className="capitalize font-bold">{inst.loader}</span>
                          </span>

                          <span className="text-xs font-mono text-emerald-400 font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                            MC {inst.minecraftVersion}
                          </span>
                        </div>
                      </div>
                    </div>

                    {instances.length > 1 && (
                      <button
                        onClick={() => {
                          sounds.playClick();
                          if (confirm(`Удалить экземпляр "${inst.name}" и все его моды?`)) {
                            onDeleteInstance(inst.id);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Удалить экземпляр"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Info stats */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-slate-300">{inst.modsCount || 0}</span>
                      <span>модов в сборке</span>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end text-slate-500 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(inst.created).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-white/[0.05]">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onOpenInstanceFolder(inst.id);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    title="Открыть изолированную папку модов экземпляра"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Папка модов</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playLevelUp();
                      onSelectInstance(inst.id);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-white/[0.06] hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                        <span>Выбран для игры</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Выбрать экземпляр</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
