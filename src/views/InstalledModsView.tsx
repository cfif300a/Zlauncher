import React, { useState } from 'react';
import {
  FolderKanban,
  FolderOpen,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { InstalledMod } from '../types';

interface InstalledModsViewProps {
  mods: InstalledMod[];
  onToggleMod: (filename: string, enable: boolean) => Promise<void>;
  onDeleteMod: (filename: string) => Promise<void>;
  onOpenModsFolder: () => void;
  onRefresh: () => void;
}

export const InstalledModsView: React.FC<InstalledModsViewProps> = ({
  mods,
  onToggleMod,
  onDeleteMod,
  onOpenModsFolder,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const totalBytes = mods.reduce((acc, m) => acc + m.size, 0);
  const enabledCount = mods.filter((m) => m.enabled).length;
  const disabledCount = mods.length - enabledCount;

  const filtered = mods.filter((m) =>
    m.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleEnableAll = async () => {
    sounds.playPop();
    for (const m of mods) {
      if (!m.enabled) {
        await onToggleMod(m.filename, true);
      }
    }
  };

  const handleDisableAll = async () => {
    sounds.playPop();
    for (const m of mods) {
      if (m.enabled) {
        await onToggleMod(m.filename, false);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-emerald-400" />
            <span>Установленные моды ({mods.length})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Управление активными .jar модами в изолированной папке текущего экземпляра
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sounds.playClick();
              onRefresh();
            }}
            className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
            title="Обновить список"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenModsFolder();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-colors shadow-sm"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Открыть папку mods</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar & Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Активно:</span>
            <span className="font-bold text-emerald-400 font-mono">{enabledCount}</span>
          </div>

          {disabledCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="text-slate-400">Отключено:</span>
              <span className="font-bold text-rose-400 font-mono">{disabledCount}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Общий вес:</span>
            <span className="font-bold text-cyan-300 font-mono">{formatSize(totalBytes)}</span>
          </div>
        </div>

        {/* Bulk Toggle Buttons */}
        {mods.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnableAll}
              className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 border border-white/[0.06] hover:border-emerald-500/30 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 transition-colors"
            >
              Включить все
            </button>
            <button
              onClick={handleDisableAll}
              className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.06] hover:border-rose-500/30 text-[11px] font-semibold text-slate-300 hover:text-rose-300 transition-colors"
            >
              Выключить все
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Быстрый поиск по установленным модам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 shadow-inner"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <HardDrive className="w-10 h-10 opacity-30 mb-2.5" />
            <span>В папке mods нет файлов или ничего не найдено</span>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.filename}
              className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${
                m.enabled
                  ? 'glass-card hover:border-emerald-500/40 shadow-sm'
                  : 'bg-black/40 border-white/[0.03] opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5 overflow-hidden pr-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    m.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <FileCheck className="w-5 h-5" />
                </div>

                <div className="overflow-hidden">
                  <div className="text-xs font-black text-white truncate font-mono">
                    {m.filename.replace(/\.disabled$/, '')}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                    <span>{formatSize(m.size)}</span>
                    <span className="text-slate-600">•</span>
                    <span>{new Date(m.modified).toLocaleDateString('ru-RU')}</span>
                    <span className="text-slate-600">•</span>
                    <span className={m.enabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {m.enabled ? 'Активен' : 'Отключен'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.playPop();
                    onToggleMod(m.filename, !m.enabled);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                    m.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {m.enabled ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>Включен</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                      <span>Выключен</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    if (confirm(`Удалить файл ${m.filename}?`)) {
                      onDeleteMod(m.filename);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Удалить мод"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
