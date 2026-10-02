import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar, TabType } from './components/Sidebar';
import { ParticleCanvas } from './components/ParticleCanvas';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { PlayView } from './views/PlayView';
import { InstancesView } from './views/InstancesView';
import { LoadersView } from './views/LoadersView';
import { VersionsView } from './views/VersionsView';
import { ModsView } from './views/ModsView';
import { InstalledModsView } from './views/InstalledModsView';
import { SkinsView } from './views/SkinsView';
import { ServersView } from './views/ServersView';
import { GalleryView } from './views/GalleryView';
import { ConsoleView } from './views/ConsoleView';
import { SettingsView } from './views/SettingsView';
import { sounds } from './utils/audio';
import { LauncherConfig, VersionItem, ConsoleLogEntry, InstalledMod, Instance } from './types';
import { User, Check, X } from 'lucide-react';

const DEFAULT_CONFIG: LauncherConfig = {
  username: 'Player_' + Math.floor(1000 + Math.random() * 9000),
  selectedVersion: '1.20.4',
  activeInstanceId: 'default',
  instances: [
    {
      id: 'default',
      name: 'Основной',
      minecraftVersion: '1.20.4',
      loader: 'vanilla',
      versionId: '1.20.4',
      icon: 'grass',
      created: Date.now(),
      modsCount: 0,
    },
  ],
  minRam: 1024,
  maxRam: 4096,
  javaPath: '',
  jvmPreset: 'optimized',
  customJvmArgs: '',
  gameDir: '',
  resolution: {
    width: 1280,
    height: 720,
    fullscreen: false,
  },
  soundEnabled: true,
  soundVolume: 70,
  theme: 'cyber',
  particles: true,
  skinUrl: 'https://textures.minecraft.net/texture/414e8a4a5be434f0e5eb9816008b4eb9d8463e26bb1785de11cf3fa244ee1a8f',
  skinType: 'classic',
};

