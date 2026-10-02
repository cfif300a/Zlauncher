import React, { useState } from 'react';
import {
  Layers,
  Search,
  CheckCircle,
  Download,
  Zap,
  RefreshCw,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { VersionItem } from '../types';

interface VersionsViewProps {
  versions: VersionItem[];
  installedVersions: VersionItem[];
  selectedVersion: string;
  onSelectVersion: (versionId: string) => void;
  onInstallFabric: (versionId: string) => Promise<void>;
  onRefresh: () => void;
  isInstallingFabric: boolean;
}

export const VersionsView: React.FC<VersionsViewProps> = ({
  versions,
  installedVersions,
  selectedVersion,
  onSelectVersion,
  onInstallFabric,
  onRefresh,
  isInstallingFabric,
}) => {
  const [filterType, setFilterType] = useState<'releases' | 'installed' | 'fabric'>('releases');
  const [search, setSearch] = useState('');

  const installedIds = new Set(installedVersions.map((v) => v.id));

  const filtered = versions.filter((v) => {
    // Exclude snapshots completely
    if (v.type === 'snapshot' || v.id.includes('-') && !v.id.includes('fabric')) {
      return false;
    }

    // Search query
    if (search && !v.id.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    if (filterType === 'installed') {
      return installedIds.has(v.id);
    }
    if (filterType === 'fabric') {
      return v.id.includes('fabric') || (v.type === 'release' && !v.id.includes('-'));
    }
    return v.type === 'release';
  });

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>Версии Minecraft</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Официальные стабильные релизы Mojang и автоматическая установка Fabric Loader
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onRefresh();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Обновить список</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('releases');
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterType === 'releases' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Релизы
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('installed');
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filterType === 'installed' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Установленные</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{installedVersions.length}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setFilterType('fabric');
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filterType === 'fabric' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Fabric</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск версии (1.20, 1.16...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Layers className="w-8 h-8 mb-2 opacity-30" />
            <span>Версии не найдены</span>
          </div>
        ) : (
          filtered.map((v) => {
            const isSelected = selectedVersion === v.id;
            const isInstalled = installedIds.has(v.id);

            return (
              <div
                key={v.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      v.type === 'release'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {v.id.includes('fabric') ? 'FB' : 'MC'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm font-mono">{v.id}</span>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Выбрана
                        </span>
                      )}
                      {isInstalled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Установлена
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="capitalize">{v.type}</span>
                      {v.releaseTime && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(v.releaseTime).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Fabric button if release */}
                  {v.type === 'release' && !v.id.includes('fabric') && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onInstallFabric(v.id);
                      }}
                      disabled={isInstallingFabric}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-300 transition-colors disabled:opacity-50"
                      title="Установить профиль Fabric для этой версии"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Установить Fabric</span>
                    </button>
                  )}

                  {/* Select button */}
                  <button
                    onClick={() => {
                      sounds.playPop();
                      onSelectVersion(v.id);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-medium text-xs transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 text-black font-bold'
                        : 'bg-white/[0.06] hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Выбрано</span>
                      </>
                    ) : (
                      <span>Выбрать</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
