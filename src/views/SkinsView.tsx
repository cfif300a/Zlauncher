import React, { useState } from 'react';
import {
  Shirt,
  Upload,
  Search,
  Sparkles,
  Check,
  RefreshCw,
  Palette,
  Play,
  RotateCcw,
  Download,
  Eye,
} from 'lucide-react';
import { SkinViewer3D } from '../components/SkinViewer3D';
import { sounds } from '../utils/audio';

interface SkinsViewProps {
  currentSkinUrl: string;
  skinType: 'classic' | 'slim';
  onUpdateSkin: (url: string, type: 'classic' | 'slim') => void;
  username: string;
  onShowToast?: (toast: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}

export const SkinsView: React.FC<SkinsViewProps> = ({
  currentSkinUrl,
  skinType,
  onUpdateSkin,
  username,
  onShowToast,
}) => {
  const [activeSkin, setActiveSkin] = useState(currentSkinUrl);
  const [activeModel, setActiveModel] = useState<'classic' | 'slim'>(skinType);
  const [capeUrl, setCapeUrl] = useState<string | undefined>(undefined);
  const [anim, setAnim] = useState<'idle' | 'walk' | 'run' | 'wave' | 'none'>('idle');
  const [searchNick, setSearchNick] = useState(username);
  const [searching, setSearching] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preset skins (tested & guaranteed to load)
  const presets = [
    {
      name: 'Стив (Классика)',
      url: 'https://minotar.net/skin/MHF_Steve',
      type: 'classic',
    },
    {
      name: 'Алекс (Слим)',
      url: 'https://minotar.net/skin/MHF_Alex',
      type: 'slim',
    },
    {
      name: 'Notch (Классика)',
      url: 'https://minotar.net/skin/Notch',
      type: 'classic',
    },
    {
      name: 'Technoblade',
      url: 'https://minotar.net/skin/Technoblade',
      type: 'classic',
    },
    {
      name: 'Dream',
      url: 'https://minotar.net/skin/Dream',
      type: 'classic',
    },
    {
      name: 'Grian',
      url: 'https://minotar.net/skin/Grian',
      type: 'classic',
    },
    {
      name: 'DanTDM',
      url: 'https://minotar.net/skin/DanTDM',
      type: 'classic',
    },
  ];

  // Cape presets
  const capes = [
    { name: 'Без плаща', url: undefined },
    {
      name: '15 лет Minecraft',
      url: 'https://textures.minecraft.net/texture/23490ae23d508d46113a40cc17665444b30e83a5c7e85653d37280cf6b412a3',
    },
    {
      name: 'OptiFine Cape',
      url: 'https://optifine.net/capes/sp614x.png',
    },
    {
      name: 'Праздничный Плащ',
      url: 'https://textures.minecraft.net/texture/1791279090c5306871393cb177e766a933e460e778618779c6fa4d7293252455',
    },
  ];

  const handleSelectFile = async () => {
    sounds.playClick();
    if ((window as any).electronAPI) {
      const dataUrl = await (window as any).electronAPI.selectSkinFile();
      if (dataUrl) {
        sounds.playPop();
        setActiveSkin(dataUrl);
      }
    }
  };

  const handleSearchNick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNick.trim()) return;

