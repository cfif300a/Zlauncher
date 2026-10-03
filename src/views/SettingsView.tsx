import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Coffee,
  Palette,
  Volume2,
  FolderOpen,
  Monitor,
  Check,
  Zap,
  Sparkles,
  HardDrive,
  FolderTree,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  FileCode,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { LauncherConfig } from '../types';

interface SettingsViewProps {
  config: LauncherConfig;
  onSaveConfig: (newConfig: Partial<LauncherConfig>) => void;
  onOpenFolder: (type: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  onOpenFolder,
}) => {
  const [totalMem, setTotalMem] = useState(16384);
  const [freeMem, setFreeMem] = useState(8192);
  const [javaList, setJavaList] = useState<{ path: string; version: string; isDefault: boolean }[]>([]);
  const [savedAlert, setSavedAlert] = useState(false);
  const [activeSoundTest, setActiveSoundTest] = useState<string | null>(null);

  useEffect(() => {
    const fetchSys = async () => {
      if ((window as any).electronAPI) {
        const sys = await (window as any).electronAPI.getSystemInfo();
        if (sys) {
          if (sys.totalMemory) setTotalMem(sys.totalMemory);
          if (sys.freeMemory) setFreeMem(sys.freeMemory);
        }
        const javas = await (window as any).electronAPI.getInstalledJava();
        setJavaList(javas || []);
      }
    };
    fetchSys();
  }, []);

  const triggerSave = (updates: Partial<LauncherConfig>) => {
    onSaveConfig(updates);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 1500);
  };

  const handleSelectJavaFile = async () => {
    sounds.playClick();
    if ((window as any).electronAPI?.selectJavaFile) {
      const selected = await (window as any).electronAPI.selectJavaFile();
      if (selected) {
        sounds.playSuccess();
        triggerSave({ javaPath: selected });
      }
    }
  };

  const [downloadingJava, setDownloadingJava] = useState<number | null>(null);

  const handleDownloadJava = async (major: number) => {
    sounds.playClick();
    const api = (window as any).electronAPI;
    if (!api?.downloadJavaRuntime) return;
    setDownloadingJava(major);
    try {
      const res = await api.downloadJavaRuntime(major);
      sounds.playLevelUp();
      const updated = await api.getInstalledJava();
      setJavaList(updated || []);
      if (res.path) {
        triggerSave({ javaPath: res.path });
      }
    } catch (e: any) {
      sounds.playError();
      alert(`Ошибка при загрузке Java ${major}: ` + e.message);
    } finally {
      setDownloadingJava(null);
    }
  };

  const testSound = (type: string, fn: () => void) => {
    setActiveSoundTest(type);
    fn();
    setTimeout(() => setActiveSoundTest(null), 500);
  };

  const themes = [
    { id: 'cyber', name: 'Кибер Обсидиан', color: 'from-emerald-500 to-cyan-500', border: 'border-emerald-500/40', desc: 'Неоновый изумруд и глубокий космос' },
    { id: 'nether', name: 'Огни Незера', color: 'from-orange-500 to-red-600', border: 'border-rose-500/40', desc: 'Лавовые реки и багровый лес' },
    { id: 'end', name: 'Пустота Края', color: 'from-purple-500 to-indigo-600', border: 'border-purple-500/40', desc: 'Фиолетовый туман и дыхание дракона' },
    { id: 'lush', name: 'Пышные Пещеры', color: 'from-green-500 to-lime-500', border: 'border-green-500/40', desc: 'Светящиеся ягоды и спороцветы' },
    { id: 'overworld', name: 'Закат Верхнего Мира', color: 'from-amber-400 to-sky-500', border: 'border-amber-500/40', desc: 'Золотые лучи солнца над морем' },
  ];

  const resolutionPresets = [
    { label: 'HD 720p', w: 1280, h: 720 },
    { label: 'HD+ 900p', w: 1600, h: 900 },
    { label: 'Full HD 1080p', w: 1920, h: 1080 },
    { label: '2K QHD 1440p', w: 2560, h: 1440 },
  ];

  const ramPercent = Math.min(100, Math.round((config.maxRam / totalMem) * 100));

  const getRamStatusInfo = () => {
    if (ramPercent > 85) {
      return {
        badge: 'Критично',
        badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        barColor: 'from-amber-500 to-rose-500',
        note: 'Выделено более 85% всей памяти ПК! Возможны зависания Windows.',
      };
    }
    if (ramPercent > 65) {
      return {
        badge: 'Высокое',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        barColor: 'from-teal-500 to-amber-500',
        note: 'Подходит для тяжелых сборок от 150+ модов с шейдерами.',
      };
    }
    return {
      badge: 'Оптимально',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      barColor: 'from-emerald-500 to-teal-400',
      note: 'Идеальный баланс между Minecraft и фоновыми программами ПК.',
    };
  };

  const ramStatus = getRamStatusInfo();

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto select-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>Настройки ZLauncher</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Конфигурация выделения ОЗУ, Java, оптимизации JVM, графики и интерфейса
          </p>
        </div>

        {savedAlert && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Check className="w-3.5 h-3.5" />
            <span>Настройки сохранены</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: RAM & Java & JVM */}
        <div className="space-y-5">
          {/* Advanced RAM Allocation Card */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">Оперативная память (RAM)</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${ramStatus.badgeColor}`}>
                      {ramStatus.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Всего в системе: <span className="font-bold text-slate-300">{Math.round(totalMem / 1024)} GB</span> | Свободно: <span className="font-bold text-emerald-400">{(freeMem / 1024).toFixed(1)} GB</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-mono font-black text-emerald-400">
                  {config.maxRam} MB
                </span>
                <div className="text-[11px] text-slate-400">
                  {(config.maxRam / 1024).toFixed(1)} GB ({ramPercent}% от всей ОЗУ)
                </div>
              </div>
            </div>

            {/* Visual RAM Meter Bar */}
            <div className="space-y-1">
              <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                <div
                  className={`h-full bg-gradient-to-r ${ramStatus.barColor} rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]`}
                  style={{ width: `${ramPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>1 GB</span>
                <span>4 GB (Базово)</span>
                <span>8 GB (Оптимум)</span>
                <span>{Math.round(totalMem / 1024)} GB</span>
              </div>
            </div>

            {/* RAM Range Slider */}
            <input
              type="range"
              min={1024}
              max={Math.min(totalMem, 32768)}
              step={512}
              value={config.maxRam}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                triggerSave({ maxRam: val });
              }}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            {/* RAM Preset Chips */}
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 font-semibold">Быстрые пресеты памяти:</div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { mem: 2048, label: '2 GB', desc: 'Ванилла' },
                  { mem: 4096, label: '4 GB', desc: 'Легкие моды' },
                  { mem: 6144, label: '6 GB', desc: 'Сборки' },
                  { mem: 8192, label: '8 GB', desc: 'Шейдеры' },
                ].map((p) => (
                  <button
                    key={p.mem}
                    onClick={() => {
                      sounds.playPop();
                      triggerSave({ maxRam: p.mem });
                    }}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      config.maxRam === p.mem
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{p.label}</span>
                    <span className="text-[9px] opacity-75">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{ramStatus.note}</span>
            </div>
          </div>

          {/* Java Runtime Selector with Compatibility Chips */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Среда выполнения Java</h3>
                  <div className="text-[11px] text-slate-400">Обнаружено версий в системе: {javaList.length}</div>
                </div>
              </div>

              <button
                onClick={handleSelectJavaFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all shadow-sm"
                title="Выбрать файл javaw.exe вручную"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Обзор...</span>
              </button>
            </div>

            <select
              value={config.javaPath}
              onChange={(e) => triggerSave({ javaPath: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Авто-определение (Рекомендуется)</option>
              {javaList.map((j) => (
                <option key={j.path} value={j.path}>
                  {j.version} {j.isDefault ? '★ [По умолчанию]' : ''} — {j.path}
                </option>
              ))}
            </select>

            {/* Java Compatibility Guide matrix */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="font-bold text-purple-400">Java 25</div>
                <div className="text-slate-400 mt-0.5">MC 26.3+ / 25w</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="font-bold text-emerald-400">Java 21</div>
                <div className="text-slate-400 mt-0.5">MC 1.20.5+</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="font-bold text-cyan-400">Java 17</div>
                <div className="text-slate-400 mt-0.5">MC 1.18 - 1.20.4</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="font-bold text-amber-400">Java 8</div>
                <div className="text-slate-400 mt-0.5">MC 1.12.2 и старее</div>
              </div>
            </div>

            {/* Quick pre-download buttons & Auto-download notice */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Скачать портативную Java в 1 клик:
                </span>
                <span className="text-[10px] text-slate-500">Adoptium / Azul OpenJDK</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[25, 21, 17, 8].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleDownloadJava(v)}
                    disabled={downloadingJava !== null}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                      downloadingJava === v
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/5'
                    } disabled:opacity-50`}
                  >
                    {downloadingJava === v ? (
                      <span>Загрузка...</span>
                    ) : (
                      <>
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>Java {v}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                ✨ <span className="text-white font-semibold">Авто-загрузка:</span> ZLauncher автоматически скачает и запустит нужную версию Java (включая Java 25 для новых снимков), если она не установлена у вас или вашего друга.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500">Путь к java.exe / javaw.exe</label>
              <input
                type="text"
                placeholder="Автоматически (оставьте пустым)"
                value={config.javaPath}
                onChange={(e) => triggerSave({ javaPath: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* JVM Optimization Flags */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Пресеты оптимизации JVM</h3>
                <div className="text-[11px] text-slate-400">Снижение микрофризов сборщика мусора и стабилизация FPS</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'optimized', label: 'Оптимальный (Aikar G1GC)', desc: 'Минимум лагов сборщика' },
                { id: 'standard', label: 'Стандартный JVM', desc: 'Дефолтный сборщик мусора' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    sounds.playClick();
                    triggerSave({ jvmPreset: p.id as any });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.jvmPreset === p.id
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500">Дополнительные аргументы Java (JVM Flags)</label>
              <textarea
                rows={2}
                placeholder="-XX:+UseG1GC -Dfile.encoding=UTF-8"
                value={config.customJvmArgs}
                onChange={(e) => triggerSave({ customJvmArgs: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Display, Theme, Audio & Folders */}
        <div className="space-y-5">
          {/* Themes Live Selection */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Оформление и тема</h3>
                  <div className="text-[11px] text-slate-400">Цветовая палитра лаунчера и живой фон</div>
                </div>
              </div>

              {/* Particle switch */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  checked={config.particles}
                  onChange={(e) => {
                    sounds.playPop();
                    triggerSave({ particles: e.target.checked });
                  }}
                  className="accent-purple-500 rounded"
                />
                <span className="font-medium">3D Частицы</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    sounds.playPop();
                    triggerSave({ theme: t.id as any });
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    config.theme === t.id
                      ? `bg-white/[0.08] ${t.border} text-white shadow-md`
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${t.color} shadow-sm`} />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.desc}</div>
                    </div>
                  </div>

                  {config.theme === t.id && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
                      <span>Активна</span>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution & Screen */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Разрешение экрана в игре</h3>
                <div className="text-[11px] text-slate-400">Размер окна запуска Minecraft</div>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {resolutionPresets.map((r) => {
                const isActive = config.resolution.width === r.w && config.resolution.height === r.h;
                return (
                  <button
                    key={r.label}
                    onClick={() => {
                      sounds.playPop();
                      triggerSave({
                        resolution: {
                          ...config.resolution,
                          width: r.w,
                          height: r.h,
                        },
                      });
                    }}
                    className={`py-1.5 rounded-xl border text-xs font-mono transition-all ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                        : 'bg-white/[0.02] text-slate-400 border-white/[0.05] hover:bg-white/[0.05]'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-500">Ширина (px)</label>
                <input
                  type="number"
                  value={config.resolution.width}
                  onChange={(e) =>
                    triggerSave({
                      resolution: {
                        ...config.resolution,
                        width: parseInt(e.target.value, 10) || 1280,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Высота (px)</label>
                <input
                  type="number"
                  value={config.resolution.height}
                  onChange={(e) =>
                    triggerSave({
                      resolution: {
                        ...config.resolution,
                        height: parseInt(e.target.value, 10) || 720,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-sky-500/50"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              <input
                type="checkbox"
                checked={config.resolution.fullscreen}
                onChange={(e) =>
                  triggerSave({
                    resolution: {
                      ...config.resolution,
                      fullscreen: e.target.checked,
                    },
                  })
                }
                className="accent-sky-500 rounded"
              />
              <span className="font-semibold">Запускать игру сразу на весь экран (Fullscreen)</span>
            </label>
          </div>

          {/* Audio Engine & Sound Preview Matrix */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Звуки интерфейса</h3>
                  <div className="text-[11px] text-slate-400">Процедурный аудио-движок Web Audio API</div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => {
                  sounds.playPop();
                  triggerSave({ soundEnabled: e.target.checked });
                }}
                className="accent-rose-500 rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Громкость эффектов</span>
                <span className="font-mono font-bold text-white">{config.soundVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={config.soundVolume}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  triggerSave({ soundVolume: val });
                }}
                className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Test buttons */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] text-slate-400 font-semibold">Проверка звуков:</div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => testSound('click', () => sounds.playClick())}
                  className={`py-1.5 rounded-xl border transition-all ${
                    activeSoundTest === 'click'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  Клик
                </button>

                <button
                  onClick={() => testSound('pop', () => sounds.playPop())}
                  className={`py-1.5 rounded-xl border transition-all ${
                    activeSoundTest === 'pop'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  Поп
                </button>

                <button
                  onClick={() => testSound('success', () => sounds.playSuccess())}
                  className={`py-1.5 rounded-xl border transition-all ${
                    activeSoundTest === 'success'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  Успех
                </button>

                <button
                  onClick={() => testSound('levelup', () => sounds.playLevelUp())}
                  className={`py-1.5 rounded-xl border transition-all ${
                    activeSoundTest === 'levelup'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  Запуск
                </button>
              </div>
            </div>
          </div>

          {/* Quick Folders Access Hub */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Быстрый доступ к папкам</h3>
                <div className="text-[11px] text-slate-400">Открыть файлы в проводнике Windows</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenFolder('minecraft');
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 hover:text-white transition-all text-left"
              >
                <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">Корневая .minecraft</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenFolder('instances');
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 hover:text-white transition-all text-left"
              >
                <FolderTree className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="truncate">Экземпляры игры</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenFolder('mods');
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 hover:text-white transition-all text-left"
              >
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="truncate">Папка модов</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenFolder('screenshots');
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 hover:text-white transition-all text-left"
              >
                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="truncate">Скриншоты</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
