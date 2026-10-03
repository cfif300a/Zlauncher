import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import AdmZip from 'adm-zip';
import { FastDownloader, DownloadTask } from './downloader';
import { getRequiredJavaMajor, ensureJavaRuntime } from './javaManager';

export interface LaunchConfig {
  username: string;
  versionId: string;
  javaPath: string;
  minRam: number;
  maxRam: number;
  jvmArgs?: string;
  gameDir?: string;
  rootGameDir?: string;
  resolution?: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  skinUrl?: string;
  skinType?: 'classic' | 'slim';
}

export function getOfflineUUID(username: string): string {
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username, 'utf8').digest();
  // Set version to 3 (name-based)
  hash[6] = (hash[6] & 0x0f) | 0x30;
  // Set variant to IETF
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getDefaultGameDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || 'C:\\Users\\admin\\AppData\\Roaming', '.minecraft');
  } else if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Application Support', 'minecraft');
  } else {
    return path.join(process.env.HOME || '', '.minecraft');
  }
}

export class MinecraftLauncher {
  private downloader: FastDownloader;
  private runningProcess: ChildProcess | null = null;

  constructor() {
    this.downloader = new FastDownloader(12);
  }

  public isRunning(): boolean {
    return this.runningProcess !== null && !this.runningProcess.killed;
  }

  public killGame(): boolean {
    if (this.runningProcess && !this.runningProcess.killed) {
      this.runningProcess.kill();
      this.runningProcess = null;
      return true;
    }
    return false;
  }

  public async fetchVersionManifest(gameDir: string): Promise<any> {
    const cacheFile = path.join(gameDir, 'launcher_manifest_v2.json');
    try {
      const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
      if (res.ok) {
        const data = (await res.json()) as any;
        // Filter out snapshots - ONLY keep official release versions!
        if (data && Array.isArray(data.versions)) {
          data.versions = data.versions.filter((v: any) => v.type === 'release');
        }
        fs.mkdirSync(gameDir, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
        return data;
      }
    } catch (e) {
      console.warn('Network manifest fetch failed, attempting cache:', e);
    }

    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (data && Array.isArray(data.versions)) {
        data.versions = data.versions.filter((v: any) => v.type === 'release');
      }
      return data;
    }
    throw new Error('Не удалось получить список версий Minecraft (проверьте интернет-соединение).');
  }