export const App: React.FC = () => {
  const [config, setConfig] = useState<LauncherConfig>(DEFAULT_CONFIG);
  const [currentTab, setCurrentTab] = useState<TabType>('play');
  const [instances, setInstances] = useState<Instance[]>(DEFAULT_CONFIG.instances);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [installedVersions, setInstalledVersions] = useState<VersionItem[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [launchStatus, setLaunchStatus] = useState('');
  const [launchProgress, setLaunchProgress] = useState(0);
  const [launchDetails, setLaunchDetails] = useState<string | undefined>(undefined);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [isInstallingFabric, setIsInstallingFabric] = useState(false);

  // Instance creation modal
  const [showCreateInstanceModal, setShowCreateInstanceModal] = useState(false);
  const [initialLoaderForCreate, setInitialLoaderForCreate] = useState<
    'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt'
  >('fabric');

  // Edit nickname modal
  const [showNickModal, setShowNickModal] = useState(false);
  const [newNick, setNewNick] = useState('');

  const activeInstance =
    instances.find((i) => i.id === config.activeInstanceId) || instances[0];

  // Initial load
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    // 1. Load config
    api.getConfig().then((loaded: any) => {
      if (loaded) {
        setConfig((prev) => ({ ...prev, ...loaded }));
        sounds.setConfig(loaded.soundEnabled, loaded.soundVolume);
      }
    });

    // 2. Load instances
    loadInstances();

    // 3. Load versions (only releases!)
    loadAllVersions();

    // 4. Check if game is running
    api.isGameRunning().then((running: boolean) => setIsGameRunning(running));

    // 5. IPC listeners
    const unbindProgress = api.onLaunchProgress((data: any) => {
      setLaunchStatus(data.status);
      setLaunchProgress(data.progress);
      setLaunchDetails(data.details);
    });

    const unbindLogs = api.onConsoleLog((log: ConsoleLogEntry) => {
      setLogs((prev) => [...prev.slice(-1500), log]);
    });

    const unbindExit = api.onGameExit(() => {
      setIsGameRunning(false);
      setLaunchStatus('');
      setLaunchProgress(0);
      setLaunchDetails(undefined);
    });

    return () => {
      unbindProgress?.();
      unbindLogs?.();
      unbindExit?.();
    };
  }, []);

  // Reload mods when active instance changes
  useEffect(() => {
    if (config.activeInstanceId) {
      loadMods(config.activeInstanceId);
    }
  }, [config.activeInstanceId]);

  const loadInstances = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    try {
      const list = await api.getInstances();
      if (list && list.length > 0) {
        setInstances(list);
        setConfig((prev) => ({ ...prev, instances: list }));
      }
    } catch (e) {
      console.error('Failed to load instances:', e);
    }
  };

  const loadAllVersions = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    try {
      const manifest = await api.getManifestVersions();
      if (manifest?.versions) {
        // Strictly releases, no snapshots!
        const releasesOnly = manifest.versions.filter((v: any) => v.type === 'release');
        setVersions(releasesOnly);
      }
    } catch (e) {
      console.warn('Failed to fetch online versions:', e);
    }

    try {
      const installed = await api.getInstalledVersions();
      if (installed) {
        setInstalledVersions(installed);
        setVersions((prev) => {
          const map = new Map<string, VersionItem>();
          installed.forEach((v: any) => map.set(v.id, v));
          prev.forEach((v) => {
            if (!map.has(v.id)) map.set(v.id, v);
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {}
  };

  const loadMods = async (instanceId?: string) => {
    const api = (window as any).electronAPI;
    if (!api) return;
    try {
      const mods = await api.getInstalledMods(instanceId || config.activeInstanceId);
      setInstalledMods(mods || []);
    } catch (e) {}
  };

  const handleSaveConfig = (updates: Partial<LauncherConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    sounds.setConfig(updated.soundEnabled, updated.soundVolume);
    (window as any).electronAPI?.saveConfig(updated);
  };

  const handleCreateInstance = async (opts: {
    name: string;
    minecraftVersion: string;
    loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
    icon: string;
  }) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const created = await api.createInstance(opts);
    sounds.playLevelUp();
    const updatedList = await api.getInstances();
    if (updatedList) {
      setInstances(updatedList);
      setConfig((prev) => ({
        ...prev,
        activeInstanceId: created.id,
        selectedVersion: created.versionId,
        instances: updatedList,
      }));
    }
    await loadMods(created.id);
    setCurrentTab('play');
  };

  const handleSelectInstance = async (id: string) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const active = await api.setActiveInstance(id);
    if (active) {
      const updatedList = await api.getInstances();
      if (updatedList) {
        setInstances(updatedList);
        setConfig((prev) => ({
          ...prev,
          activeInstanceId: active.id,
          selectedVersion: active.versionId,
          instances: updatedList,
        }));
      }
      await loadMods(active.id);
    }
  };

  const handleDeleteInstance = async (id: string) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    await api.deleteInstance(id);
    const updatedList = await api.getInstances();
    const cfg = await api.getConfig();
    if (updatedList) {
      setInstances(updatedList);
    }
    if (cfg) {
      setConfig((prev) => ({ ...prev, ...cfg, instances: updatedList || cfg.instances || [] }));
    }
  };

  const handleLaunchGame = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    setIsGameRunning(true);
    setLaunchStatus('Инициализация процесса...');
    setLaunchProgress(5);

    try {
      const res = await api.launchGame({
        username: config.username,
        versionId: activeInstance?.versionId || config.selectedVersion,
        javaPath: config.javaPath,
        minRam: config.minRam,
        maxRam: config.maxRam,
        jvmArgs: config.customJvmArgs,
        resolution: config.resolution,
        instanceId: activeInstance?.id,
      });

      if (!res.success) {
        sounds.playError();
        setIsGameRunning(false);
        setLaunchStatus('');
        alert(`Ошибка запуска игры:\n${res.error}`);
      }
    } catch (e: any) {
      sounds.playError();
      setIsGameRunning(false);
      setLaunchStatus('');
      alert(`Сбой запуска: ${e.message}`);
    }
  };

  const handleKillGame = async () => {
    const api = (window as any).electronAPI;
    if (api) {
      await api.killGame();
      setIsGameRunning(false);
      setLaunchStatus('');
      setLaunchProgress(0);
    }
  };

  const handleInstallFabric = async (versionId: string) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    setIsInstallingFabric(true);
    try {
      const newVersionId = await api.installFabricVersion(versionId);
      sounds.playLevelUp();
      alert(`Fabric успешно установлен для Minecraft ${versionId}!\nПрофиль: ${newVersionId}`);
      await loadAllVersions();
      handleSaveConfig({ selectedVersion: newVersionId });
    } catch (e: any) {
      sounds.playError();
      alert(`Ошибка установки Fabric: ${e.message}`);
    } finally {
      setIsInstallingFabric(false);
    }
  };

  const handleInstallProject = async (
    projectId: string,
    projectType: string,
    instanceId?: string,
    gameVersion?: string,
    loader?: string
  ) => {
    const api = (window as any).electronAPI;
    if (!api) throw new Error('API недоступно');

    const res = await api.installModrinthProject(
      projectId,
      undefined,
      projectType,
      instanceId || activeInstance?.id,
      gameVersion || activeInstance?.minecraftVersion,
      loader || activeInstance?.loader
    );

    await loadMods(instanceId || activeInstance?.id);
    await loadInstances();
    return res;
  };

  const handleToggleMod = async (filename: string, enable: boolean) => {
    const api = (window as any).electronAPI;
    if (!api) return;
    await api.toggleMod(filename, enable, activeInstance?.id);
    await loadMods(activeInstance?.id);
    await loadInstances();
  };

  const handleDeleteMod = async (filename: string) => {
    const api = (window as any).electronAPI;
    if (!api) return;
    await api.deleteMod(filename, activeInstance?.id);
    await loadMods(activeInstance?.id);
    await loadInstances();
  };

  const handleOpenFolder = (type: any, instanceId?: string) => {
    (window as any).electronAPI?.openFolder(type, instanceId || activeInstance?.id);
  };

  const handleApplyNewNick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNick.trim()) return;
    sounds.playLevelUp();
    handleSaveConfig({ username: newNick.trim() });
    setShowNickModal(false);
  };

  // Theme background styles
  const getThemeBackground = () => {
    switch (config.theme) {
      case 'nether':
        return 'from-[#1a0505] via-[#0f0404] to-[#0a0202]';
      case 'end':
        return 'from-[#14081f] via-[#0c0414] to-[#07020a]';
      case 'lush':
        return 'from-[#06180e] via-[#041009] to-[#020805]';
      case 'overworld':
        return 'from-[#081524] via-[#060e19] to-[#040810]';
      case 'cyber':
      default:
        return 'from-[#071318] via-[#050c12] to-[#03060a]';
    }
  };

  return (
    <div
      className={`w-screen h-screen flex flex-col bg-gradient-to-br ${getThemeBackground()} overflow-hidden text-slate-100 font-sans relative`}
    >
      {/* Dynamic Animated Particles */}
      <ParticleCanvas theme={config.theme} enabled={config.particles} />

      {/* Custom Title Bar */}
      <TitleBar
        isGameRunning={isGameRunning}
        launchStatus={launchStatus}
        selectedVersion={activeInstance?.minecraftVersion || config.selectedVersion}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          username={config.username}
          onEditUsername={() => {
            setNewNick(config.username);
            setShowNickModal(true);
          }}
          soundEnabled={config.soundEnabled}
          onToggleSound={() => handleSaveConfig({ soundEnabled: !config.soundEnabled })}
          isGameRunning={isGameRunning}
          logCount={logs.length}
          onOpenCreateInstance={() => {
            setInitialLoaderForCreate('fabric');
            setShowCreateInstanceModal(true);
          }}
          activeInstanceName={activeInstance?.name}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 relative overflow-hidden bg-slate-950/20 backdrop-blur-sm">
          {currentTab === 'play' && (
            <PlayView
              config={config}
              versions={versions}
              isGameRunning={isGameRunning}
              launchStatus={launchStatus}
              launchProgress={launchProgress}
              launchDetails={launchDetails}
              onLaunch={handleLaunchGame}
              onKill={handleKillGame}
              onSelectVersion={(vId) => handleSaveConfig({ selectedVersion: vId })}
              onOpenFolder={(type) => handleOpenFolder(type)}
              onOpenSettings={() => setCurrentTab('settings')}
              installedModsCount={installedMods.filter((m) => m.enabled).length}
              activeInstance={activeInstance}
              instances={instances}
              onSelectInstance={handleSelectInstance}
              onOpenCreateModal={() => {
                setInitialLoaderForCreate('fabric');
                setShowCreateInstanceModal(true);
              }}
            />
          )}

          {currentTab === 'instances' && (
            <InstancesView
              instances={instances}
              activeInstanceId={config.activeInstanceId}
              onSelectInstance={handleSelectInstance}
              onOpenCreateModal={() => {
                setInitialLoaderForCreate('fabric');
                setShowCreateInstanceModal(true);
              }}
              onDeleteInstance={handleDeleteInstance}
              onOpenInstanceFolder={(id) => handleOpenFolder('mods', id)}
            />
          )}

          {currentTab === 'loaders' && (
            <LoadersView
              onCreateWithLoader={(loader) => {
                setInitialLoaderForCreate(loader);
                setShowCreateInstanceModal(true);
              }}
            />
          )}

          {currentTab === 'versions' && (
            <VersionsView
              versions={versions}
              installedVersions={installedVersions}
              selectedVersion={config.selectedVersion}
              onSelectVersion={(vId) => handleSaveConfig({ selectedVersion: vId })}
              onInstallFabric={handleInstallFabric}
              onRefresh={loadAllVersions}
              isInstallingFabric={isInstallingFabric}
            />
          )}

          {currentTab === 'mods' && (
            <ModsView
              onInstallProject={handleInstallProject}
              activeInstance={activeInstance}
            />
          )}

          {currentTab === 'installed-mods' && (
            <InstalledModsView
              mods={installedMods}
              onToggleMod={handleToggleMod}
              onDeleteMod={handleDeleteMod}
              onOpenModsFolder={() => handleOpenFolder('mods')}
              onRefresh={() => loadMods(activeInstance?.id)}
            />
          )}

          {currentTab === 'skins' && (
            <SkinsView
              currentSkinUrl={config.skinUrl}
              skinType={config.skinType}
              onUpdateSkin={(url, type) => handleSaveConfig({ skinUrl: url, skinType: type })}
              username={config.username}
            />
          )}

          {currentTab === 'servers' && <ServersView />}

          {currentTab === 'gallery' && <GalleryView />}

          {currentTab === 'console' && (
            <ConsoleView
              logs={logs}
              onClearLogs={() => setLogs([])}
              onKillGame={handleKillGame}
              isGameRunning={isGameRunning}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              config={config}
              onSaveConfig={handleSaveConfig}
              onOpenFolder={(type) => handleOpenFolder(type)}
            />
          )}
        </main>
      </div>

      {/* Create Instance Modal */}
      <CreateInstanceModal
        isOpen={showCreateInstanceModal}
        onClose={() => setShowCreateInstanceModal(false)}
        onCreate={handleCreateInstance}
        availableVersions={versions.map((v) => v.id)}
        initialLoader={initialLoaderForCreate}
        initialVersion={activeInstance?.minecraftVersion || '1.20.4'}
      />

      {/* Change Nickname Modal */}
      {showNickModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
          <form
            onSubmit={handleApplyNewNick}
            className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                <span>Сменить никнейм</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowNickModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Введите имя для игры на офлайн / пиратских серверах и в одиночном режиме.
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                autoFocus
                placeholder="Никнейм игрока..."
                value={newNick}
                onChange={(e) => setNewNick(e.target.value)}
                maxLength={16}
                pattern="^[a-zA-Z0-9_]{3,16}$"
                title="От 3 до 16 символов (буквы, цифры и _)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-[10px] text-slate-500">
                Допустимы латинские буквы, цифры и символ подчеркивания (3-16 знаков).
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNickModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
