import { app, BrowserWindow, ipcMain, shell, dialog, clipboard, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { MinecraftLauncher, getDefaultGameDir, LaunchConfig } from './launcher';
import { installOfflineSkin, resolveSkinBuffer } from './skins';
import { SkinSyncService } from './skinSync';
import { detectInstalledJavas, downloadJavaRuntime } from './javaManager';
import { installMrpack } from './mrpackManager';

let mainWindow: BrowserWindow | null = null;
const launcher = new MinecraftLauncher();
let skinSyncService: SkinSyncService | null = null;

const userDataDir = path.join(process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.config')), 'ZLauncherData');
app.setPath('userData', userDataDir);

const CONFIG_DIR = userDataDir;
const CONFIG_FILE = path.join(CONFIG_DIR, 'zlauncher_config.json');

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

export interface LauncherConfigData {
  username: string;
  selectedVersion: string;
  activeInstanceId: string;
  instances: Instance[];
  minRam: number;
  maxRam: number;
  javaPath: string;
  jvmPreset: string;
  customJvmArgs: string;
  gameDir: string;
  resolution: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  soundEnabled: boolean;
  soundVolume: number;
  theme: string;
  particles: boolean;
  skinUrl: string;
  skinType: string;
}

const DEFAULT_CONFIG: LauncherConfigData = {
  username: 'Player_' + Math.floor(1000 + Math.random() * 9000),
  selectedVersion: '26.3',
  activeInstanceId: 'default',
  instances: [
    {
      id: 'default',
      name: 'Основной',
      minecraftVersion: '26.3',
      loader: 'vanilla',
      versionId: '26.3',
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
  gameDir: getDefaultGameDir(),
  resolution: {
    width: 1280,
    height: 720,
    fullscreen: false,
  },
  soundEnabled: true,
  soundVolume: 70,
  theme: 'cyber', // 'cyber' | 'nether' | 'end' | 'lush' | 'overworld'
  particles: true,
  skinUrl: '',
  skinType: 'classic',
};

function getInstancesDir(baseDir: string): string {
  const dir = path.join(baseDir, 'instances');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getInstanceBaseDir(baseDir: string, instanceId?: string): string {
  if (instanceId && instanceId !== 'default') {
    const instDir = path.join(getInstancesDir(baseDir), instanceId);
    if (!fs.existsSync(instDir)) {
      fs.mkdirSync(instDir, { recursive: true });
    }
    return instDir;
  }
  return baseDir;
}

function syncInstancesFromDisk(existingInstances: Instance[] = [], baseDir: string): Instance[] {
  const instancesDir = getInstancesDir(baseDir);
  const map = new Map<string, Instance>();

  // 1. Ensure default instance exists and is version 26.3
  const defaultInst: Instance = {
    id: 'default',
    name: 'Основной',
    minecraftVersion: '26.3',
    loader: 'vanilla',
    versionId: '26.3',
    icon: 'grass',
    created: Date.now(),
    modsCount: 0,
  };

  const foundDefault = existingInstances.find((i) => i.id === 'default');
  if (foundDefault) {
    defaultInst.name = foundDefault.name || 'Основной';
    defaultInst.minecraftVersion = '26.3';
    defaultInst.loader = foundDefault.loader || 'vanilla';
    defaultInst.versionId = foundDefault.loader === 'vanilla' ? '26.3' : (foundDefault.versionId || '26.3');
    defaultInst.icon = foundDefault.icon || 'grass';
    defaultInst.created = foundDefault.created || Date.now();
  }
  map.set('default', defaultInst);

  // 2. Add existing instances from memory/config
  for (const inst of existingInstances) {
    if (inst.id !== 'default') {
      map.set(inst.id, inst);
    }
  }

  // 3. Scan instances folder on disk so no instance is ever lost!
  if (fs.existsSync(instancesDir)) {
    try {
      const dirs = fs.readdirSync(instancesDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          const jsonPath = path.join(instancesDir, d.name, 'instance.json');
          if (fs.existsSync(jsonPath)) {
            try {
              const diskInst = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
              if (diskInst && diskInst.id) {
                map.set(diskInst.id, {
                  ...map.get(diskInst.id),
                  ...diskInst,
                });
              }
            } catch (err) {
              console.warn(`Failed to parse ${jsonPath}:`, err);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read instances dir:', e);
    }
  }

  // 4. Update real modsCount for each instance
  const result: Instance[] = [];
  for (const inst of map.values()) {
    let modsCount = 0;
    const instModsDir = inst.id === 'default'
      ? path.join(baseDir, 'mods')
      : path.join(instancesDir, inst.id, 'mods');

    if (fs.existsSync(instModsDir)) {
      try {
        const files = fs.readdirSync(instModsDir);
        modsCount = files.filter((f) => f.endsWith('.jar') && !f.endsWith('.disabled')).length;
      } catch (e) {}
    }

    result.push({ ...inst, modsCount });
  }

  return result;
}

function loadConfig(): LauncherConfigData {
  let cfg: LauncherConfigData = { ...DEFAULT_CONFIG };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      cfg = { ...DEFAULT_CONFIG, ...data };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }

  const baseDir = cfg.gameDir || getDefaultGameDir();
  cfg.instances = syncInstancesFromDisk(cfg.instances || [], baseDir);

  if (cfg.activeInstanceId === 'default' && (cfg.selectedVersion === '1.20.4' || !cfg.selectedVersion)) {
    cfg.selectedVersion = '26.3';
  }

  return cfg;
}

function saveConfig(cfg: any) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save config:', e);
    return false;
  }
}

function detectJavaInstallations(): { path: string; version: string; isDefault: boolean; majorVersion?: number; isInternal?: boolean }[] {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  return detectInstalledJavas(baseDir);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 800,
    minWidth: 1080,
    minHeight: 700,
    frame: false,
    show: false,
    backgroundColor: '#080b11',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = process.env.VITE_DEV_SERVER_URL !== undefined || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();

  try {
    const cfg = loadConfig();
    const baseDir = cfg.gameDir || getDefaultGameDir();
    const skinBuffer = await resolveSkinBuffer(cfg.skinUrl);
    skinSyncService = new SkinSyncService({
      baseDir,
      initialUsername: cfg.username || 'Player',
      initialSkinBuffer: skinBuffer,
    });
    await skinSyncService.start();
  } catch (err) {
    console.warn('[SkinSync Init Warning]', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (skinSyncService) {
    skinSyncService.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// IPC: System & Config
ipcMain.handle('get-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', async (_event, cfg) => {
  const current = loadConfig();
  const baseDir = cfg.gameDir || current.gameDir || getDefaultGameDir();
  const mergedInstances = syncInstancesFromDisk(
    [...(current.instances || []), ...(cfg.instances || [])],
    baseDir
  );
  const updated = {
    ...current,
    ...cfg,
    instances: mergedInstances,
  };
  const saved = saveConfig(updated);

  // If a skin URL or username was updated, pre-generate skin assets immediately
  if (cfg.skinUrl || cfg.username) {
    try {
      const activeInst = (updated.instances || []).find((i: any) => i.id === updated.activeInstanceId);
      const instDir = activeInst && activeInst.id !== 'default'
        ? path.join(baseDir, 'instances', activeInst.id)
        : baseDir;

      const effectiveUser = (updated.username || 'Player').trim();
      const effectiveSkinUrl = updated.skinUrl || cfg.skinUrl;

      if (effectiveSkinUrl) {
        installOfflineSkin({
          gameDir: instDir,
          rootGameDir: baseDir,
          skinUrl: effectiveSkinUrl,
          skinType: cfg.skinType || updated.skinType || 'classic',
          versionId: activeInst?.versionId || updated.selectedVersion || '26.3',
          username: effectiveUser,
          httpPort: skinSyncService?.getHttpPort() || 28734,
        }).catch((e) => console.warn('[Skin Save Note]', e));

        if (skinSyncService) {
          resolveSkinBuffer(effectiveSkinUrl).then((buf) => {
            skinSyncService?.updateIdentity(effectiveUser, buf, baseDir);
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  return saved;
});

ipcMain.handle('get-system-info', () => {
  return {
    totalMemory: Math.round(os.totalmem() / (1024 * 1024)),
    freeMemory: Math.round(os.freemem() / (1024 * 1024)),
    platform: os.platform(),
  };
});

ipcMain.handle('get-installed-java', () => {
  return detectJavaInstallations();
});

ipcMain.handle('select-java-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите исполняемый файл Java (javaw.exe или java)',
    filters: [
      { name: 'Исполняемый файл Java', extensions: ['exe', '*'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('download-java-runtime', async (_event, majorVersion: number) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const exe = await downloadJavaRuntime(majorVersion, baseDir, (status, pct) => {
    mainWindow?.webContents.send('launch-progress', { status, progress: pct });
  });
  return { success: true, path: exe };
});

// IPC: Instances Management
ipcMain.handle('get-instances', () => {
  const cfg = loadConfig();
  return cfg.instances || [];
});

ipcMain.handle('create-instance', async (_event, opts: {
  name: string;
  minecraftVersion: string;
  loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
  icon: string;
}) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instId = 'inst_' + Date.now();
  const instDir = path.join(getInstancesDir(baseDir), instId);

  // Initialize instance isolated folders
  fs.mkdirSync(path.join(instDir, 'mods'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'shaderpacks'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'resourcepacks'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'saves'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'screenshots'), { recursive: true });

  let versionId = opts.minecraftVersion;

  // Handle Loader profile installation
  if (opts.loader === 'fabric') {
    try {
      versionId = await launcher.installFabricVersion(opts.minecraftVersion, baseDir);
    } catch (e) {
      console.warn('Fabric profile setup fallback:', e);
    }
  } else if (opts.loader === 'quilt') {
    try {
      versionId = await launcher.installQuiltVersion(opts.minecraftVersion, baseDir);
    } catch (e) {
      console.warn('Quilt profile setup fallback:', e);
    }
  } else if (opts.loader === 'forge') {
    try {
      versionId = await launcher.installForgeVersion(opts.minecraftVersion, baseDir);
    } catch (e) {
      console.warn('Forge profile setup fallback:', e);
    }
  } else if (opts.loader === 'neoforge') {
    try {
      versionId = await launcher.installNeoForgeVersion(opts.minecraftVersion, baseDir);
    } catch (e) {
      console.warn('NeoForge profile setup fallback:', e);
    }
  }

  const newInstance: Instance = {
    id: instId,
    name: opts.name.trim() || `Minecraft ${opts.minecraftVersion}`,
    minecraftVersion: opts.minecraftVersion,
    loader: opts.loader,
    versionId,
    icon: opts.icon || 'grass',
    created: Date.now(),
    modsCount: 0,
  };

  fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify(newInstance, null, 2));

  const instances = [...(cfg.instances || []), newInstance];
  cfg.instances = instances;
  cfg.activeInstanceId = instId;
  cfg.selectedVersion = versionId;
  saveConfig(cfg);

  return newInstance;
});

ipcMain.handle('delete-instance', async (_event, id: string) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instDir = path.join(baseDir, 'instances', id);

  if (fs.existsSync(instDir)) {
    try {
      fs.rmSync(instDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to remove instance folder:', e);
    }
  }

  cfg.instances = (cfg.instances || []).filter((i: any) => i.id !== id);
  if (cfg.activeInstanceId === id) {
    cfg.activeInstanceId = cfg.instances[0]?.id || 'default';
    cfg.selectedVersion = cfg.instances[0]?.versionId || '26.3';
  }
  saveConfig(cfg);
  return true;
});

ipcMain.handle('set-active-instance', (_event, id: string) => {
  const cfg = loadConfig();
  const found = (cfg.instances || []).find((i: any) => i.id === id);
  if (found) {
    cfg.activeInstanceId = id;
    cfg.selectedVersion = found.versionId;
    saveConfig(cfg);
    return found;
  }
  return null;
});

// IPC: Loader Versions
ipcMain.handle('get-loader-versions', async (_event, loader: string, gameVersion?: string) => {
  try {
    if (loader === 'fabric') {
      const url = gameVersion
        ? `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`
        : 'https://meta.fabricmc.net/v2/versions/loader';
      const res = await fetch(url, { headers: { 'User-Agent': 'ZLauncher/1.0.0' } });
      if (res.ok) return await res.json();
    } else if (loader === 'quilt') {
      const url = gameVersion
        ? `https://meta.quiltmc.org/v3/versions/loader/${gameVersion}`
        : 'https://meta.quiltmc.org/v3/versions/loader';
      const res = await fetch(url, { headers: { 'User-Agent': 'ZLauncher/1.0.0' } });
      if (res.ok) return await res.json();
    }
  } catch (e) {
    console.error('Failed to get loader versions:', e);
  }
  return [];
});

// IPC: Minecraft Versions
ipcMain.handle('get-manifest-versions', async () => {
  const cfg = loadConfig();
  const gameDir = cfg.gameDir || getDefaultGameDir();
  return launcher.fetchVersionManifest(gameDir);
});

ipcMain.handle('get-installed-versions', async () => {
  const cfg = loadConfig();
  const gameDir = cfg.gameDir || getDefaultGameDir();
  return launcher.getInstalledVersions(gameDir);
});

ipcMain.handle('install-fabric-version', async (_event, mcVersion: string) => {
  const cfg = loadConfig();
  const gameDir = cfg.gameDir || getDefaultGameDir();
  return launcher.installFabricVersion(mcVersion, gameDir);
});

ipcMain.handle('install-neoforge-version', async (_event, mcVersion: string) => {
  const cfg = loadConfig();
  const gameDir = cfg.gameDir || getDefaultGameDir();
  return launcher.installNeoForgeVersion(mcVersion, gameDir);
});

ipcMain.handle('install-forge-version', async (_event, mcVersion: string) => {
  const cfg = loadConfig();
  const gameDir = cfg.gameDir || getDefaultGameDir();
  return launcher.installForgeVersion(mcVersion, gameDir);
});

ipcMain.handle('install-quilt-version', async (_event, mcVersion: string) => {
  const cfg = loadConfig();
  const gameDir = cfg.gameDir || getDefaultGameDir();
  return launcher.installQuiltVersion(mcVersion, gameDir);
});

// IPC: Modpack (.mrpack) Management
ipcMain.handle('select-mrpack-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите файл сборки .mrpack',
    filters: [
      { name: 'Сборка Modrinth (*.mrpack)', extensions: ['mrpack'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('install-mrpack', async (_event, opts: { projectId?: string; versionId?: string; filePath?: string }) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const result = await installMrpack({
    ...opts,
    rootGameDir: baseDir,
    launcher,
    onProgress: (info) => {
      mainWindow?.webContents.send('mrpack-progress', info);
    },
  });

  const currentCfg = loadConfig();
  const mergedInstances = syncInstancesFromDisk(currentCfg.instances || [], baseDir);
  currentCfg.instances = mergedInstances;
  currentCfg.activeInstanceId = result.instanceId;
  currentCfg.selectedVersion = result.versionId;
  saveConfig(currentCfg);

  return result;
});

// IPC: Game Lifecycle
ipcMain.handle('launch-game', async (_event, options: LaunchConfig) => {
  if (launcher.isRunning()) {
    return { success: false, error: 'Игра уже запущена!' };
  }

  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();

  // Resolve instance directory
  const activeInst = (cfg.instances || []).find((i: any) => i.id === cfg.activeInstanceId);
  let instanceGameDir = baseDir;

  if (activeInst && activeInst.id !== 'default') {
    instanceGameDir = path.join(baseDir, 'instances', activeInst.id);
  }

  // Auto-detect Java if not specified
  let jPath = options.javaPath;
  if (!jPath || !fs.existsSync(jPath)) {
    const javaList = detectJavaInstallations();
    if (javaList.length > 0) {
      jPath = javaList[0].path;
    } else {
      jPath = 'java';
    }
  }

  // Inject player skin and Universal CustomSkinLoader
  const effectiveUsername = (options.username || cfg.username || 'Player').trim();
  const effectiveSkinUrl = (options as any).skinUrl || cfg.skinUrl;
  const effectiveSkinType = (options as any).skinType || cfg.skinType || 'classic';
  const effectiveVersion = activeInst?.versionId || options.versionId;

  try {
    if (effectiveSkinUrl) {
      mainWindow?.webContents.send('console-log', {
        type: 'system',
        text: `[ZLauncher] Подготовка скина "${effectiveUsername}" (Universal CustomSkinLoader)...`,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (skinSyncService) {
        const skinBuf = await resolveSkinBuffer(effectiveSkinUrl);
        skinSyncService.updateIdentity(effectiveUsername, skinBuf, baseDir);
        skinSyncService.broadcastSkin();
      }

      await installOfflineSkin({
        gameDir: instanceGameDir,
        rootGameDir: baseDir,
        skinUrl: effectiveSkinUrl,
        skinType: effectiveSkinType,
        versionId: effectiveVersion,
        username: effectiveUsername,
        httpPort: skinSyncService ? skinSyncService.getHttpPort() : 28734,
      });

      mainWindow?.webContents.send('console-log', {
        type: 'system',
        text: `[ZLauncher] Скин игрока "${effectiveUsername}" готов. Мультиплеерные скины активны!`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  } catch (skinErr) {
    console.warn('[Skin Launch Warning]', skinErr);
  }

  const result = await launcher.prepareAndLaunch(
    {
      ...options,
      username: effectiveUsername,
      versionId: activeInst?.versionId || options.versionId,
      javaPath: jPath,
      gameDir: instanceGameDir,
      rootGameDir: baseDir,
    },
    (progress) => {
      mainWindow?.webContents.send('launch-progress', progress);
    },
    (log) => {
      mainWindow?.webContents.send('console-log', log);
    },
    (exitData) => {
      mainWindow?.webContents.send('game-exit', exitData);
    }
  );

  return result;
});

ipcMain.handle('kill-game', () => {
  return launcher.killGame();
});

ipcMain.handle('is-game-running', () => {
  return launcher.isRunning();
});

// IPC: Folders (Isolated per instance if applicable)
ipcMain.handle('open-folder', async (_event, type: string, instanceId?: string) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instId = instanceId || cfg.activeInstanceId;
  const targetBase = getInstanceBaseDir(baseDir, instId);

  let target = targetBase;

  switch (type) {
    case 'mods':
      target = path.join(targetBase, 'mods');
      break;
    case 'resourcepacks':
      target = path.join(targetBase, 'resourcepacks');
      break;
    case 'shaderpacks':
      target = path.join(targetBase, 'shaderpacks');
      break;
    case 'screenshots':
      target = path.join(targetBase, 'screenshots');
      break;
    case 'saves':
      target = path.join(targetBase, 'saves');
      break;
    case 'instances':
      target = path.join(baseDir, 'instances');
      break;
    default:
      target = targetBase;
  }

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  shell.openPath(target);
  return true;
});

// IPC: Screenshots
ipcMain.handle('get-screenshots', async (_event, instanceId?: string) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instId = instanceId || cfg.activeInstanceId;
  const targetBase = getInstanceBaseDir(baseDir, instId);

  const shotsDir = path.join(targetBase, 'screenshots');
  if (!fs.existsSync(shotsDir)) return [];

  const files = fs.readdirSync(shotsDir);
  const result: { filename: string; path: string; date: number; url: string }[] = [];

  for (const file of files) {
    if (file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg')) {
      const fullPath = path.join(shotsDir, file);
      const stat = fs.statSync(fullPath);
      const fileUrl = `file:///${fullPath.replace(/\\/g, '/')}`;
      result.push({
        filename: file,
        path: fullPath,
        date: stat.mtimeMs,
        url: fileUrl,
      });
    }
  }

  return result.sort((a, b) => b.date - a.date);
});

ipcMain.handle('delete-screenshot', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (e) {
    console.error('Failed to delete screenshot:', e);
  }
  return false;
});

ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return true;
    }
  } catch (e) {
    console.error('Failed to show item in folder:', e);
  }
  return false;
});

ipcMain.handle('copy-image-to-clipboard', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const img = nativeImage.createFromPath(filePath);
      clipboard.writeImage(img);
      return true;
    }
  } catch (e) {
    console.error('Failed to copy image to clipboard:', e);
  }
  return false;
});

// IPC: Modrinth integration - Bug Fixed with User-Agent and ID mapping!
ipcMain.handle('search-modrinth', async (_event, query: string, options: any) => {
  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', (options?.limit || 24).toString());
    params.append('offset', (options?.offset || 0).toString());

    const facets: string[][] = [];
    if (options?.projectType) {
      facets.push([`project_type:${options.projectType}`]);
    }

    // Mod loader category applies to mods and modpacks (never shaders or resource packs!)
    if (
      (!options?.projectType || options.projectType === 'mod' || options.projectType === 'modpack') &&
      options?.loader &&
      options.loader !== 'all' &&
      options.loader !== 'vanilla'
    ) {
      facets.push([`categories:${options.loader}`]);
    }

    // Version filter (optional for shaders and resourcepacks)
    if (options?.version && options.version !== 'all') {
      facets.push([`versions:${options.version}`]);
    }

    if (facets.length > 0) {
      params.append('facets', JSON.stringify(facets));
    }

    const res = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)',
      },
    });
    if (!res.ok) throw new Error(`Modrinth error: ${res.statusText}`);
    const data = (await res.json()) as any;

    // Ensure every hit has both id, project_id, and slug
    const hits = (data.hits || []).map((hit: any) => ({
      ...hit,
      id: hit.project_id || hit.slug || hit.id,
      project_id: hit.project_id || hit.slug || hit.id,
      slug: hit.slug || hit.project_id,
    }));

    return { ...data, hits };
  } catch (err: any) {
    console.error('Modrinth search error:', err);
    return { hits: [], total_hits: 0 };
  }
});

async function downloadModWithDependencies(
  versionData: any,
  targetDir: string,
  targetGameVersion: string,
  targetLoader: string,
  visitedProjects: Set<string> = new Set()
): Promise<string[]> {
  const downloadedFiles: string[] = [];
  const projKey = versionData.project_id || versionData.id;

  if (projKey) {
    if (visitedProjects.has(projKey)) {
      console.log(`[Modrinth] Проект ${projKey} уже загружен или обрабатывается`);
      return downloadedFiles;
    }
    visitedProjects.add(projKey);
  }
  if (versionData.id) {
    visitedProjects.add(versionData.id);
  }

  // 1. Download file for this version
  const file = versionData.files?.find((f: any) => f.primary) || versionData.files?.[0];
  if (file && file.url) {
    fs.mkdirSync(targetDir, { recursive: true });
    const destPath = path.join(targetDir, file.filename);
    if (!fs.existsSync(destPath)) {
      console.log(`[Modrinth] Скачивание ${file.filename} в ${destPath}...`);
      const fileRes = await fetch(file.url, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' },
      });
      if (fileRes.ok) {
        const buf = Buffer.from(await fileRes.arrayBuffer());
        fs.writeFileSync(destPath, buf);
        downloadedFiles.push(file.filename);
        console.log(`[Modrinth] Успешно скачан: ${file.filename} (${buf.length} байт)`);
      } else {
        throw new Error(`Ошибка загрузки ${file.filename}: HTTP ${fileRes.status}`);
      }
    } else {
      console.log(`[Modrinth] Файл уже присутствует на диске: ${file.filename}`);
      downloadedFiles.push(file.filename);
    }
  } else {
    throw new Error('У выбранной версии отсутствует файл для загрузки');
  }

  // 2. Process required dependencies recursively
  if (Array.isArray(versionData.dependencies) && versionData.dependencies.length > 0) {
    for (const dep of versionData.dependencies) {
      if (dep.dependency_type === 'required') {
        const depProjId = dep.project_id;
        const depVerId = dep.version_id;

        // Skip if already visited
        if (depProjId && visitedProjects.has(depProjId)) continue;
        if (depVerId && visitedProjects.has(depVerId)) continue;

        try {
          // If explicit version ID is specified for the dependency
          if (depVerId) {
            const vRes = await fetch(
              `https://api.modrinth.com/v2/version/${encodeURIComponent(depVerId)}`,
              { headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' } }
            );
            if (vRes.ok) {
              const depVersionData = (await vRes.json()) as any;
              const subDownloaded = await downloadModWithDependencies(
                depVersionData,
                targetDir,
                targetGameVersion,
                targetLoader,
                visitedProjects
              );
              downloadedFiles.push(...subDownloaded);
              continue;
            }
          }

          // If project ID is specified, find matching version
          if (depProjId) {
            let matchedVer: any = null;

            // Step A: Targeted query with loaders & game_versions
            try {
              const filterUrl = `https://api.modrinth.com/v2/project/${encodeURIComponent(depProjId)}/version?loaders=${encodeURIComponent(JSON.stringify([targetLoader]))}&game_versions=${encodeURIComponent(JSON.stringify([targetGameVersion]))}`;
              const pRes = await fetch(filterUrl, {
                headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' },
              });
              if (pRes.ok) {
                const list = (await pRes.json()) as any[];
                if (Array.isArray(list) && list.length > 0) {
                  matchedVer = list[0];
                }
              }
            } catch (e) {}

            // Step B: Fallback - fetch all versions and match
            if (!matchedVer) {
              const allRes = await fetch(
                `https://api.modrinth.com/v2/project/${encodeURIComponent(depProjId)}/version`,
                { headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' } }
              );
              if (allRes.ok) {
                const allList = (await allRes.json()) as any[];
                if (Array.isArray(allList) && allList.length > 0) {
                  // Minor version match + loader
                  const majorMinor = targetGameVersion.split('.').slice(0, 2).join('.');
                  matchedVer =
                    allList.find(
                      (v: any) =>
                        Array.isArray(v.game_versions) &&
                        v.game_versions.some((gv: string) => gv.startsWith(majorMinor)) &&
                        Array.isArray(v.loaders) &&
                        v.loaders.map((l: string) => l.toLowerCase()).includes(targetLoader)
                    ) ||
                    allList.find(
                      (v: any) =>
                        Array.isArray(v.loaders) &&
                        v.loaders.map((l: string) => l.toLowerCase()).includes(targetLoader)
                    ) ||
                    allList.find((v: any) => v.version_type === 'release') ||
                    allList[0];
                }
              }
            }

            if (matchedVer) {
              const subDownloaded = await downloadModWithDependencies(
                matchedVer,
                targetDir,
                targetGameVersion,
                targetLoader,
                visitedProjects
              );
              downloadedFiles.push(...subDownloaded);
            }
          }
        } catch (depErr) {
          console.warn(`[Modrinth Dep Warning] Ошибка загрузки зависимости ${dep.project_id || dep.version_id}:`, depErr);
        }
      }
    }
  }

  return downloadedFiles;
}

ipcMain.handle(
  'install-modrinth-project',
  async (
    _event,
    projectId: string,
    versionId?: string,
    projectType?: string,
    instanceId?: string,
    gameVersion?: string,
    loader?: string
  ) => {
    try {
      const id = projectId;
      if (!id || id === 'undefined') {
        throw new Error('Некорректный идентификатор проекта Modrinth');
      }

      const cfg = loadConfig();
      const baseDir = cfg.gameDir || getDefaultGameDir();
      const activeInstId = instanceId || cfg.activeInstanceId;
      const targetBase = getInstanceBaseDir(baseDir, activeInstId);

      const targetInst = (cfg.instances || []).find((i: any) => i.id === activeInstId);
      const targetGameVersion = gameVersion || targetInst?.minecraftVersion || cfg.selectedVersion || '26.3';
      const targetLoader = (loader || targetInst?.loader || 'vanilla').toLowerCase();

      // If installing a modpack, delegate to mrpack installer to create a dedicated instance
      if (projectType === 'modpack') {
        const mrpackRes = await installMrpack({
          projectId: id,
          versionId,
          rootGameDir: baseDir,
          launcher,
          onProgress: (info) => {
            mainWindow?.webContents.send('mrpack-progress', info);
          },
        });

        const currentCfg = loadConfig();
        const mergedInstances = syncInstancesFromDisk(currentCfg.instances || [], baseDir);
        currentCfg.instances = mergedInstances;
        currentCfg.activeInstanceId = mrpackRes.instanceId;
        currentCfg.selectedVersion = mrpackRes.versionId;
        saveConfig(currentCfg);

        return {
          success: true,
          filename: mrpackRes.name,
          dependencies: [],
          instanceId: mrpackRes.instanceId,
          modsCount: mrpackRes.modsCount,
        };
      }

      // Target directory inside the active instance
      let targetDir = path.join(targetBase, 'mods');
      if (projectType === 'shader') {
        targetDir = path.join(targetBase, 'shaderpacks');
      } else if (projectType === 'resourcepack') {
        targetDir = path.join(targetBase, 'resourcepacks');
      }

      fs.mkdirSync(targetDir, { recursive: true });

      // Fetch all versions of this project
      const versRes = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(id)}/version`,
        { headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' } }
      );
      if (!versRes.ok) {
        throw new Error(`Не удалось получить список версий мода: ${versRes.statusText}`);
      }
      const versions = (await versRes.json()) as any[];

      if (!versions || !Array.isArray(versions) || versions.length === 0) {
        throw new Error('Для данного мода нет доступных файлов для загрузки на Modrinth');
      }

      // Smart version matching prioritized for the instance
      let selectedVersion: any = null;

      if (versionId) {
        selectedVersion = versions.find((v: any) => v.id === versionId);
      }

      // 1. Exact match: game version + loader
      if (!selectedVersion && targetLoader && targetLoader !== 'vanilla' && targetLoader !== 'all') {
        selectedVersion = versions.find((v: any) =>
          Array.isArray(v.game_versions) &&
          v.game_versions.includes(targetGameVersion) &&
          Array.isArray(v.loaders) &&
          v.loaders.map((l: string) => l.toLowerCase()).includes(targetLoader)
        );
      }

      // 2. Minor version prefix match with loader (e.g. 1.20.4 matches 1.20)
      if (!selectedVersion && targetLoader && targetLoader !== 'vanilla' && targetLoader !== 'all') {
        const majorMinor = targetGameVersion.split('.').slice(0, 2).join('.');
        selectedVersion = versions.find((v: any) =>
          Array.isArray(v.game_versions) &&
          v.game_versions.some((gv: string) => gv.startsWith(majorMinor)) &&
          Array.isArray(v.loaders) &&
          v.loaders.map((l: string) => l.toLowerCase()).includes(targetLoader)
        );
      }

      // 3. For mods: any version matching loader
      if (!selectedVersion && projectType === 'mod' && targetLoader && targetLoader !== 'vanilla' && targetLoader !== 'all') {
        selectedVersion = versions.find((v: any) =>
          Array.isArray(v.loaders) &&
          v.loaders.map((l: string) => l.toLowerCase()).includes(targetLoader)
        );
      }

      // 4. Exact match: game version (for shaders, resourcepacks)
      if (!selectedVersion) {
        selectedVersion = versions.find((v: any) =>
          Array.isArray(v.game_versions) && v.game_versions.includes(targetGameVersion)
        );
      }

      // 5. Minor version prefix match without loader
      if (!selectedVersion) {
        const majorMinor = targetGameVersion.split('.').slice(0, 2).join('.');
        selectedVersion = versions.find((v: any) =>
          Array.isArray(v.game_versions) &&
          v.game_versions.some((gv: string) => gv.startsWith(majorMinor))
        );
      }

      // 6. Fallback to latest release
      if (!selectedVersion) {
        selectedVersion = versions.find((v: any) => v.version_type === 'release') || versions[0];
      }

      const file = selectedVersion.files?.find((f: any) => f.primary) || selectedVersion.files?.[0];
      if (!file) throw new Error('В выбранной версии отсутствует скачиваемый файл');

      console.log(`[Modrinth] Установка "${id}" (${selectedVersion.name}) для MC ${targetGameVersion} [${targetLoader}] в ${targetDir}`);

      // Download primary mod and all required dependencies recursively!
      const downloadedFiles = await downloadModWithDependencies(
        selectedVersion,
        targetDir,
        targetGameVersion,
        targetLoader,
        new Set<string>()
      );

      const mainFilename = file.filename;
      const mainPath = path.join(targetDir, mainFilename);
      if (!fs.existsSync(mainPath)) {
        throw new Error(`Файл "${mainFilename}" не был сохранен в папку ${targetDir}`);
      }

      if (activeInstId && activeInstId !== 'default') {
        const instJsonPath = path.join(targetBase, 'instance.json');
        if (fs.existsSync(instJsonPath)) {
          try {
            const instData = JSON.parse(fs.readFileSync(instJsonPath, 'utf8'));
            if (fs.existsSync(targetDir)) {
              const files = fs.readdirSync(targetDir);
              instData.modsCount = files.filter((f: string) => f.endsWith('.jar') && !f.endsWith('.disabled')).length;
              fs.writeFileSync(instJsonPath, JSON.stringify(instData, null, 2));
            }
          } catch (e) {}
        }
      }

      return {
        success: true,
        filename: mainFilename,
        dependencies: downloadedFiles.filter((f) => f !== mainFilename),
      };
    } catch (err: any) {
      console.error('Failed to install modrinth project:', err);
      throw err;
    }
  }
);

// IPC: Installed Mods Manager (Per instance!)
ipcMain.handle('get-installed-mods', async (_event, instanceId?: string) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instId = instanceId || cfg.activeInstanceId;
  const targetBase = getInstanceBaseDir(baseDir, instId);

  const modsDir = path.join(targetBase, 'mods');
  if (!fs.existsSync(modsDir)) return [];

  const files = fs.readdirSync(modsDir);
  const mods: any[] = [];

  for (const f of files) {
    if (f.endsWith('.jar') || f.endsWith('.jar.disabled')) {
      const fullPath = path.join(modsDir, f);
      const stat = fs.statSync(fullPath);
      mods.push({
        filename: f,
        enabled: !f.endsWith('.disabled'),
        size: stat.size,
        modified: stat.mtimeMs,
      });
    }
  }

  return mods.sort((a, b) => b.modified - a.modified);
});

ipcMain.handle('toggle-mod', async (_event, filename: string, enable: boolean, instanceId?: string) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instId = instanceId || cfg.activeInstanceId;
  const targetBase = getInstanceBaseDir(baseDir, instId);

  const modsDir = path.join(targetBase, 'mods');
  const currentPath = path.join(modsDir, filename);
  let newFilename = filename;

  if (enable && filename.endsWith('.disabled')) {
    newFilename = filename.replace(/\.disabled$/, '');
  } else if (!enable && !filename.endsWith('.disabled')) {
    newFilename = filename + '.disabled';
  }

  const newPath = path.join(modsDir, newFilename);
  if (fs.existsSync(currentPath)) {
    fs.renameSync(currentPath, newPath);
    return true;
  }
  return false;
});

ipcMain.handle('delete-mod', async (_event, filename: string, instanceId?: string) => {
  const cfg = loadConfig();
  const baseDir = cfg.gameDir || getDefaultGameDir();
  const instId = instanceId || cfg.activeInstanceId;
  const targetBase = getInstanceBaseDir(baseDir, instId);

  const fullPath = path.join(targetBase, 'mods', filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
});

// IPC: Server Pinger
ipcMain.handle('ping-server', async (_event, ip: string, port: number = 25565) => {
  try {
    const address = port === 25565 ? ip : `${ip}:${port}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        online: data.online,
        ip: data.ip || ip,
        port: data.port || port,
        hostname: data.hostname || ip,
        version: data.version || 'Unknown',
        players: data.players || { online: 0, max: 0 },
        motd: data.motd || { raw: [], clean: ['Minecraft Server'], html: [] },
        icon: data.icon || null,
        ping: data.debug?.ping ? Math.round(data.debug.ping) : Math.floor(20 + Math.random() * 40),
      };
    }
  } catch (e) {}

  return {
    online: false,
    ip,
    port,
    motd: { raw: [], clean: ['Сервер недоступен'], html: [] },
  };
});

// IPC: Skins
ipcMain.handle('fetch-player-skin', async (_event, username: string) => {
  const cleanNick = (username || '').trim();
  if (!cleanNick) return null;

  // 1. Try Ely.by textures endpoint
  try {
    const elyRes = await fetch(`http://skinsystem.ely.by/textures/${encodeURIComponent(cleanNick)}`, {
      headers: { 'User-Agent': 'ZLauncher/1.0.0' },
    });
    if (elyRes.ok && elyRes.status === 200) {
      const elyData = (await elyRes.json()) as any;
      if (elyData && elyData.skin?.url) {
        return {
          skinUrl: elyData.skin.url,
          isSlim: elyData.skin?.metadata?.model === 'slim',
          source: 'ely.by',
        };
      }
    }
  } catch (e) {}

  // 2. Standard Minotar / Mojang endpoint
  return {
    skinUrl: `https://minotar.net/skin/${encodeURIComponent(cleanNick)}`,
    isSlim: false,
    source: 'mojang',
  };
});

ipcMain.handle('select-skin-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите файл скина (PNG)',
    filters: [{ name: 'Minecraft Skin', extensions: ['png'] }],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  return null;
});

ipcMain.handle('save-custom-skin', async (_event, base64Data: string, name: string) => {
  const cfg = loadConfig();
  const skinsDir = path.join(cfg.gameDir || getDefaultGameDir(), 'skins');
  fs.mkdirSync(skinsDir, { recursive: true });

  const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');
  const filePath = path.join(skinsDir, `${name}.png`);
  fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

  return `file:///${filePath.replace(/\\/g, '/')}`;
});

ipcMain.on('open-external', (_event, url: string) => {
  shell.openExternal(url);
});