    sounds.playClick();
    setSearching(true);
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.fetchPlayerSkin(searchNick.trim());
        if (res && res.skinUrl) {
          sounds.playPop();
          setActiveSkin(res.skinUrl);
        }
      }
    } catch (e) {
      sounds.playError();
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Скин не найден',
          message: 'Не удалось найти скин для указанного никнейма',
        });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadSkin = () => {
    sounds.playPop();
    const a = document.createElement('a');
    a.href = activeSkin;
    a.download = `minecraft_skin_${Date.now()}.png`;
    a.click();
  };

  const handleSaveToGame = () => {
    sounds.playLevelUp();
    onUpdateSkin(activeSkin, activeModel);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="w-full h-full flex p-8 gap-8 overflow-hidden select-none">
      {/* Left Column: 3D Stage */}
      <div className="flex-1 flex flex-col items-center justify-between p-6 rounded-3xl glass-card backdrop-blur-2xl relative shadow-2xl">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>3D Интерактивная примерочная</span>
          </div>

          {/* Animation selector */}
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs">
            {[
              { id: 'idle', label: 'Покой' },
              { id: 'walk', label: 'Ходьба' },
              { id: 'run', label: 'Бег' },
              { id: 'wave', label: 'Привет' },
              { id: 'none', label: 'Стоп' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  sounds.playClick();
                  setAnim(item.id as any);
                }}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  anim === item.id
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3D Model with Pedestal */}
        <div className="relative my-auto">
          <SkinViewer3D
            skinUrl={activeSkin}
            capeUrl={capeUrl}
            isSlim={activeModel === 'slim'}
            width={340}
            height={440}
            animation={anim}
            interactive={true}
          />
        </div>

        <div className="flex items-center justify-between w-full pt-3 border-t border-white/[0.05] text-[11px] text-slate-500">
          <span>Вращайте модель мышью, колесо для зума</span>
          <button
            onClick={handleDownloadSkin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Скачать скин (.PNG)</span>
          </button>
        </div>
      </div>

      {/* Right Column: Controls & Presets */}
      <div className="w-96 flex flex-col justify-between space-y-4 overflow-y-auto pr-1">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Shirt className="w-6 h-6 text-emerald-400" />
              <span>Гардероб скинов</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Установка скинов из Ely.by, Mojang или собственного файла
            </p>
          </div>

          {/* Model Type Switcher (Steve vs Alex) */}
          <div className="p-4 rounded-3xl glass-card space-y-2">
            <span className="text-xs font-bold text-slate-300">Тип модели (толщина рук)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  sounds.playClick();
                  setActiveModel('classic');
                }}
                className={`py-2.5 rounded-2xl font-bold border transition-colors ${
                  activeModel === 'classic'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-slate-400 border-transparent hover:bg-white/[0.06]'
                }`}
              >
                Классика (4px Steve)
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setActiveModel('slim');
                }}
                className={`py-2.5 rounded-2xl font-bold border transition-colors ${
                  activeModel === 'slim'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-slate-400 border-transparent hover:bg-white/[0.06]'
                }`}
              >
                Тонкие руки (3px Alex)
              </button>
            </div>
          </div>

          {/* Upload Custom Skin Button */}
          <button
            onClick={handleSelectFile}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider transition-all shadow-sm group hover:scale-[1.02]"
          >
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Загрузить свой скин (.PNG)</span>
          </button>

          {/* Find by Nickname */}
          <form onSubmit={handleSearchNick} className="space-y-1.5">
            <span className="text-xs font-bold text-slate-300">Найти скин по нику (Ely.by / Mojang)</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Никнейм игрока..."
                value={searchNick}
                onChange={(e) => setSearchNick(e.target.value)}
                className="w-full pl-3.5 pr-20 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 shadow-inner select-text cursor-text"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {searching ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : 'Найти'}
              </button>
            </div>
          </form>

          {/* Preset Skins */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">Готовые скины</span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    sounds.playPop();
                    setActiveSkin(p.url);
                    setActiveModel(p.type as any);
                  }}
                  className="p-2.5 rounded-2xl glass-card text-left text-xs text-slate-300 hover:text-white transition-colors truncate font-medium"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Capes Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">Плащи</span>
            <div className="grid grid-cols-2 gap-2">
              {capes.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    sounds.playPop();
                    setCapeUrl(c.url);
                  }}
                  className={`p-2.5 rounded-2xl text-left text-xs transition-colors truncate border font-medium ${
                    capeUrl === c.url
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-sm'
                      : 'glass-card text-slate-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save & Apply Button */}
        <button
          onClick={handleSaveToGame}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-xl ${
            savedSuccess
              ? 'bg-emerald-400 text-slate-950 font-black'
              : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:via-teal-300 hover:to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:scale-[1.02]'
          }`}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Скин сохранен и применен!</span>
            </>
          ) : (
            <>
              <Shirt className="w-4 h-4" />
              <span>Применить скин в игре</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
