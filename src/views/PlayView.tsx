import React, { useState } from 'react';
import {
  Play,
  Square,
  Sparkles,
  Layers,
  Cpu,
  Coffee,
  HardDrive,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Plus,
  FolderGit2,
  Check,
  Shirt,
  Flame,
  Radio,
} from 'lucide-react';
import { SkinViewer3D } from '../components/SkinViewer3D';
import { sounds } from '../utils/audio';
import { LauncherConfig, VersionItem, Instance } from '../types';

interface PlayViewProps {
  config: LauncherConfig;
  versions: VersionItem[];
  isGameRunning: boolean;
  launchStatus: string;
  launchProgress: number;
  launchDetails?: string;
  onLaunch: () => void;
  onKill: () => void;
  onSelectVersion: (versionId: string) => void;
  onOpenFolder: (type: any) => void;
  onOpenSettings: () => void;
  installedModsCount: number;
  activeInstance?: Instance;
  instances: Instance[];
  onSelectInstance: (id: string) => void;
  onOpenCreateModal: () => void;
}

export const PlayView: React.FC<PlayViewProps> = ({
  config,
  versions,
  isGameRunning,
  launchStatus,
  launchProgress,
  launchDetails,
  onLaunch,
  onKill,
  onSelectVersion,
  onOpenFolder,
  onOpenSettings,
  installedModsCount,
  activeInstance,
  instances,
  onSelectInstance,
  onOpenCreateModal,
}) => {
  const [showInstancePicker, setShowInstancePicker] = useState(false);

  const handleLaunchClick = () => {
    if (isGameRunning) {
      onKill();
      return;
    }

    onLaunch();
  };

  const getEmojiIcon = (icon?: string) => {
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

  const currentVersion = activeInstance?.minecraftVersion || config.selectedVersion;
  const currentLoader = activeInstance?.loader || 'vanilla';

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 overflow-hidden select-none">
      {/* Background Volumetric Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Hero Banner */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 backdrop-blur-xl text-xs text-emerald-300 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Пиратский лаунчер нового поколения</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-300 font-mono text-[11px]">PRO EDITION</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg flex items-center gap-3">
            {activeInstance ? (
              <>
                <span className="text-3xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  {getEmojiIcon(activeInstance.icon)}
                </span>
                <span className="truncate max-w-md">{activeInstance.name}</span>
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-mono text-3xl">
                  {currentVersion}
                </span>
              </>
            ) : (
              <>
                MINECRAFT{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-mono">
                  {currentVersion}
                </span>
              </>
            )}
          </h1>

          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Автономная офлайн-авторизация с сохранением инвентарей по RFC 4122 v3 MD5 UUID, многопоточный загрузчик ресурсов и изолированные сборки модов.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sounds.playClick();
              onOpenCreateModal();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition-all shadow-sm hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Создать экземпляр</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenFolder('mods');
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all shadow-sm"
            title="Открыть папку модов активного экземпляра"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>Папка модов</span>
          </button>
        </div>
      </div>

      {/* Center Section: 3D Character Stage & HUD Metrics */}
      <div className="relative z-10 flex items-center justify-around my-auto py-3">
        {/* HUD Metric Cards (Left Column) */}
        <div className="grid grid-cols-2 gap-3.5 w-96">
          {/* RAM Card */}
          <div
            onClick={onOpenSettings}
            className="glass-card p-4 rounded-3xl cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Память RAM
              </span>
              <Cpu className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-white font-mono">{config.maxRam} MB</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${Math.min(100, (config.maxRam / 16384) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Выделено для Java</div>
          </div>

          {/* Loader Card */}
          <div
            onClick={onOpenSettings}
            className="glass-card p-4 rounded-3xl cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Загрузчик
              </span>
              <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-white capitalize truncate">{currentLoader}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-300 font-mono">Активен</span>
            </div>
          </div>

          {/* Mods Count Card */}
          <div className="glass-card p-4 rounded-3xl">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Моды сборки
              </span>
              <HardDrive className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">{installedModsCount}</div>
            <div className="text-[10px] text-amber-300/80 mt-2 truncate">В папке экземпляра</div>
          </div>

          {/* Skin Status Card */}
          <div className="glass-card p-4 rounded-3xl">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Скин игрока
              </span>
              <Shirt className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-black text-white truncate capitalize">
              {config.skinType === 'slim' ? 'Слим (3px)' : 'Классик (4px)'}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-300 font-mono">Одиночная игра</span>
            </div>
          </div>
        </div>

        {/* 3D Character Stage (Center / Showcase) */}
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-95 pointer-events-none" />
            <SkinViewer3D
              skinUrl={config.skinUrl}
              isSlim={config.skinType === 'slim'}
              width={300}
              height={380}
              animation={isGameRunning ? 'run' : 'idle'}
              interactive={true}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2.5 flex items-center gap-1.5 font-medium">
            <span>Вращайте модель мышью</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Двойной клик — сброс</span>
          </div>
        </div>
      </div>

      {/* Bottom Launch Control Bar */}
      <div className="relative z-10 p-4 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Animated Progress Bar when downloading or starting */}
        {launchStatus && (
          <div className="mb-3.5 space-y-1.5 px-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                {launchStatus}
              </span>
              <span className="text-slate-300 font-mono text-xs font-bold">{launchProgress}%</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden p-0.5 border border-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                style={{ width: `${Math.max(5, launchProgress)}%` }}
              />
            </div>

            {launchDetails && (
              <div className="text-[10px] text-slate-500 truncate font-mono">{launchDetails}</div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          {/* Active Instance Selector Button */}
          <div className="relative flex-1">
            <button
              onClick={() => {
                sounds.playClick();
                setShowInstancePicker(!showInstancePicker);
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-all text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl shadow-inner">
                  {getEmojiIcon(activeInstance?.icon)}
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Активный экземпляр
                  </div>
                  <div className="text-base font-black text-white flex items-center gap-2.5 mt-0.5">
                    <span>{activeInstance?.name || 'Основной'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/[0.08] text-cyan-300 uppercase font-bold border border-white/5">
                      {currentLoader}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      MC {currentVersion}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                <span>Сменить</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Instance Dropdown Picker Popup */}
            {showInstancePicker && (
              <div className="absolute bottom-full left-0 right-0 mb-3 max-h-80 overflow-y-auto rounded-3xl bg-[#0c1220]/95 border border-white/10 shadow-2xl p-2.5 z-50 backdrop-blur-2xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Выбор экземпляра
                  </span>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowInstancePicker(false);
                      onOpenCreateModal();
                    }}
                    className="text-xs text-emerald-400 font-black hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Создать новый</span>
                  </button>
                </div>

                <div className="mt-1.5 space-y-1">
                  {instances.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => {
                        sounds.playClick();
                        onSelectInstance(inst.id);
                        setShowInstancePicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-colors ${
                        activeInstance?.id === inst.id
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getEmojiIcon(inst.icon)}</span>
                        <div className="text-left">
                          <div className="font-bold text-white text-xs">{inst.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            MC {inst.minecraftVersion} • {inst.loader} • {inst.modsCount || 0} модов
                          </div>
                        </div>
                      </div>

                      {activeInstance?.id === inst.id && (
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Giant Enchanted "ИГРАТЬ" Button */}
          <button
            onClick={handleLaunchClick}
            disabled={launchStatus !== '' && !isGameRunning}
            className={`relative flex items-center justify-center gap-3.5 px-12 py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 shadow-2xl overflow-hidden group ${
              isGameRunning
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/40'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:via-teal-300 hover:to-cyan-300 text-slate-950 enchant-glint glow-btn shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:scale-[1.03] active:scale-[0.98]'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isGameRunning ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                <span className="font-black text-base">Остановить</span>
              </>
            ) : launchStatus ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span className="font-black text-base">Запуск...</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" />
                <span className="text-lg font-black tracking-widest">ИГРАТЬ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
