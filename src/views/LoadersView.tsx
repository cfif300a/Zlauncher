import React from 'react';
import {
  Zap,
  Hammer,
  Flame,
  Feather,
  Box,
  CheckCircle2,
  Plus,
  Sparkles,
  BarChart3,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface LoadersViewProps {
  onCreateWithLoader: (loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt') => void;
}

export const LoadersView: React.FC<LoadersViewProps> = ({ onCreateWithLoader }) => {
  const loaders = [
    {
      id: 'fabric' as const,
      name: 'Fabric Loader',
      tagline: 'Ультра-легковесный и высокоскоростной загрузчик',
      icon: Zap,
      badge: 'Рекомендуется для FPS',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      fpsScore: '98 / 100',
      ramScore: 'Минимальное (1-4 GB)',
      topMods: ['Sodium', 'Iris Shaders', 'Lithium', 'FerriteCore', 'Indium'],
      features: [
        'Максимальный прирост FPS с модами Sodium, Lithium и FerriteCore',
        'Поддержка шейдеров нового поколения через Iris Shaders',
        'Молниеносная скорость загрузки игры (запуск за пару секунд)',
        'Идеально подходит как для слабых ПК, так и для мощных сборок',
      ],
      recommendedFor: 'Оптимизация, шейдеры, клиентские моды и современные сборки',
      compat: 'Все версии от 1.14 до 1.20.4+',
    },
    {
      id: 'forge' as const,
      name: 'Minecraft Forge',
      tagline: 'Классическая экосистема масштабного моддинга',
      icon: Hammer,
      badge: 'Для больших сборок',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      fpsScore: '78 / 100',
      ramScore: 'Высокое (4-8 GB+)',
      topMods: ['Create', 'Twilight Forest', 'Mekanism', 'Tinkers', 'JEI'],
      features: [
        'Самый большой архив контентных, технических и магических модов',
        'Поддержка легендарных модов: Create, Twilight Forest, Mekanism, Tinkers Construct',
        'Мощный API для глубокой кастомизации предметов, мобов и измерений',
      ],
      recommendedFor: 'Масштабные модпаки со 100+ модами, магия, индустриальные миры',
      compat: 'От 1.7.10, 1.12.2, 1.16.5 до 1.20.1',
    },
    {
      id: 'neoforge' as const,
      name: 'NeoForge',
      tagline: 'Современный оптимизированный форк Forge для новых версий',
      icon: Flame,
      badge: 'Новый стандарт (1.20.2+)',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      fpsScore: '89 / 100',
      ramScore: 'Среднее (3-6 GB)',
      topMods: ['Create (Neo)', 'ModernFix', 'Applied Energistics', 'Curios'],
      features: [
        'Переработанное ядро исходного Forge с исправлением утечек памяти',
        'Современная архитектура событий и улучшенная совместимость с шейдерами',
        'Основная платформа для большинства новых модов начиная с 1.20.2',
      ],
      recommendedFor: 'Новые версии Minecraft с техническими модами нового поколения',
      compat: 'Minecraft 1.20.2, 1.20.4, 1.20.6, 26.x',
    },
    {
      id: 'quilt' as const,
      name: 'Quilt Loader',
      tagline: 'Модульный открытый загрузчик от сообщества разработчиков',
      icon: Feather,
      badge: 'Модульный',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      fpsScore: '95 / 100',
      ramScore: 'Низкое (2-4 GB)',
      topMods: ['QSL', 'Fabric API Shim', 'Sodium', 'Iris'],
      features: [
        'Обратная совместимость с подавляющим большинством модов для Fabric',
        'Инновационная система плагинов Quilt Standard Libraries (QSL)',
        'Развитая система разрешения зависимостей и предотвращения конфликтов',
      ],
      recommendedFor: 'Экспериментальные сборки и современные моды',
      compat: 'Minecraft 1.18.2 — 1.20.4+',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto select-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-emerald-400" />
            <span>Загрузчики модов (Mod Loaders)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Сравнение архитектур загрузчиков, оценка производительности и создание сборок в 1 клик
          </p>
        </div>
      </div>

      {/* Grid of Loaders */}
      <div className="grid grid-cols-2 gap-4 pb-6">
        {loaders.map((l) => {
          const Icon = l.icon;

          return (
            <div
              key={l.id}
              className="flex flex-col justify-between p-6 rounded-3xl glass-card hover:border-emerald-500/50 transition-all hover:scale-[1.01] group shadow-lg"
            >
              <div>
                {/* Top Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl border ${l.iconColor} shadow-inner`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                        {l.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{l.tagline}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${l.badgeColor}`}>
                    {l.badge}
                  </span>
                </div>

                {/* Benchmark Scores */}
                <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-[11px]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-slate-500 text-[10px]">Индекс FPS</div>
                      <div className="font-bold text-white font-mono">{l.fpsScore}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-slate-500 text-[10px]">Потребление RAM</div>
                      <div className="font-bold text-white truncate font-mono">{l.ramScore}</div>
                    </div>
                  </div>
                </div>

                {/* Top Mods Chips */}
                <div className="space-y-1.5 mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Популярные моды для этого загрузчика:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {l.topMods.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 font-mono text-slate-300 font-semibold"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-1.5 my-3 pt-3 border-t border-white/[0.05]">
                  {l.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Compatibility meta */}
                <div className="pt-3 border-t border-white/[0.04] space-y-1 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Рекомендуется для:</span>{' '}
                    <span className="text-slate-300 font-medium">{l.recommendedFor}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Поддерживаемые версии:</span>{' '}
                    <span className="font-mono text-emerald-400 font-bold">{l.compat}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-white/[0.04]">
                <button
                  onClick={() => {
                    sounds.playClick();
                    onCreateWithLoader(l.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-400 group-hover:text-slate-950 group-hover:font-black group-hover:border-transparent group-hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Создать экземпляр с {l.name}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
