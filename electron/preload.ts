import { contextBridge, ipcRenderer } from 'electron';

export interface LaunchOptions {
  username: string;
  versionId: string;
  javaPath: string;
  minRam: number; // in MB
  maxRam: number; // in MB
  jvmArgs?: string;
  gameDir?: string;
  instanceId?: string;
  resolution?: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
}

export interface Instance {
  id: string;
  name: string;
  minecraftVersion: string;
  loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
  loaderVersion?: string;
  versionId: string;
  icon: string;
  created: number;
  lastPlayed?: number;
  modsCount?: number;
}

export interface ServerPingResult {
  online: boolean;
  ip: string;
  port: number;
  hostname?: string;
  version?: string;
  players?: {
    online: number;
    max: number;
  };
  motd?: {
    raw: string[];
    clean: string[];
    html: string[];
  };
  icon?: string;
  ping?: number;
}

export interface ModItem {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  project_type: string;
  categories: string[];
  versions: string[];
}

export interface InstalledMod {
  filename: string;
  enabled: boolean;
  size: number;
  modified: number;
}

const electronAPI = {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window-is-maximized'),

  // Instances Management
  getInstances: (): Promise<Instance[]> => ipcRenderer.invoke('get-instances'),
  createInstance: (opts: {
    name: string;
    minecraftVersion: string;
    loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
    icon: string;
  }): Promise<Instance> => ipcRenderer.invoke('create-instance', opts),
  deleteInstance: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-instance', id),
  setActiveInstance: (id: string): Promise<Instance | null> => ipcRenderer.invoke('set-active-instance', id),
  getLoaderVersions: (loader: string, gameVersion?: string): Promise<any[]> =>
    ipcRenderer.invoke('get-loader-versions', loader, gameVersion),

  // Minecraft Versions
  getManifestVersions: (): Promise<any> => ipcRenderer.invoke('get-manifest-versions'),
  getInstalledVersions: (): Promise<any[]> => ipcRenderer.invoke('get-installed-versions'),
  installFabricVersion: (minecraftVersion: string): Promise<any> => ipcRenderer.invoke('install-fabric-version', minecraftVersion),

  // Java & System
  getInstalledJava: (): Promise<{ path: string; version: string; isDefault: boolean; majorVersion?: number; isInternal?: boolean }[]> =>
    ipcRenderer.invoke('get-installed-java'),
  selectJavaFile: (): Promise<string | null> => ipcRenderer.invoke('select-java-file'),
  downloadJavaRuntime: (majorVersion: number): Promise<{ success: boolean; path: string }> =>
    ipcRenderer.invoke('download-java-runtime', majorVersion),
  getSystemInfo: (): Promise<{ totalMemory: number; freeMemory: number; platform: string }> =>
    ipcRenderer.invoke('get-system-info'),

  // Game Lifecycle
  launchGame: (options: LaunchOptions): Promise<{ success: boolean; pid?: number; error?: string }> =>
    ipcRenderer.invoke('launch-game', options),
  killGame: (): Promise<boolean> => ipcRenderer.invoke('kill-game'),
  isGameRunning: (): Promise<boolean> => ipcRenderer.invoke('is-game-running'),

  // Event Listeners
  onLaunchProgress: (callback: (data: { status: string; progress: number; current?: number; total?: number; details?: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('launch-progress', handler);
    return () => ipcRenderer.removeListener('launch-progress', handler);
  },
  onConsoleLog: (callback: (log: { type: 'stdout' | 'stderr' | 'system'; text: string; timestamp: string }) => void) => {
    const handler = (_event: any, log: any) => callback(log);
    ipcRenderer.on('console-log', handler);
    return () => ipcRenderer.removeListener('console-log', handler);
  },
  onGameExit: (callback: (data: { code: number | null }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('game-exit', handler);
    return () => ipcRenderer.removeListener('game-exit', handler);
  },

  // Files & Explorer
  openFolder: (type: 'minecraft' | 'mods' | 'resourcepacks' | 'shaderpacks' | 'screenshots' | 'saves' | 'instances', instanceId?: string) =>
    ipcRenderer.invoke('open-folder', type, instanceId),
  getScreenshots: (instanceId?: string): Promise<{ filename: string; path: string; date: number; url: string }[]> =>
    ipcRenderer.invoke('get-screenshots', instanceId),
  deleteScreenshot: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-screenshot', filePath),
  showItemInFolder: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('show-item-in-folder', filePath),
  copyImageToClipboard: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('copy-image-to-clipboard', filePath),

  // Modrinth integration
  searchModrinth: (query: string, options: { loader?: string; version?: string; projectType?: string; offset?: number; limit?: number }): Promise<{ hits: ModItem[]; total_hits: number }> =>
    ipcRenderer.invoke('search-modrinth', query, options),
  installModrinthProject: (projectId: string, versionId?: string, projectType?: string, instanceId?: string, gameVersion?: string, loader?: string): Promise<{ success: boolean; filename: string; dependencies?: string[]; instanceId?: string; modsCount?: number }> =>
    ipcRenderer.invoke('install-modrinth-project', projectId, versionId, projectType, instanceId, gameVersion, loader),
  installMrpack: (opts: { projectId?: string; versionId?: string; filePath?: string }): Promise<{ success: boolean; instanceId: string; name: string; minecraftVersion: string; loader: string; modsCount: number }> =>
    ipcRenderer.invoke('install-mrpack', opts),
  selectMrpackFile: (): Promise<string | null> => ipcRenderer.invoke('select-mrpack-file'),
  onMrpackProgress: (callback: (data: { status: string; progress: number; current?: number; total?: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('mrpack-progress', handler);
    return () => ipcRenderer.removeListener('mrpack-progress', handler);
  },

  // Mod manager
  getInstalledMods: (instanceId?: string): Promise<InstalledMod[]> => ipcRenderer.invoke('get-installed-mods', instanceId),
  toggleMod: (filename: string, enable: boolean, instanceId?: string): Promise<boolean> => ipcRenderer.invoke('toggle-mod', filename, enable, instanceId),
  deleteMod: (filename: string, instanceId?: string): Promise<boolean> => ipcRenderer.invoke('delete-mod', filename, instanceId),

  // Server pinger
  pingServer: (ip: string, port?: number): Promise<ServerPingResult> => ipcRenderer.invoke('ping-server', ip, port),

  // Settings & Config
  getConfig: (): Promise<any> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any): Promise<boolean> => ipcRenderer.invoke('save-config', config),

  // Skins
  fetchPlayerSkin: (username: string): Promise<{ skinUrl: string; isSlim: boolean; source: string }> =>
    ipcRenderer.invoke('fetch-player-skin', username),
  saveCustomSkin: (base64Data: string, name: string): Promise<string> =>
    ipcRenderer.invoke('save-custom-skin', base64Data, name),
  selectSkinFile: (): Promise<string | null> => ipcRenderer.invoke('select-skin-file'),

  // External Links
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
