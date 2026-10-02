import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, Box, Sparkles, User, Zap } from 'lucide-react';
import { sounds } from '../utils/audio';

interface TitleBarProps {
  isGameRunning: boolean;
  launchStatus?: string;
  selectedVersion: string;
  activeInstanceName?: string;
  username?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isGameRunning,
  launchStatus,
  selectedVersion,
  activeInstanceName,
  username,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if ((window as any).electronAPI) {
        const max = await (window as any).electronAPI.isMaximized();
        setIsMaximized(max);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    sounds.playClick();
    (window as any).electronAPI?.minimize();
  };

  const handleMaximize = async () => {
    sounds.playClick();
    await (window as any).electronAPI?.maximize();
    const max = await (window as any).electronAPI?.isMaximized();
    setIsMaximized(max);
  };

  const handleClose = () => {
    sounds.playClick();
    (window as any).electronAPI?.close();
  };

  return (
    <div
      className="h-10 w-full flex items-center justify-between px-3 select-none z-50 bg-[#090d16]/95 backdrop-blur-2xl border-b border-white/[0.06]"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Brand & Logo with glowing cubic badge */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
          <Box className="w-3.5 h-3.5 text-slate-950 stroke-[2.8]" />
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="font-black tracking-widest text-sm bg-gradient-to-r from-emerald-300 via-teal-100 to-cyan-300 bg-clip-text text-transparent">
            ZLAUNCHER
          </span>
          <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-wider">
            ULTRA
          </span>
        </div>

        {activeInstanceName && (
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="truncate max-w-[140px] text-slate-300">{activeInstanceName}</span>
          </div>
        )}
      </div>

      {/* Middle status pill */}
      <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs shadow-inner">
        {isGameRunning ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </span>
            <span className="text-emerald-300 font-bold tracking-wide">В ИГРЕ</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-mono text-[11px]">{selectedVersion}</span>
          </>
        ) : launchStatus ? (
          <>
            <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
            <span className="text-amber-300 font-semibold truncate max-w-[280px]">{launchStatus}</span>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"></span>
            <span className="text-slate-400 text-[11px]">Готов к запуску</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 text-[11px] font-mono font-medium">MC {selectedVersion}</span>
          </>
        )}
      </div>

      {/* Window Controls */}
      <div
        className="flex items-center gap-1.5"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {username && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-300 mr-1">
            <User className="w-3 h-3 text-emerald-400" />
            <span className="font-semibold truncate max-w-[100px]">{username}</span>
          </div>
        )}

        <button
          onClick={handleMinimize}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
          title="Свернуть"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleMaximize}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
          title={isMaximized ? 'Восстановить' : 'Развернуть'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
          title="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
