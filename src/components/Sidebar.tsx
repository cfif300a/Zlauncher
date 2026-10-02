import React from 'react';
import {
  Gamepad2,
  FolderGit2,
  Zap,
  Layers,
  Package,
  FolderKanban,
  Shirt,
  Radio,
  Image,
  Terminal,
  Settings,
  Volume2,
  VolumeX,
  User,
  Edit3,
  Plus,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export type TabType =
  | 'play'
  | 'instances'
  | 'loaders'
  | 'versions'
  | 'mods'
  | 'installed-mods'
  | 'skins'
  | 'servers'
  | 'gallery'
  | 'console'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  username: string;
  onEditUsername: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isGameRunning: boolean;
  logCount: number;
  onOpenCreateInstance: () => void;
  activeInstanceName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  username,
  onEditUsername,
  soundEnabled,
  onToggleSound,
  isGameRunning,
  logCount,
  onOpenCreateInstance,
  activeInstanceName,
}) => {
  const menuItems = [
    { id: 'play', label: 'Главная', icon: Gamepad2, badge: isGameRunning ? 'Live' : undefined, badgeColor: 'bg-emerald-500' },
    { id: 'instances', label: 'Экземпляры', icon: FolderGit2 },
    { id: 'loaders', label: 'Загрузчики', icon: Zap },
    { id: 'versions', label: 'Версии', icon: Layers },
    { id: 'mods', label: 'Моды & Шейдеры', icon: Package },
    { id: 'installed-mods', label: 'Мои моды', icon: FolderKanban },
    { id: 'skins', label: 'Скины и плащи', icon: Shirt },
    { id: 'servers', label: 'Серверы', icon: Radio },
    { id: 'gallery', label: 'Скриншоты', icon: Image },
    { id: 'console', label: 'Консоль игры', icon: Terminal, badge: logCount > 0 ? `${logCount}` : undefined },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  const handleSelect = (id: TabType) => {
    sounds.playClick();
    onTabChange(id);
  };

  return (
    <aside className="w-64 h-full flex flex-col justify-between bg-[#0b0f19]/80 backdrop-blur-xl border-r border-white/[0.06] select-none z-40 p-3">
      {/* Navigation menu */}
      <div className="space-y-2 overflow-y-auto pr-1">
        {/* Prominent Create Instance Button */}
        <button
          onClick={() => {
            sounds.playLevelUp();
            onOpenCreateInstance();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Создать экземпляр</span>
        </button>

        <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Меню лаунчера</span>
          {activeInstanceName && (
            <span className="text-[9px] text-emerald-400 truncate max-w-[100px] font-mono normal-case">
              {activeInstanceName}
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id as TabType)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      item.badgeColor
                        ? `${item.badgeColor} text-black animate-pulse`
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile & Utilities */}
      <div className="pt-3 border-t border-white/[0.06] space-y-2">
        {/* Sound toggle & quick folder */}
        <div className="flex items-center justify-between px-2 text-slate-400 text-xs">
          <span className="text-[11px] text-slate-500">Звуковые эффекты</span>
          <button
            onClick={() => {
              sounds.playPop();
              onToggleSound();
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
            }`}
            title={soundEnabled ? 'Выключить звуки' : 'Включить звуки'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-black font-bold text-xs shadow-inner">
              <User className="w-4 h-4 text-slate-900" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">{username}</div>
              <div className="text-[10px] text-emerald-400 font-mono">Офлайн / Пиратка</div>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onEditUsername();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors"
            title="Сменить никнейм"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