  public getInstalledVersions(gameDir: string): any[] {
    const versionsDir = path.join(gameDir, 'versions');
    if (!fs.existsSync(versionsDir)) return [];

    const dirs = fs.readdirSync(versionsDir, { withFileTypes: true });
    const installed: any[] = [];

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const jsonPath = path.join(versionsDir, dir.name, `${dir.name}.json`);
        if (fs.existsSync(jsonPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            installed.push({
              id: data.id || dir.name,
              type: data.type || 'custom',
              releaseTime: data.releaseTime || '',
              inheritsFrom: data.inheritsFrom || null,
              isInstalled: true,
            });
          } catch (e) {
            // Ignore corrupted json
          }
        }
      }
    }
    return installed;
  }

  public async installFabricVersion(gameVersion: string, gameDir: string, specificLoaderVersion?: string): Promise<string> {
    let loaderVersion = specificLoaderVersion;
    if (!loaderVersion) {
      const loadersRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (!loadersRes.ok) throw new Error(`Fabric не доступен для версии Minecraft ${gameVersion}`);
      const loaders = (await loadersRes.json()) as any;
      if (!loaders || loaders.length === 0) throw new Error(`Загрузчики Fabric не найдены для ${gameVersion}`);
      loaderVersion = loaders[0].loader.version;
    }
    const profileRes = await fetch(
      `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}/${loaderVersion}/profile/json`,
      { headers: { 'User-Agent': 'ZLauncher/1.0.0' } }
    );
    if (!profileRes.ok) throw new Error(`Не удалось скачать профиль Fabric для ${gameVersion}`);
    const profileJson = (await profileRes.json()) as any;

    const versionId = profileJson.id;
    const versionDir = path.join(gameDir, 'versions', versionId);
    fs.mkdirSync(versionDir, { recursive: true });
    fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(profileJson, null, 2));

    // Download all Fabric loader libraries immediately
    if (Array.isArray(profileJson.libraries)) {
      const librariesDir = path.join(gameDir, 'libraries');
      const libraryTasks: DownloadTask[] = [];

      for (const lib of profileJson.libraries) {
        if (!this.isRuleAllowed(lib.rules)) continue;
        if (lib.name) {
          const parts = lib.name.split(':');
          const group = parts[0].replace(/\./g, '/');
          const name = parts[1];
          const ver = parts[2];
          const filename = `${name}-${ver}.jar`;
          const relativePath = path.join(group, name, ver, filename);
          const libPath = path.join(librariesDir, relativePath);

          if (!fs.existsSync(libPath)) {
            const repoUrl = lib.url ? (lib.url.endsWith('/') ? lib.url : lib.url + '/') : 'https://maven.fabricmc.net/';
            libraryTasks.push({
              url: `${repoUrl}${group}/${name}/${ver}/${filename}`,
              destination: libPath,
            });
          }
        }
      }

      if (libraryTasks.length > 0) {
        console.log(`[Fabric Install] Скачивание ${libraryTasks.length} файлов загрузчика Fabric...`);
        await this.downloader.downloadBatch(libraryTasks);
        console.log(`[Fabric Install] Все файлы Fabric успешно скачаны.`);
      }
    }

    return versionId;
  }

  public async installQuiltVersion(gameVersion: string, gameDir: string, specificLoaderVersion?: string): Promise<string> {
    let loaderVersion = specificLoaderVersion;
    if (!loaderVersion) {
      const loadersRes = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${gameVersion}`, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (!loadersRes.ok) throw new Error(`Quilt не доступен для версии Minecraft ${gameVersion}`);
      const loaders = (await loadersRes.json()) as any;
      if (!loaders || loaders.length === 0) throw new Error(`Загрузчики Quilt не найдены для ${gameVersion}`);
      loaderVersion = loaders[0].loader.version;
    }
    const profileRes = await fetch(
      `https://meta.quiltmc.org/v3/versions/loader/${gameVersion}/${loaderVersion}/profile/json`,
      { headers: { 'User-Agent': 'ZLauncher/1.0.0' } }
    );
    if (!profileRes.ok) throw new Error(`Не удалось скачать профиль Quilt для ${gameVersion}`);
    const profileJson = (await profileRes.json()) as any;

    const versionId = profileJson.id;
    const versionDir = path.join(gameDir, 'versions', versionId);
    fs.mkdirSync(versionDir, { recursive: true });
    fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(profileJson, null, 2));

    // Download all Quilt loader libraries immediately
    if (Array.isArray(profileJson.libraries)) {
      const librariesDir = path.join(gameDir, 'libraries');
      const libraryTasks: DownloadTask[] = [];

      for (const lib of profileJson.libraries) {
        if (!this.isRuleAllowed(lib.rules)) continue;
        if (lib.name) {
          const parts = lib.name.split(':');
          const group = parts[0].replace(/\./g, '/');
          const name = parts[1];
          const ver = parts[2];
          const filename = `${name}-${ver}.jar`;
          const relativePath = path.join(group, name, ver, filename);
          const libPath = path.join(librariesDir, relativePath);

          if (!fs.existsSync(libPath)) {
            const repoUrl = lib.url ? (lib.url.endsWith('/') ? lib.url : lib.url + '/') : 'https://maven.quiltmc.org/repository/release/';
            libraryTasks.push({
              url: `${repoUrl}${group}/${name}/${ver}/${filename}`,
              destination: libPath,
            });
          }
        }
      }

      if (libraryTasks.length > 0) {
        console.log(`[Quilt Install] Скачивание ${libraryTasks.length} файлов загрузчика Quilt...`);
        await this.downloader.downloadBatch(libraryTasks);
        console.log(`[Quilt Install] Все файлы Quilt успешно скачаны.`);
      }
    }

    return versionId;
  }

  public async installForgeVersion(gameVersion: string, gameDir: string): Promise<string> {
    try {
      const promosRes = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (!promosRes.ok) throw new Error('Не удалось получить список версий Forge');
      const promosData = (await promosRes.json()) as any;
      const forgeVer = promosData.promos?.[`${gameVersion}-recommended`] || promosData.promos?.[`${gameVersion}-latest`];
      if (!forgeVer) throw new Error(`Forge не найден для версии ${gameVersion}`);

      const versionId = `forge-${gameVersion}-${forgeVer}`;
      const versionDir = path.join(gameDir, 'versions', versionId);
      fs.mkdirSync(versionDir, { recursive: true });

      const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${gameVersion}-${forgeVer}/forge-${gameVersion}-${forgeVer}-installer.jar`;
      const installerPath = path.join(versionDir, `forge-${gameVersion}-${forgeVer}-installer.jar`);

      if (!fs.existsSync(installerPath)) {
        console.log(`[Forge Install] Скачивание установщика Forge: ${installerUrl}`);
        await this.downloader.downloadFile(installerUrl, installerPath);
      }

      let profileJson: any = null;
      try {
        const zip = new AdmZip(installerPath);
        const verEntry = zip.getEntry('version.json');
        if (verEntry) {
          profileJson = JSON.parse(zip.readAsText(verEntry));
        }
      } catch (e) {
        console.warn('[Forge Install] Не удалось прочитать version.json из jar:', e);
      }

      if (!profileJson) {
        profileJson = {
          id: versionId,
          time: new Date().toISOString(),
          releaseTime: new Date().toISOString(),
          type: 'release',
          mainClass: 'net.minecraft.client.main.Main',
          inheritsFrom: gameVersion,
          libraries: [
            {
              name: `net.minecraftforge:forge:${gameVersion}-${forgeVer}`,
              url: 'https://maven.minecraftforge.net/',
            },
          ],
        };
      }

      fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(profileJson, null, 2));
      if (profileJson.id && profileJson.id !== versionId) {
        fs.writeFileSync(path.join(versionDir, `${profileJson.id}.json`), JSON.stringify(profileJson, null, 2));
      }

      // Download all libraries immediately
      if (Array.isArray(profileJson.libraries)) {
        const librariesDir = path.join(gameDir, 'libraries');
        const libraryTasks: DownloadTask[] = [];

        for (const lib of profileJson.libraries) {
          if (!this.isRuleAllowed(lib.rules)) continue;

          if (lib.downloads?.artifact?.url && lib.downloads?.artifact?.path) {
            const dest = path.join(librariesDir, lib.downloads.artifact.path);
            if (!fs.existsSync(dest)) {
              libraryTasks.push({
                url: lib.downloads.artifact.url,
                destination: dest,
                sha1: lib.downloads.artifact.sha1,
              });
            }
          } else if (lib.name) {
            const parts = lib.name.split(':');
            const group = parts[0].replace(/\./g, '/');
            const name = parts[1];
            const ver = parts[2]?.replace(/@.+$/, '');
            const filename = `${name}-${ver}.jar`;
            const relativePath = path.join(group, name, ver, filename);
            const libPath = path.join(librariesDir, relativePath);

            if (!fs.existsSync(libPath)) {
              const repoUrl = lib.url ? (lib.url.endsWith('/') ? lib.url : lib.url + '/') : 'https://maven.minecraftforge.net/';
              libraryTasks.push({
                url: `${repoUrl}${group}/${name}/${ver}/${filename}`,
                destination: libPath,
              });
            }
          }
        }

        if (libraryTasks.length > 0) {
          console.log(`[Forge Install] Скачивание ${libraryTasks.length} библиотек Forge...`);
          await this.downloader.downloadBatch(libraryTasks);
          console.log(`[Forge Install] Все библиотеки Forge успешно скачаны.`);
        }
      }

      return versionId;
    } catch (e: any) {
      console.warn('[Forge Setup]', e);
      return gameVersion;
    }
  }

  public async installNeoForgeVersion(gameVersion: string, gameDir: string): Promise<string> {
    try {
      const parts = gameVersion.split('.');
      const major = parts[1];
      const minor = parts[2] || '0';

      let installerUrl = '';
      let versionId = '';
      let neoVer = '';

      if (gameVersion === '1.20.1') {
        const metaRes = await fetch('https://maven.neoforged.net/releases/net/neoforged/forge/maven-metadata.xml', {
          headers: { 'User-Agent': 'ZLauncher/1.0.0' },
        });
        if (!metaRes.ok) throw new Error('Не удалось получить метаданные NeoForge для 1.20.1');
        const text = await metaRes.text();
        const versions = [...text.matchAll(/<version>(.*?)<\/version>/g)].map((m) => m[1]);
        const matching = versions.filter((v) => v.startsWith('1.20.1-'));
        neoVer = matching.length > 0 ? matching[matching.length - 1] : '1.20.1-47.1.106';
        versionId = `neoforge-${neoVer}`;
        installerUrl = `https://maven.neoforged.net/releases/net/neoforged/forge/${neoVer}/forge-${neoVer}-installer.jar`;
      } else {
        const metaRes = await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml', {
          headers: { 'User-Agent': 'ZLauncher/1.0.0' },
        });
        if (!metaRes.ok) throw new Error('Не удалось получить метаданные NeoForge');
        const text = await metaRes.text();
        const versions = [...text.matchAll(/<version>(.*?)<\/version>/g)].map((m) => m[1]);
        const prefix = `${major}.${minor}.`;
        const matching = versions.filter((v) => v.startsWith(prefix));
        if (matching.length === 0) {
          const altMatching = versions.filter((v) => v.startsWith(`${major}.${minor}`));
          if (altMatching.length === 0) {
            throw new Error(`NeoForge не найден для версии Minecraft ${gameVersion}`);
          }
          neoVer = altMatching[altMatching.length - 1];
        } else {
          neoVer = matching[matching.length - 1];
        }

        versionId = `neoforge-${neoVer}`;
        installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVer}/neoforge-${neoVer}-installer.jar`;
      }

      const versionDir = path.join(gameDir, 'versions', versionId);
      fs.mkdirSync(versionDir, { recursive: true });

      const installerPath = path.join(versionDir, `neoforge-${neoVer}-installer.jar`);
      if (!fs.existsSync(installerPath)) {
        console.log(`[NeoForge Install] Скачивание установщика NeoForge: ${installerUrl}`);
        await this.downloader.downloadFile(installerUrl, installerPath);
      }

      // Extract version.json from installer if present
      let profileJson: any = null;
      try {
        const zip = new AdmZip(installerPath);
        const verEntry = zip.getEntry('version.json');
        if (verEntry) {
          profileJson = JSON.parse(zip.readAsText(verEntry));
        }
      } catch (e) {
        console.warn('[NeoForge Install] Не удалось прочитать version.json из jar:', e);
      }

      if (!profileJson) {
        profileJson = {
          id: versionId,
          time: new Date().toISOString(),
          releaseTime: new Date().toISOString(),
          type: 'release',
          mainClass: 'net.minecraft.client.main.Main',
          inheritsFrom: gameVersion,
          libraries: [
            {
              name: `net.neoforged:neoforge:${neoVer}`,
              url: 'https://maven.neoforged.net/releases/',
            },
          ],
        };
      }

      fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(profileJson, null, 2));
      if (profileJson.id && profileJson.id !== versionId) {
        fs.writeFileSync(path.join(versionDir, `${profileJson.id}.json`), JSON.stringify(profileJson, null, 2));
      }

      // Download all libraries immediately
      if (Array.isArray(profileJson.libraries)) {
        const librariesDir = path.join(gameDir, 'libraries');
        const libraryTasks: DownloadTask[] = [];

        for (const lib of profileJson.libraries) {
          if (!this.isRuleAllowed(lib.rules)) continue;

          if (lib.downloads?.artifact?.url && lib.downloads?.artifact?.path) {
            const dest = path.join(librariesDir, lib.downloads.artifact.path);
            if (!fs.existsSync(dest)) {
              libraryTasks.push({
                url: lib.downloads.artifact.url,
                destination: dest,
                sha1: lib.downloads.artifact.sha1,
              });
            }
          } else if (lib.name) {
            const parts = lib.name.split(':');
            const group = parts[0].replace(/\./g, '/');
            const name = parts[1];
            const ver = parts[2]?.replace(/@.+$/, '');
            const filename = `${name}-${ver}.jar`;
            const relativePath = path.join(group, name, ver, filename);
            const libPath = path.join(librariesDir, relativePath);

            if (!fs.existsSync(libPath)) {
              const repoUrl = lib.url ? (lib.url.endsWith('/') ? lib.url : lib.url + '/') : 'https://maven.neoforged.net/releases/';
              libraryTasks.push({
                url: `${repoUrl}${group}/${name}/${ver}/${filename}`,
                destination: libPath,
              });
            }
          }
        }

        if (libraryTasks.length > 0) {
          console.log(`[NeoForge Install] Скачивание ${libraryTasks.length} библиотек NeoForge...`);
          await this.downloader.downloadBatch(libraryTasks);
          console.log(`[NeoForge Install] Все библиотеки NeoForge успешно скачаны.`);
        }
      }

      return versionId;
    } catch (e: any) {
      console.warn('[NeoForge Setup]', e);
      return gameVersion;
    }
  }

  private isRuleAllowed(rules?: any[]): boolean {
    if (!rules || rules.length === 0) return true;

    let allowed = false;
    for (const rule of rules) {
      let matches = true;
      if (rule.os) {
        if (rule.os.name) {
          const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
          if (rule.os.name !== currentOs) {
            matches = false;
          }
        }
        if (rule.os.arch) {
          const currentArch = process.arch === 'x64' ? 'x64' : 'x86';
          if (rule.os.arch !== currentArch) {
            matches = false;
          }
        }
      }

      if (matches) {
        allowed = rule.action === 'allow';
      }
    }
    return allowed;
  }

  private extractArgumentValues(argEntry: any): string[] {
    if (typeof argEntry === 'string') {
      return [argEntry];
    }
    if (argEntry && typeof argEntry === 'object') {
      if (argEntry.rules && !this.isRuleAllowed(argEntry.rules)) {
        return [];
      }
      if (typeof argEntry.value === 'string') {
        return [argEntry.value];
      }
      if (Array.isArray(argEntry.value)) {
        return argEntry.value.filter((v: any) => typeof v === 'string');
      }
    }
    return [];
  }

  public async prepareAndLaunch(
    config: LaunchConfig,
    onProgress: (info: { status: string; progress: number; current?: number; total?: number; details?: string }) => void,
    onLog: (log: { type: 'stdout' | 'stderr' | 'system'; text: string; timestamp: string }) => void,
    onExit: (data: { code: number | null }) => void
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    const rootGameDir = config.rootGameDir || getDefaultGameDir();
    const gameDir = config.gameDir || rootGameDir;
    const versionId = config.versionId;

    // Versions, libraries, and assets are shared from rootGameDir!
    const versionsDir = path.join(rootGameDir, 'versions');
    const versionDir = path.join(versionsDir, versionId);
    const versionJsonPath = path.join(versionDir, `${versionId}.json`);
    const librariesDir = path.join(rootGameDir, 'libraries');
    const assetsDir = path.join(rootGameDir, 'assets');

    // Ensure instance directory exists
    fs.mkdirSync(gameDir, { recursive: true });

    try {
      onProgress({ status: 'Проверка метаданных версии...', progress: 5 });
      let versionData: any = null;

      if (!fs.existsSync(versionJsonPath)) {
        // Need to download version json from Mojang manifest
        const manifest = await this.fetchVersionManifest(rootGameDir);
        const versionEntry = manifest.versions.find((v: any) => v.id === versionId);
        if (!versionEntry) {
          throw new Error(`Версия ${versionId} не найдена в манифесте Mojang!`);
        }

        onProgress({ status: `Загрузка конфигурации версии ${versionId}...`, progress: 10 });
        const res = await fetch(versionEntry.url);
        if (!res.ok) throw new Error(`Не удалось скачать манифест версии: ${res.statusText}`);
        versionData = await res.json();
        fs.mkdirSync(versionDir, { recursive: true });
        fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
      } else {
        versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      }

      // If version inherits from another version (e.g. Fabric -> Vanilla)
      let inheritedData: any = null;
      if (versionData.inheritsFrom) {
        const parentId = versionData.inheritsFrom;
        const parentJsonPath = path.join(versionsDir, parentId, `${parentId}.json`);
        if (!fs.existsSync(parentJsonPath)) {
          const manifest = await this.fetchVersionManifest(rootGameDir);
          const parentEntry = manifest.versions.find((v: any) => v.id === parentId);
          if (parentEntry) {
            const res = await fetch(parentEntry.url);
            inheritedData = await res.json();
            fs.mkdirSync(path.join(versionsDir, parentId), { recursive: true });
            fs.writeFileSync(parentJsonPath, JSON.stringify(inheritedData, null, 2));
          }
        } else {
          inheritedData = JSON.parse(fs.readFileSync(parentJsonPath, 'utf8'));
        }
      }

      // Check & ensure compatible Java runtime
      const requiredJavaMajor = getRequiredJavaMajor(versionData, inheritedData, versionId);
      onProgress({
        status: `Проверка Java (требуется версия ${requiredJavaMajor})...`,
        progress: 12,
      });

      let resolvedJavaPath = config.javaPath;
      try {
        resolvedJavaPath = await ensureJavaRuntime(
          requiredJavaMajor,
          rootGameDir,
          config.javaPath,
          (status, pct) => {
            onProgress({ status, progress: pct });
            onLog({
              type: 'system',
              text: `[ZLauncher Java] ${status}\n`,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        );
      } catch (javaErr: any) {
        onLog({
          type: 'stderr',
          text: `[ZLauncher Java Warning] Не удалось подготовить Java ${requiredJavaMajor}: ${javaErr.message}\n`,
          timestamp: new Date().toLocaleTimeString(),
        });
        if (!resolvedJavaPath) resolvedJavaPath = 'java';
      }

      // 1. Download Client JAR
      onProgress({ status: 'Проверка игрового клиента (client.jar)...', progress: 15 });
      const vanillaVersionId = versionData.inheritsFrom || (inheritedData ? inheritedData.id : null) || versionId;
      const vanillaJarDir = path.join(versionsDir, vanillaVersionId);
      const vanillaJarPath = path.join(vanillaJarDir, `${vanillaVersionId}.jar`);

      const clientDownload = inheritedData?.downloads?.client || versionData?.downloads?.client;
      if (clientDownload && !fs.existsSync(vanillaJarPath)) {
        onProgress({ status: 'Загрузка игрового клиента (client.jar)...', progress: 20 });
        fs.mkdirSync(vanillaJarDir, { recursive: true });
        await this.downloader.downloadFile(clientDownload.url, vanillaJarPath, clientDownload.sha1);
      }

      const loaderJarPath = path.join(versionDir, `${versionId}.jar`);
      if (versionId !== vanillaVersionId && versionData.downloads?.client && !fs.existsSync(loaderJarPath)) {
        fs.mkdirSync(versionDir, { recursive: true });
        await this.downloader.downloadFile(versionData.downloads.client.url, loaderJarPath, versionData.downloads.client.sha1);
      }

      // 2. Resolve and download Libraries & Natives
      onProgress({ status: 'Загрузка и проверка библиотек...', progress: 30 });
      const nativesDir = path.join(versionDir, 'natives');
      fs.mkdirSync(nativesDir, { recursive: true });

      const allLibraries = [
        ...(versionData.libraries || []),
        ...(inheritedData?.libraries || [])
      ];

      const libraryTasks: DownloadTask[] = [];
      const classpath: string[] = [];

      for (const lib of allLibraries) {
        if (!this.isRuleAllowed(lib.rules)) {
          continue;
        }

        // Native extraction if applicable
        if (lib.natives && lib.natives.windows && lib.downloads?.classifiers) {
          const classifierKey = lib.natives.windows.replace('${arch}', process.arch === 'x64' ? '64' : '32');
          const nativeArtifact = lib.downloads.classifiers[classifierKey];
          if (nativeArtifact) {
            const nativeJarPath = path.join(librariesDir, nativeArtifact.path);
            if (!fs.existsSync(nativeJarPath)) {
              libraryTasks.push({
                url: nativeArtifact.url,
                destination: nativeJarPath,
                sha1: nativeArtifact.sha1,
              });
            }
          }
        }

        // Standard artifact
        if (lib.downloads?.artifact) {
          const artifact = lib.downloads.artifact;
          const libPath = path.join(librariesDir, artifact.path);
          classpath.push(libPath);
          if (!fs.existsSync(libPath)) {
            libraryTasks.push({
              url: artifact.url,
              destination: libPath,
              sha1: artifact.sha1,
            });
          }
        } else if (lib.url && lib.name) {
          // Maven style library (common in Fabric / Forge / Quilt)
          const parts = lib.name.split(':');
          const group = parts[0].replace(/\./g, '/');
          const name = parts[1];
          const ver = parts[2];
          const filename = `${name}-${ver}.jar`;
          const relativePath = path.join(group, name, ver, filename);
          const libPath = path.join(librariesDir, relativePath);
          classpath.push(libPath);
          if (!fs.existsSync(libPath)) {
            const repoUrl = lib.url.endsWith('/') ? lib.url : lib.url + '/';
            libraryTasks.push({
              url: `${repoUrl}${group}/${name}/${ver}/${filename}`,
              destination: libPath,
            });
          }
        }
      }

      if (libraryTasks.length > 0) {
        onProgress({ status: `Загрузка библиотек (${libraryTasks.length} файлов)...`, progress: 35 });
        await this.downloader.downloadBatch(libraryTasks, (p) => {
          const pct = 35 + Math.round((p.completed / p.total) * 25);
          onProgress({
            status: `Загрузка библиотек (${p.completed}/${p.total})...`,
            progress: pct,
            details: p.currentItem,
          });
        });
      }

      // Unpack natives
      for (const lib of allLibraries) {
        if (!this.isRuleAllowed(lib.rules)) continue;
        if (lib.natives && lib.natives.windows && lib.downloads?.classifiers) {
          const classifierKey = lib.natives.windows.replace('${arch}', process.arch === 'x64' ? '64' : '32');
          const nativeArtifact = lib.downloads.classifiers[classifierKey];
          if (nativeArtifact) {
            const nativeJarPath = path.join(librariesDir, nativeArtifact.path);
            if (fs.existsSync(nativeJarPath)) {
              try {
                const zip = new AdmZip(nativeJarPath);
                for (const entry of zip.getEntries()) {
                  if (!entry.entryName.startsWith('META-INF') && !entry.isDirectory) {
                    zip.extractEntryTo(entry, nativesDir, false, true);
                  }
                }
              } catch (e) {
                console.warn(`Could not extract native ${nativeJarPath}:`, e);
              }
            }
          }
        }
      }

      // 3. Download Assets
      onProgress({ status: 'Проверка ресурсов (звуки, текстуры)...', progress: 65 });
      const assetIndex = inheritedData?.assetIndex || versionData.assetIndex;
      const indexesDir = path.join(assetsDir, 'indexes');
      const objectsDir = path.join(assetsDir, 'objects');

      if (assetIndex) {
        fs.mkdirSync(indexesDir, { recursive: true });
        const indexPath = path.join(indexesDir, `${assetIndex.id}.json`);
        if (!fs.existsSync(indexPath)) {
          onProgress({ status: 'Загрузка индекса ресурсов...', progress: 70 });
          await this.downloader.downloadFile(assetIndex.url, indexPath, assetIndex.sha1);
        }

        if (fs.existsSync(indexPath)) {
          const indexJson = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
          const assetTasks: DownloadTask[] = [];

          for (const key of Object.keys(indexJson.objects)) {
            const obj = indexJson.objects[key];
            const hash = obj.hash;
            const prefix = hash.slice(0, 2);
            const objPath = path.join(objectsDir, prefix, hash);

            if (!fs.existsSync(objPath)) {
              assetTasks.push({
                url: `https://resources.download.minecraft.net/${prefix}/${hash}`,
                destination: objPath,
                sha1: hash,
              });
            }
          }

          if (assetTasks.length > 0) {
            onProgress({ status: `Загрузка ресурсов (${assetTasks.length} файлов)...`, progress: 75 });
            await this.downloader.downloadBatch(assetTasks, (p) => {
              const pct = 75 + Math.round((p.completed / p.total) * 15);
              onProgress({
                status: `Загрузка ресурсов (${p.completed}/${p.total})...`,
                progress: pct,
                details: p.currentItem,
              });
            });
          }
        }
      }

      // 4. Construct Command Arguments
      onProgress({ status: 'Формирование параметров запуска...', progress: 95 });

      // Always guarantee the vanilla client jar is in classpath (required by CustomSkinLoader, Fabric Knot, Forge)
      if (fs.existsSync(vanillaJarPath) && !classpath.includes(vanillaJarPath)) {
        classpath.push(vanillaJarPath);
      }
      if (versionId !== vanillaVersionId && fs.existsSync(loaderJarPath) && !classpath.includes(loaderJarPath)) {
        classpath.push(loaderJarPath);
      }

      // Mirror version files into instance directory if isolated instance so mods can locate version.json
      if (gameDir !== rootGameDir) {
        try {
          const instVanillaVerDir = path.join(gameDir, 'versions', vanillaVersionId);
          fs.mkdirSync(instVanillaVerDir, { recursive: true });
          const instVanillaJar = path.join(instVanillaVerDir, `${vanillaVersionId}.jar`);
          const instVanillaJson = path.join(instVanillaVerDir, `${vanillaVersionId}.json`);
          if (!fs.existsSync(instVanillaJar) && fs.existsSync(vanillaJarPath)) {
            fs.copyFileSync(vanillaJarPath, instVanillaJar);
          }
          const rootVanillaJson = path.join(vanillaJarDir, `${vanillaVersionId}.json`);
          if (!fs.existsSync(instVanillaJson) && fs.existsSync(rootVanillaJson)) {
            fs.copyFileSync(rootVanillaJson, instVanillaJson);
          }
        } catch (mirrorErr) {
          console.warn('[ZLauncher] Instance version mirror notice:', mirrorErr);
        }
      }

      const mainClass = versionData.mainClass || inheritedData?.mainClass || 'net.minecraft.client.main.Main';
      const offlineUUID = getOfflineUUID(config.username);

      const jvmArgs: string[] = [
        `-Xmx${config.maxRam}M`,
        `-Xms${config.minRam}M`,
        `-Djava.library.path=${nativesDir}`,
        `-Dminecraft.launcher.brand=ZLauncher`,
        `-Dminecraft.launcher.version=1.0.0`,
        `-Dfile.encoding=UTF-8`,
      ];

      // JVM Performance optimizations
      jvmArgs.push(
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+UseG1GC',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        '-XX:G1HeapRegionSize=32M'
      );

      // Append custom JVM args if provided
      if (config.jvmArgs && config.jvmArgs.trim()) {
        jvmArgs.push(...config.jvmArgs.trim().split(/\s+/));
      }

      // Add modern version JVM arguments if present
      let hasCpInJvmArgs = false;
      const rawJvmArgs = [
        ...(Array.isArray(inheritedData?.arguments?.jvm) ? inheritedData.arguments.jvm : []),
        ...(Array.isArray(versionData.arguments?.jvm) ? versionData.arguments.jvm : []),
      ];
      for (const item of rawJvmArgs) {
        const values = this.extractArgumentValues(item);
        for (const val of values) {
          if (val === '-cp' || val === '-classpath' || val.includes('${classpath}')) {
            hasCpInJvmArgs = true;
          }
          const replaced = val
            .replace('${natives_directory}', nativesDir)
            .replace('${launcher_name}', 'ZLauncher')
            .replace('${launcher_version}', '1.0.0')
            .replace('${classpath}', classpath.join(path.delimiter));
          if (!jvmArgs.includes(replaced)) {
            jvmArgs.push(replaced);
          }
        }
      }

      // Only append -cp if modern JVM arguments didn't already supply it
      if (!hasCpInJvmArgs && !jvmArgs.includes('-cp')) {
        jvmArgs.push('-cp', classpath.join(path.delimiter));
      }

      // Main class
      const launchCommandArgs = [...jvmArgs, mainClass];

      // Game arguments
      const gameArgs: string[] = [];
      const rawGameArgs = [
        ...(Array.isArray(inheritedData?.arguments?.game) ? inheritedData.arguments.game : []),
        ...(Array.isArray(versionData.arguments?.game) ? versionData.arguments.game : []),
      ];

      if (rawGameArgs.length > 0) {
        // Modern format
        for (const arg of rawGameArgs) {
          const values = this.extractArgumentValues(arg);
          gameArgs.push(...values);
        }
      } else if (versionData.minecraftArguments || inheritedData?.minecraftArguments) {
        // Legacy format
        const legacyArgs = (versionData.minecraftArguments || inheritedData.minecraftArguments).split(' ');
        gameArgs.push(...legacyArgs);
      } else {
        // Default standard Minecraft args
        gameArgs.push(
          '--username', '${auth_player_name}',
          '--version', '${version_name}',
          '--gameDir', '${game_directory}',
          '--assetsDir', '${assets_root}',
          '--assetIndex', '${assets_index_name}',
          '--uuid', '${auth_uuid}',
          '--accessToken', '${auth_access_token}',
          '--userType', '${user_type}',
          '--versionType', '${version_type}'
        );
      }

      // Replace placeholders in game arguments
      const assetIndexName = assetIndex ? assetIndex.id : (inheritedData?.assetIndex?.id || versionId);
      for (let i = 0; i < gameArgs.length; i++) {
        let arg = gameArgs[i];
        arg = arg
          .replace('${auth_player_name}', config.username)
          .replace('${version_name}', versionId)
          .replace('${game_directory}', gameDir)
          .replace('${assets_root}', assetsDir)
          .replace('${assets_index_name}', assetIndexName)
          .replace('${auth_uuid}', offlineUUID)
          .replace('${auth_access_token}', '0')
          .replace('${user_type}', 'mojang')
          .replace('${version_type}', 'release')
          .replace('${clientid}', '0')
          .replace('${auth_xuid}', '0');

        if (config.resolution) {
          arg = arg
            .replace('${resolution_width}', config.resolution.width.toString())
            .replace('${resolution_height}', config.resolution.height.toString());
        }

        gameArgs[i] = arg;
      }

      // Mandatory guarantees: Minecraft MUST have these parameters regardless of version format quirks
      const ensureArg = (flag: string, value: string) => {
        const idx = gameArgs.indexOf(flag);
        if (idx === -1) {
          gameArgs.push(flag, value);
        } else if (idx + 1 < gameArgs.length) {
          const next = gameArgs[idx + 1];
          if (!next || next.startsWith('${') || next === 'undefined') {
            gameArgs[idx + 1] = value;
          }
        } else {
          gameArgs.push(value);
        }
      };

      ensureArg('--username', config.username);
      ensureArg('--uuid', offlineUUID);
      ensureArg('--version', versionId);
      ensureArg('--gameDir', gameDir);
      ensureArg('--assetsDir', assetsDir);
      ensureArg('--assetIndex', assetIndexName);
      ensureArg('--accessToken', '0');
      ensureArg('--userType', 'mojang');
      ensureArg('--versionType', 'release');

      // Resolution flags
      if (config.resolution) {
        if (config.resolution.fullscreen) {
          if (!gameArgs.includes('--fullscreen')) {
            gameArgs.push('--fullscreen');
          }
        } else {
          ensureArg('--width', config.resolution.width.toString());
          ensureArg('--height', config.resolution.height.toString());
        }
      }

      // Clean up unresolved optional placeholders and disallowed demo mode
      const finalGameArgs: string[] = [];
      for (let i = 0; i < gameArgs.length; i++) {
        const arg = gameArgs[i];
        if (arg === '--demo') {
          continue;
        }
        if (arg.startsWith('${') && arg.endsWith('}')) {
          if (finalGameArgs.length > 0 && finalGameArgs[finalGameArgs.length - 1].startsWith('--')) {
            finalGameArgs.pop();
          }
          continue;
        }
        finalGameArgs.push(arg);
      }

      launchCommandArgs.push(...finalGameArgs);

      // 5. Spawn Java process in instance directory
      onProgress({ status: 'Запуск Minecraft...', progress: 100 });
      onLog({
        type: 'system',
        text: `[ZLauncher] Запуск игры:\nПапка игры (gameDir): ${gameDir}\nJava (v${requiredJavaMajor}): ${resolvedJavaPath}\nИгрок: ${config.username} (${offlineUUID})\nВерсия: ${versionId}\nОЗУ: ${config.maxRam}MB\n`,
        timestamp: new Date().toLocaleTimeString(),
      });

      const proc = spawn(resolvedJavaPath, launchCommandArgs, {
        cwd: gameDir,
        detached: false,
        env: {
          ...process.env,
          APPDATA: process.env.APPDATA,
        },
      });

      this.runningProcess = proc;

      proc.stdout.on('data', (data) => {
        const text = data.toString('utf8');
        onLog({
          type: 'stdout',
          text,
          timestamp: new Date().toLocaleTimeString(),
        });
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString('utf8');
        onLog({
          type: 'stderr',
          text,
          timestamp: new Date().toLocaleTimeString(),
        });
      });

      proc.on('close', (code) => {
        onLog({
          type: 'system',
          text: `[ZLauncher] Процесс Minecraft завершен с кодом: ${code}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        this.runningProcess = null;
        onExit({ code });
      });

      return {
        success: true,
        pid: proc.pid,
      };
    } catch (err: any) {
      console.error('Launch failed:', err);
      onLog({
        type: 'stderr',
        text: `[ZLauncher ERROR] Ошибка запуска: ${err.message || err}`,
        timestamp: new Date().toLocaleTimeString(),
      });
      return {
        success: false,
        error: err.message || String(err),
      };
    }
  }
}
