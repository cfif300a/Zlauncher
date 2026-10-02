import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Users,
  Zap,
  Trash2,
  Sparkles,
  Server,
  Globe,
  Activity,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { ServerStatus } from '../types';

interface ServerEntry {
  name: string;
  ip: string;
  port?: number;
}

export const ServersView: React.FC = () => {
  const [servers, setServers] = useState<ServerEntry[]>([
    { name: 'Hypixel Network', ip: 'mc.hypixel.net' },
    { name: 'Mineland Network', ip: 'mc.mineland.net' },
    { name: 'GommeHD', ip: 'gommehd.net' },
    { name: 'Kaboom', ip: 'kaboom.pw' },
  ]);

  const [statuses, setStatuses] = useState<Record<string, ServerStatus>>({});
  const [loading, setLoading] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // New server modal inputs
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');

  const pingAllServers = async () => {
    setLoading(true);
    const newStatuses: Record<string, ServerStatus> = {};

    for (const s of servers) {
      try {
        if ((window as any).electronAPI) {
          const res = await (window as any).electronAPI.pingServer(s.ip, s.port || 25565);
          newStatuses[s.ip] = res;
        }
      } catch (e) {
        console.error('Ping failed for', s.ip, e);
      }
    }

    setStatuses(newStatuses);
    setLoading(false);
  };

  useEffect(() => {
    pingAllServers();
  }, [servers]);

  const handleCopyIp = (ip: string) => {
    sounds.playPop();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    sounds.playLevelUp();
    setServers([...servers, { name: newName.trim() || newIp.trim(), ip: newIp.trim() }]);
    setNewName('');
    setNewIp('');
    setShowAddModal(false);
  };

  const handleDeleteServer = (ip: string) => {
    sounds.playClick();
    setServers(servers.filter((s) => s.ip !== ip));
  };

  const getPingColor = (ping?: number) => {
    if (!ping) return 'text-slate-500';
    if (ping < 50) return 'text-emerald-400';
    if (ping < 110) return 'text-cyan-400';
    if (ping < 160) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getPingRating = (ping?: number) => {
    if (!ping) return 'Неизвестно';
    if (ping < 50) return 'Идеальный пинг';
    if (ping < 110) return 'Отличный';
    if (ping < 160) return 'Нормальный';
    return 'Высокий пинг';
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-emerald-400" />
            <span>Радар серверов Minecraft</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Мониторинг пинга в реальном времени, проверка онлайна и быстрый ввод IP
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sounds.playClick();
              pingAllServers();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить пинг</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Добавить сервер</span>
          </button>
        </div>
      </div>

      {/* Servers List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {servers.map((s) => {
          const status = statuses[s.ip];
          const isOnline = status?.online ?? false;
          const ping = status?.ping;
          const motdClean = status?.motd?.clean?.join(' ') || 'Minecraft Server';

          return (
            <div
              key={s.ip}
              className={`flex items-center justify-between p-4.5 rounded-3xl border transition-all hover:scale-[1.008] group ${
                isOnline
                  ? 'glass-card hover:border-emerald-500/40 shadow-sm'
                  : 'bg-white/[0.015] border-white/[0.04] opacity-75'
              }`}
            >
              <div className="flex items-center gap-4 overflow-hidden pr-4">
                {/* Icon */}
                {status?.icon ? (
                  <img
                    src={status.icon}
                    alt={s.name}
                    className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl object-cover bg-black/40 flex-shrink-0 border border-white/[0.08] shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Server className="w-6 h-6" />
                  </div>
                )}

                <div className="overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-white text-base tracking-tight truncate">{s.name}</h3>
                    <span className="font-mono text-xs text-slate-300 px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/5 font-semibold">
                      {s.ip}
                    </span>

                    {isOnline ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Онлайн
                      </span>
                    ) : (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        Не в сети
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 truncate mt-1 max-w-xl font-mono">
                    {motdClean}
                  </p>

                  <div className="flex items-center gap-4 text-xs mt-2 text-slate-400 font-mono">
                    {isOnline && status.players && (
                      <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {status.players.online.toLocaleString()} / {status.players.max.toLocaleString()}
                        </span>
                      </span>
                    )}

                    {isOnline && (
                      <span className="flex items-center gap-1.5">
                        <Activity className={`w-3.5 h-3.5 ${getPingColor(ping)}`} />
                        <span className={`font-bold ${getPingColor(ping)}`}>{ping || 45} ms</span>
                        <span className="text-[10px] text-slate-500">({getPingRating(ping)})</span>
                      </span>
                    )}

                    {status?.version && (
                      <span className="text-slate-500 text-[11px] truncate max-w-xs font-sans">
                        Версия: {status.version}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyIp(s.ip)}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.04] hover:bg-emerald-500/20 border border-white/[0.08] hover:border-emerald-500/30 text-xs font-bold text-slate-200 hover:text-emerald-300 transition-all shadow-sm"
                >
                  {copiedIp === s.ip ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать IP</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteServer(s.ip)}
                  className="p-2.5 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Удалить из списка"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddServer}
            className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4"
          >
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Добавить сервер Minecraft</span>
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Название сервера</label>
              <input
                type="text"
                placeholder="Например: Мой любимый сервер"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">IP адрес или домен</label>
              <input
                type="text"
                placeholder="play.hypixel.net"
                required
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                Добавить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
