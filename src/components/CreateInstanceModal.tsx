import React, { useState } from 'react';
import {
  Plus,
  X,
  Zap,
  Hammer,
  Flame,
  Feather,
  Sparkles,
  Shield,
  Layers,
  Box,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (instanceData: {
    name: string;
    minecraftVersion: string;
    loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
    icon: string;
  }) => Promise<void>;
  availableVersions: string[];
  initialLoader?: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
  initialVersion?: string;
  onShowToast?: (toast: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  availableVersions,
  initialLoader = 'fabric',
  initialVersion = '26.3',
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(initialVersion);
  const [selectedLoader, setSelectedLoader] = useState<'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt'>(initialLoader);
  const [selectedIcon, setSelectedIcon] = useState('grass');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter versions: strictly releases, no snapshots!
  const releaseVersions = availableVersions.filter(
    (v) => !v.includes('-') && !v.includes('snapshot') && !v.includes('rc') && !v.includes('pre')
  );

  const finalVersions = releaseVersions.length > 0 ? releaseVersions : [
    '26.3', '26.2', '26.1', '1.21', '1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9'
  ];

  const loaders = [
    {
      id: 'fabric',
      name: 'Fabric',
      badge: 'Рекомендуется',
      desc: 'Максимальный FPS, легковесный, моментальный запуск, поддержка шейдеров Iris и Sodium',
      icon: Zap,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'forge',
      name: 'Forge',
      badge: 'Классика',
      desc: 'Огромный выбор технических, магических и глобальных модов (Create, Twilight Forest)',
      icon: Hammer,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'neoforge',
      name: 'NeoForge',
      badge: '1.20.2+',
      desc: 'Современный форк Forge с оптимизированным ядром и улучшенной стабильностью',
      icon: Flame,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    },
    {
      id: 'quilt',
      name: 'Quilt',
      badge: 'Новинка',
      desc: 'Модульный загрузчик от сообщества, обратно совместимый с модами для Fabric',
      icon: Feather,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 'vanilla',
      name: 'Vanilla',
      badge: 'Чистая игра',
      desc: 'Официальный оригинальный клиент Minecraft без сторонних модов',
      icon: Box,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  ];

  const icons = [
    { id: 'grass', label: '🌱 Трава' },
    { id: 'diamond', label: '💎 Алмаз' },
    { id: 'crafting', label: '🛠️ Верстак' },
    { id: 'netherite', label: '🛡️ Незерит' },
    { id: 'potion', label: '🧪 Зелье' },
    { id: 'redstone', label: '🔴 Редстоун' },
    { id: 'book', label: '📖 Книга' },
    { id: 'ender', label: '👁️ Око Края' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playLevelUp();
    setIsSubmitting(true);

    const instanceName = name.trim() || `${selectedLoader === 'vanilla' ? 'Vanilla' : selectedLoader.toUpperCase()} ${selectedVersion}`;

    try {
      await onCreate({
        name: instanceName,
        minecraftVersion: selectedVersion,
        loader: selectedLoader,
        icon: selectedIcon,
      });
      onClose();
    } catch (err: any) {
      sounds.playError();
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Ошибка создания экземпляра',
          message: err.message,
        });
      } else {
        console.error(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2.5">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Создать новый экземпляр игры</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Каждый экземпляр имеет свою изолированную папку модов, настроек и миров
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instance Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">Название сборки / экземпляра</label>
          <input
            type="text"
            placeholder={`Например: Моя сборка ${selectedVersion}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 select-text cursor-text"
          />
        </div>

        {/* Minecraft Version Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">Версия Minecraft (только официальные релизы)</label>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
          >
            {finalVersions.slice(0, 30).map((v) => (
              <option key={v} value={v} className="bg-slate-900 text-white">
                Minecraft {v}
              </option>
            ))}
          </select>
        </div>

        {/* Mod Loader Cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Загрузчик модов (Mod Loader)</label>
          <div className="grid grid-cols-1 gap-2">
            {loaders.map((l) => {
              const Icon = l.icon;
              const isSelected = selectedLoader === l.id;

              return (
                <div
                  key={l.id}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedLoader(l.id as any);
                  }}
                  className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border ${l.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{l.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/10 text-slate-300">
                          {l.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{l.desc}</p>
                    </div>
                  </div>

                  <input
                    type="radio"
                    name="loader"
                    checked={isSelected}
                    onChange={() => setSelectedLoader(l.id as any)}
                    className="accent-emerald-500 mt-1 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Icon Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">Иконка экземпляра</label>
          <div className="grid grid-cols-4 gap-2">
            {icons.map((ic) => (
              <button
                type="button"
                key={ic.id}
                onClick={() => {
                  sounds.playPop();
                  setSelectedIcon(ic.id);
                }}
                className={`py-2 px-3 rounded-xl border text-xs text-left transition-colors ${
                  selectedIcon === ic.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-slate-400'
                }`}
              >
                {ic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit / Cancel Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
          >
            Отмена
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{selectedLoader !== 'vanilla' ? 'Загрузка файлов загрузчика...' : 'Создание...'}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Создать экземпляр</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
