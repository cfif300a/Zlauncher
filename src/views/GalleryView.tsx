import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  FolderOpen,
  RefreshCw,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowUpDown,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface ScreenshotItem {
  filename: string;
  path: string;
  date: number;
  url: string;
}

export const GalleryView: React.FC = () => {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [lightboxCopied, setLightboxCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const loadScreenshots = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.getScreenshots();
        setScreenshots(res || []);
      }
    } catch (e) {
      console.error('Failed to load screenshots:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScreenshots();
  }, []);

  const handleOpenFolder = () => {
    sounds.playClick();
    (window as any).electronAPI?.openFolder('screenshots');
  };

  const handleShowInFolder = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    sounds.playClick();
    (window as any).electronAPI?.showItemInFolder(filePath);
  };

  const handleCopyImage = async (e: React.MouseEvent, photo: ScreenshotItem, index?: number) => {
    e.stopPropagation();
    sounds.playSuccess();
    try {
      if ((window as any).electronAPI?.copyImageToClipboard) {
        await (window as any).electronAPI.copyImageToClipboard(photo.path);
      }
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        setLightboxCopied(true);
        setTimeout(() => setLightboxCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  const handleDeleteScreenshot = async (filePath: string) => {
    sounds.playPop();
    try {
      if ((window as any).electronAPI?.deleteScreenshot) {
        await (window as any).electronAPI.deleteScreenshot(filePath);
      }
      setDeleteConfirm(false);
      setZoomLevel(1);
      // Update local list
      const updated = screenshots.filter((s) => s.path !== filePath);
      setScreenshots(updated);
      if (activePhoto !== null) {
        if (updated.length === 0) {
          setActivePhoto(null);
        } else if (activePhoto >= updated.length) {
          setActivePhoto(updated.length - 1);
        }
      }
    } catch (e) {
      console.error('Failed to delete screenshot:', e);
    }
  };

  const sortedScreenshots = [...screenshots].sort((a, b) => {
    return sortOrder === 'desc' ? b.date - a.date : a.date - b.date;
  });

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (activePhoto !== null && activePhoto > 0) {
        sounds.playClick();
        setActivePhoto(activePhoto - 1);
        setZoomLevel(1);
        setDeleteConfirm(false);
      }
    },
    [activePhoto]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (activePhoto !== null && activePhoto < sortedScreenshots.length - 1) {
        sounds.playClick();
        setActivePhoto(activePhoto + 1);
        setZoomLevel(1);
        setDeleteConfirm(false);
      }
    },
    [activePhoto, sortedScreenshots.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePhoto === null) return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        sounds.playClick();
        setActivePhoto(null);
        setZoomLevel(1);
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)));
      } else if (e.key === '-') {
        setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, handlePrev, handleNext]);

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-emerald-400" />
            <span>Галерея скриншотов</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold">
              {screenshots.length} фото
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Снимки экрана игрового процесса. Нажимайте клавишу <span className="text-emerald-400 font-bold font-mono">F2</span> во время игры
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sort order toggle */}
          <button
            onClick={() => {
              sounds.playClick();
              setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all"
            title="Порядок сортировки"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>{sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              loadScreenshots();
            }}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
            title="Обновить галерею"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition-all shadow-sm hover:scale-[1.02]"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Папка со скриншотами</span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {sortedScreenshots.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-white/[0.01] border border-white/[0.06] backdrop-blur-md">
            <div className="relative p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Camera className="w-12 h-12 stroke-[1.5]" />
              <Sparkles className="w-4 h-4 absolute top-3 right-3 text-cyan-400 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Скриншотов пока нет</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              Зайдите в Minecraft и нажмите клавишу <span className="text-emerald-400 font-bold font-mono">F2</span>, чтобы запечатлеть свои постройки, эпичные пейзажи и победы над боссами!
            </p>
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Открыть папку скриншотов</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 pb-4">
            {sortedScreenshots.map((s, index) => (
              <div
                key={s.filename}
                onClick={() => {
                  sounds.playPop();
                  setActivePhoto(index);
                  setZoomLevel(1);
                }}
                className="group relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 aspect-video cursor-pointer hover:border-emerald-500/50 transition-all shadow-md hover:scale-[1.02]"
              >
                <img
                  src={s.url}
                  alt={s.filename}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Quick overlay buttons on hover */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => handleCopyImage(e, s, index)}
                    className="p-1.5 rounded-lg bg-black/70 hover:bg-emerald-600 text-white backdrop-blur-md transition-colors"
                    title="Копировать картинку в буфер"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => handleShowInFolder(e, s.path)}
                    className="p-1.5 rounded-lg bg-black/70 hover:bg-slate-700 text-white backdrop-blur-md transition-colors"
                    title="Показать в проводнике"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>

                  <div className="p-1.5 rounded-lg bg-black/70 text-white backdrop-blur-md">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Bottom details banner */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                  <div className="text-xs font-bold text-white truncate font-mono drop-shadow">
                    {s.filename}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 flex items-center justify-between">
                    <span>{new Date(s.date).toLocaleString('ru-RU')}</span>
                    <span className="text-emerald-400 font-bold font-mono">PNG</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox High-Tech Modal */}
      {activePhoto !== null && sortedScreenshots[activePhoto] && (
        <div
          onClick={() => {
            sounds.playClick();
            setActivePhoto(null);
            setZoomLevel(1);
          }}
          className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-between z-50 p-6 select-none animate-in fade-in duration-200"
        >
          {/* Lightbox Floating Controls Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-2xl z-50"
          >
            {/* Left: Counter & Filename */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono">
                {activePhoto + 1} / {sortedScreenshots.length}
              </span>
              <span className="text-xs font-mono text-slate-300 truncate max-w-xs">
                {sortedScreenshots[activePhoto].filename}
              </span>
            </div>

            {/* Middle: Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-xl border border-white/5 text-xs text-slate-300">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Уменьшить (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="w-12 text-center font-mono text-[11px] text-emerald-400 font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                onClick={() => setZoomLevel((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Увеличить (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {zoomLevel !== 1 && (
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 ml-1 rounded-lg hover:bg-white/10 text-cyan-400 transition-colors"
                  title="Сброс масштаба (0)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleCopyImage(e, sortedScreenshots[activePhoto])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-200 transition-colors"
                title="Скопировать картинку в буфер обмена для вставки в Discord/VK"
              >
                {lightboxCopied ? (
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
                onClick={(e) => handleShowInFolder(e, sortedScreenshots[activePhoto].path)}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Показать файл в проводнике Windows"
              >
                <FolderOpen className="w-4 h-4" />
              </button>

              {deleteConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteScreenshot(sortedScreenshots[activePhoto].path)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                  >
                    Да, удалить
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-slate-400 transition-colors"
                  title="Удалить скриншот"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => {
                  sounds.playClick();
                  setActivePhoto(null);
                  setZoomLevel(1);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
                title="Закрыть (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {activePhoto > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-slate-900/80 hover:bg-emerald-500 border border-white/10 text-white hover:text-black transition-all z-50 shadow-2xl hover:scale-110"
              title="Предыдущее фото (Стрелка влево)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {activePhoto < sortedScreenshots.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-slate-900/80 hover:bg-emerald-500 border border-white/10 text-white hover:text-black transition-all z-50 shadow-2xl hover:scale-110"
              title="Следующее фото (Стрелка вправо)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Center Image Container with Zoom */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 w-full max-h-[78vh] flex items-center justify-center overflow-hidden my-auto"
          >
            <img
              src={sortedScreenshots[activePhoto].url}
              alt={sortedScreenshots[activePhoto].filename}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10 transition-transform duration-200"
            />
          </div>

          {/* Bottom Info Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between px-5 py-2 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 z-50"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-300 font-semibold">
                {sortedScreenshots[activePhoto].filename}
              </span>
              <span>•</span>
              <span>{new Date(sortedScreenshots[activePhoto].date).toLocaleString('ru-RU')}</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>Используйте клавиши ← → для переключения</span>
              <span>•</span>
              <span>+ / - для зума</span>
              <span>•</span>
              <span>Esc для выхода</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
