import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Trash2,
  Square,
  Search,
  Check,
  ArrowDownCircle,
  AlertTriangle,
  Info,
  Bug,
  Download,
  X,
  Radio,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { ConsoleLogEntry } from '../types';

interface ConsoleViewProps {
  logs: ConsoleLogEntry[];
  onClearLogs: () => void;
  onKillGame: () => void;
  isGameRunning: boolean;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  logs,
  onClearLogs,
  onKillGame,
  isGameRunning,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'system'>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Handle user manual scrolling to pause auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const handleCopyLogs = () => {
    sounds.playSuccess();
    const fullText = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLogs = () => {
    sounds.playLevelUp();
    const fullText = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`)
      .join('\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zlauncher-minecraft-log-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const stats = useMemo(() => {
    let errors = 0;
    let warns = 0;
    let infos = 0;
    let systems = 0;

    for (const log of logs) {
      const lower = log.text.toLowerCase();
      if (log.type === 'system') {
        systems++;
      } else if (log.type === 'stderr' || lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) {
        errors++;
      } else if (lower.includes('warn')) {
        warns++;
      } else {
        infos++;
      }
    }

    return { errors, warns, infos, systems, total: logs.length };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (search && !l.text.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      const lower = l.text.toLowerCase();
      if (filter === 'error') {
        return (
          l.type === 'stderr' ||
          lower.includes('error') ||
          lower.includes('exception') ||
          lower.includes('fatal')
        );
      }
      if (filter === 'warn') {
        return lower.includes('warn');
      }
      if (filter === 'system') {
        return l.type === 'system';
      }
      if (filter === 'info') {
        return l.type !== 'system' && !lower.includes('warn') && !lower.includes('error') && !lower.includes('exception');
      }
      return true;
    });
  }, [logs, search, filter]);

  const getLogTag = (log: ConsoleLogEntry) => {
    if (log.type === 'system') {
      return { tag: 'SYS', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    const lower = log.text.toLowerCase();
    if (log.type === 'stderr' || lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) {
      return { tag: 'ERR', style: 'bg-rose-500/25 text-rose-300 border-rose-500/40' };
    }
    if (lower.includes('warn')) {
      return { tag: 'WARN', style: 'bg-amber-500/25 text-amber-300 border-amber-500/40' };
    }
    return { tag: 'INFO', style: 'bg-slate-700/50 text-slate-300 border-white/5' };
  };

  const getLogTextColor = (log: ConsoleLogEntry) => {
    if (log.type === 'system') return 'text-cyan-300 font-semibold';
    const lower = log.text.toLowerCase();
    if (log.type === 'stderr' || lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) {
      return 'text-rose-400 font-medium';
    }
    if (lower.includes('warn')) {
      return 'text-amber-300';
    }
    return 'text-slate-300';
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-emerald-400" />
            <span>Консоль процесса Minecraft</span>
            {isGameRunning && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>ПРОЦЕСС АКТИВЕН</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Потоковый вывод JVM, игровых логов, загрузчика модов и сетевых событий
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isGameRunning && (
            <button
              onClick={() => {
                sounds.playError();
                onKillGame();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30 active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Остановить игру</span>
            </button>
          )}

          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors"
            title="Скачать лог в файл .txt"
          >
            {exported ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Файл скачан!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Экспорт .txt</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Копировать</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onClearLogs();
            }}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-400 border border-white/[0.08] text-slate-400 transition-colors"
            title="Очистить вывод консоли"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs space-x-1">
          <button
            onClick={() => {
              sounds.playClick();
              setFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            Все ({stats.total})
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setFilter('error');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filter === 'error'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-rose-300 hover:bg-white/[0.02]'
            }`}
          >
            <Bug className="w-3 h-3 text-rose-400" />
            <span>Ошибки ({stats.errors})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setFilter('warn');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filter === 'warn'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-300 hover:bg-white/[0.02]'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Варнинги ({stats.warns})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setFilter('system');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filter === 'system'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.02]'
            }`}
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>Система ({stats.systems})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setFilter('info');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filter === 'info'
                ? 'bg-slate-700/50 text-slate-200 border border-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Info className="w-3 h-3 text-slate-400" />
            <span>Инфо ({stats.infos})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playPop();
              setAutoScroll(!autoScroll);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              autoScroll
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-slate-300'
            }`}
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span>Авто-прокрутка {autoScroll ? 'Вкл' : 'Выкл'}</span>
          </button>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по тексту лога..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 rounded-3xl bg-black/75 border border-white/[0.08] font-mono text-xs overflow-y-auto leading-relaxed select-text space-y-1.5 backdrop-blur-xl shadow-inner relative"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 select-none py-16">
            <Terminal className="w-12 h-12 stroke-[1.5] opacity-25 mb-3" />
            <span className="font-bold text-slate-400 text-sm">
              {search ? 'Ничего не найдено по вашему запросу' : 'Консоль пуста'}
            </span>
            <span className="text-[11px] text-slate-600 mt-1 max-w-sm text-center">
              {search
                ? 'Попробуйте изменить поисковый запрос'
                : 'Запустите Minecraft, чтобы увидеть сообщения движка, сетевую активность и загрузку модов.'}
            </span>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const { tag, style } = getLogTag(log);
            const textColor = getLogTextColor(log);

            return (
              <div
                key={index}
                className="flex items-start gap-2.5 break-all hover:bg-white/[0.02] px-2 py-0.5 rounded-lg group transition-colors"
              >
                {/* Line number */}
                <span className="text-slate-700 text-[10px] w-8 text-right select-none flex-shrink-0 font-mono">
                  {index + 1}
                </span>

                {/* Timestamp */}
                <span className="text-slate-600 text-[10px] select-none flex-shrink-0 font-mono">
                  [{log.timestamp}]
                </span>

                {/* Badge Tag */}
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border select-none flex-shrink-0 ${style}`}
                >
                  {tag}
                </span>

                {/* Log Text */}
                <span className={`flex-1 ${textColor}`}>{log.text}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Floating jump-to-bottom button if scrolled up */}
      {!autoScroll && logs.length > 0 && (
        <button
          onClick={() => {
            sounds.playPop();
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-12 right-12 flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl hover:scale-105 transition-all z-20 animate-bounce"
        >
          <ArrowDownCircle className="w-4 h-4 stroke-[2.5]" />
          <span>К последним логам</span>
        </button>
      )}
    </div>
  );
};
