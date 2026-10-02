import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import AdmZip from 'adm-zip';
import { FastDownloader, DownloadTask } from './downloader';

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

  public async installFabricVersion(gameVersion: string, gameDir: string): Promise<string> {
    const loadersRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`, {
      headers: { 'User-Agent': 'ZLauncher/1.0.0' },
    });
    if (!loadersRes.ok) throw new Error(`Fabric не доступен для версии Minecraft ${gameVersion}`);
    const loaders = (await loadersRes.json()) as any;
    if (!loaders || loaders.length === 0) throw new Error(`Загрузчики Fabric не найдены для ${gameVersion}`);

    const loaderVersion = loaders[0].loader.version;
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

    return versionId;
  }

  public async installQuiltVersion(gameVersion: string, gameDir: string): Promise<string> {
    const loadersRes = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${gameVersion}`, {
      headers: { 'User-Agent': 'ZLauncher/1.0.0' },
    });
    if (!loadersRes.ok) throw new Error(`Quilt не доступен для версии Minecraft ${gameVersion}`);
    const loaders = (await loadersRes.json()) as any;
    if (!loaders || loaders.length === 0) throw new Error(`Загрузчики Quilt не найдены для ${gameVersion}`);

    const loaderVersion = loaders[0].loader.version;
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

    return versionId;
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

      // 1. Download Client JAR
      onProgress({ status: 'Проверка игрового клиента (client.jar)...', progress: 15 });
      const clientJarName = `${inheritedData ? versionData.inheritsFrom : versionId}.jar`;
      const clientJarPath = path.join(inheritedData ? path.join(versionsDir, versionData.inheritsFrom) : versionDir, clientJarName);

      const clientDownload = inheritedData?.downloads?.client || versionData?.downloads?.client;
      if (clientDownload && !fs.existsSync(clientJarPath)) {
        onProgress({ status: 'Загрузка игрового клиента (client.jar)...', progress: 20 });
        await this.downloader.downloadFile(clientDownload.url, clientJarPath, clientDownload.sha1);
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
      classpath.push(clientJarPath);

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
      const versionJvmArgs = versionData.arguments?.jvm || inheritedData?.arguments?.jvm;
      if (Array.isArray(versionJvmArgs)) {
        for (const item of versionJvmArgs) {
          if (typeof item === 'string') {
            const replaced = item
              .replace('${natives_directory}', nativesDir)
              .replace('${launcher_name}', 'ZLauncher')
              .replace('${launcher_version}', '1.0.0')
              .replace('${classpath}', classpath.join(';'));
            if (!jvmArgs.includes(replaced)) {
              jvmArgs.push(replaced);
            }
          }
        }
      }

      // Classpath
      jvmArgs.push('-cp', classpath.join(';'));

      // Main class
      const launchCommandArgs = [...jvmArgs, mainClass];

      // Game arguments
      const gameArgs: string[] = [];
      const versionGameArgs = versionData.arguments?.game || inheritedData?.arguments?.game;

      if (Array.isArray(versionGameArgs)) {
        // Modern format
        for (const arg of versionGameArgs) {
          if (typeof arg === 'string') {
            gameArgs.push(arg);
          }
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
      const assetIndexName = assetIndex ? assetIndex.id : versionId;
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
          .replace('${version_type}', 'release');

        if (config.resolution) {
          arg = arg
            .replace('${resolution_width}', config.resolution.width.toString())
            .replace('${resolution_height}', config.resolution.height.toString());
        }

        gameArgs[i] = arg;
      }

      // Resolution flags
      if (config.resolution) {
        if (config.resolution.fullscreen) {
          gameArgs.push('--fullscreen');
        } else {
          gameArgs.push('--width', config.resolution.width.toString());
          gameArgs.push('--height', config.resolution.height.toString());
        }
      }

      launchCommandArgs.push(...gameArgs);

      // 5. Spawn Java process in instance directory
      onProgress({ status: 'Запуск Minecraft...', progress: 100 });
      onLog({
        type: 'system',
        text: `[ZLauncher] Запуск игры:\nПапка игры (gameDir): ${gameDir}\nJava: ${config.javaPath}\nИгрок: ${config.username} (${offlineUUID})\nВерсия: ${versionId}\nОЗУ: ${config.maxRam}MB\n`,
        timestamp: new Date().toLocaleTimeString(),
      });

      const proc = spawn(config.javaPath, launchCommandArgs, {
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
