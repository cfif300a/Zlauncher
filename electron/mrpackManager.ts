import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { FastDownloader, DownloadTask } from './downloader';
import { MinecraftLauncher } from './launcher';

export interface MrpackInstallOptions {
  projectId?: string;
  versionId?: string;
  filePath?: string;
  rootGameDir: string;
  launcher: MinecraftLauncher;
  onProgress?: (info: { status: string; progress: number; current?: number; total?: number }) => void;
}

export interface MrpackIndex {
  formatVersion: number;
  game: string;
  versionId: string;
  name: string;
  summary?: string;
  files: Array<{
    path: string;
    hashes: {
      sha1?: string;
      sha512?: string;
    };
    env?: {
      client?: 'required' | 'optional' | 'unsupported';
      server?: 'required' | 'optional' | 'unsupported';
    };
    downloads: string[];
    fileSize: number;
  }>;
  dependencies: {
    minecraft?: string;
    'fabric-loader'?: string;
    'quilt-loader'?: string;
    'neoforge'?: string;
    'forge'?: string;
    [key: string]: string | undefined;
  };
}

export interface MrpackInstallResult {
  success: boolean;
  instanceId: string;
  name: string;
  minecraftVersion: string;
  loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
  versionId: string;
  modsCount: number;
  icon: string;
}

export async function installMrpack(options: MrpackInstallOptions): Promise<MrpackInstallResult> {
  const { projectId, versionId, filePath, rootGameDir, launcher, onProgress } = options;

  let mrpackBuffer: Buffer | null = null;
  let packTitle: string = 'Сборка Modrinth';
  let packIcon: string = 'sparkles';

  // 1. Fetch from Modrinth API or read from local disk
  if (filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл .mrpack не найден: ${filePath}`);
    }
    onProgress?.({ status: 'Чтение локального файла .mrpack...', progress: 5 });
    mrpackBuffer = fs.readFileSync(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    packTitle = baseName.replace(/[-_]/g, ' ');
  } else if (projectId) {
    onProgress?.({ status: 'Получение информации о сборке из Modrinth...', progress: 3 });

    // Fetch project details for name & icon
    try {
      const pRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' },
      });
      if (pRes.ok) {
        const pData = (await pRes.json()) as any;
        if (pData.title) packTitle = pData.title;
        if (pData.icon_url) packIcon = pData.icon_url;
      }
    } catch (e) {}

    // Fetch versions
    const vRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version`, {
      headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' },
    });
    if (!vRes.ok) {
      throw new Error(`Не удалось получить версии сборки: HTTP ${vRes.status}`);
    }
    const versions = (await vRes.json()) as any[];
    if (!versions || versions.length === 0) {
      throw new Error('У данной сборки нет доступных версий на Modrinth');
    }

    let targetVersion = versionId ? versions.find((v) => v.id === versionId) : null;
    if (!targetVersion) {
      targetVersion = versions.find((v) => v.version_type === 'release') || versions[0];
    }

    const mrpackFile =
      targetVersion.files?.find((f: any) => f.filename?.endsWith('.mrpack') || f.primary) ||
      targetVersion.files?.[0];

    if (!mrpackFile || !mrpackFile.url) {
      throw new Error('В выбранной версии отсутствует файл .mrpack для загрузки');
    }

    onProgress?.({ status: `Загрузка файла сборки "${packTitle}"...`, progress: 10 });
    const dlRes = await fetch(mrpackFile.url, {
      headers: { 'User-Agent': 'ZLauncher/1.0.0 (contact@zlauncher.local)' },
    });
    if (!dlRes.ok) {
      throw new Error(`Ошибка загрузки .mrpack: HTTP ${dlRes.status}`);
    }
    const ab = await dlRes.arrayBuffer();
    mrpackBuffer = Buffer.from(ab);
  } else {
    throw new Error('Не указан projectId или filePath для установки сборки');
  }

  if (!mrpackBuffer || mrpackBuffer.length === 0) {
    throw new Error('Пустой файл сборки .mrpack');
  }

  // 2. Open archive and read modrinth.index.json
  onProgress?.({ status: 'Анализ структуры архива .mrpack...', progress: 18 });
  const zip = new AdmZip(mrpackBuffer);

  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) {
    throw new Error('Некорректный .mrpack: отсутствует файл modrinth.index.json');
  }

  const index: MrpackIndex = JSON.parse(zip.readAsText(indexEntry));
  const finalName = index.name || packTitle;

  // Resolve loader and Minecraft version
  const mcVersion = index.dependencies?.minecraft || '1.20.1';
  let loader: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt' = 'vanilla';
  let loaderVersion: string | undefined = undefined;

  if (index.dependencies?.['fabric-loader']) {
    loader = 'fabric';
    loaderVersion = index.dependencies['fabric-loader'];
  } else if (index.dependencies?.['quilt-loader']) {
    loader = 'quilt';
    loaderVersion = index.dependencies['quilt-loader'];
  } else if (index.dependencies?.['neoforge']) {
    loader = 'neoforge';
    loaderVersion = index.dependencies['neoforge'];
  } else if (index.dependencies?.['forge']) {
    loader = 'forge';
    loaderVersion = index.dependencies['forge'];
  }

  // 3. Create isolated instance directory
  const instId = 'inst_mrpack_' + Date.now();
  const instancesDir = path.join(rootGameDir, 'instances');
  const instDir = path.join(instancesDir, instId);

  fs.mkdirSync(instDir, { recursive: true });
  fs.mkdirSync(path.join(instDir, 'mods'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'config'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'resourcepacks'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'shaderpacks'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'saves'), { recursive: true });
  fs.mkdirSync(path.join(instDir, 'screenshots'), { recursive: true });

  // 4. Install loader profile
  onProgress?.({
    status: `Настройка загрузчика ${loader.toUpperCase()} (${mcVersion})...`,
    progress: 25,
  });

  let installedVersionId = mcVersion;
  try {
    if (loader === 'fabric') {
      installedVersionId = await launcher.installFabricVersion(mcVersion, rootGameDir, loaderVersion);
    } else if (loader === 'quilt') {
      installedVersionId = await launcher.installQuiltVersion(mcVersion, rootGameDir, loaderVersion);
    } else if (loader === 'forge') {
      installedVersionId = await launcher.installForgeVersion(mcVersion, rootGameDir);
    } else if (loader === 'neoforge') {
      installedVersionId = await launcher.installNeoForgeVersion(mcVersion, rootGameDir);
    }
  } catch (loaderErr: any) {
    console.warn(`[Mrpack Loader Setup Warning] ${loaderErr.message}`);
  }

  // 5. Extract overrides and client-overrides into instance directory
  onProgress?.({ status: 'Распаковка конфигураций и ресурсов сборки...', progress: 32 });

  const entries = zip.getEntries();
  for (const entry of entries) {
    let relPath: string | null = null;

    if (entry.entryName.startsWith('overrides/')) {
      relPath = entry.entryName.slice('overrides/'.length);
    } else if (entry.entryName.startsWith('client-overrides/')) {
      relPath = entry.entryName.slice('client-overrides/'.length);
    }

    if (relPath && relPath.trim() !== '') {
      // Normalize separators
      const targetFilePath = path.join(instDir, ...relPath.split('/'));
      if (entry.isDirectory) {
        fs.mkdirSync(targetFilePath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
        fs.writeFileSync(targetFilePath, entry.getData());
      }
    }
  }

  // 6. Download files from modrinth.index.json
  const filesToDownload = (index.files || []).filter((f) => {
    // Only skip if explicitly client unsupported
    if (f.env && f.env.client === 'unsupported') return false;
    return f.downloads && f.downloads.length > 0;
  });

  if (filesToDownload.length > 0) {
    onProgress?.({
      status: `Подготовка к загрузке модов сборки (${filesToDownload.length} шт.)...`,
      progress: 38,
      total: filesToDownload.length,
      current: 0,
    });

    const downloadTasks: DownloadTask[] = filesToDownload.map((f) => {
      const destPath = path.join(instDir, ...f.path.split('/'));
      return {
        url: f.downloads[0],
        destination: destPath,
        sha1: f.hashes?.sha1,
        size: f.fileSize,
      };
    });

    const downloader = new FastDownloader(8);
    await downloader.downloadBatch(downloadTasks, ({ completed, total, currentItem }) => {
      const pct = Math.round((completed / total) * 100);
      onProgress?.({
        status: `Загрузка файлов сборки: ${completed}/${total} (${currentItem || ''})`,
        progress: 38 + Math.round(pct * 0.58), // 38% to 96%
        current: completed,
        total,
      });
    });
  }

  // 7. Calculate installed mods count
  let modsCount = 0;
  const modsFolder = path.join(instDir, 'mods');
  if (fs.existsSync(modsFolder)) {
    try {
      const list = fs.readdirSync(modsFolder);
      modsCount = list.filter((f) => f.endsWith('.jar') && !f.endsWith('.disabled')).length;
    } catch (e) {}
  }

  // 8. Create instance.json
  const instanceData = {
    id: instId,
    name: finalName,
    minecraftVersion: mcVersion,
    loader,
    loaderVersion,
    versionId: installedVersionId,
    icon: packIcon.startsWith('http') ? 'sparkles' : packIcon || 'sparkles',
    created: Date.now(),
    modsCount,
  };

  fs.writeFileSync(path.join(instDir, 'instance.json'), JSON.stringify(instanceData, null, 2));

  onProgress?.({
    status: `Сборка "${finalName}" успешно установлена! (${modsCount} модов)`,
    progress: 100,
  });

  return {
    success: true,
    instanceId: instId,
    name: finalName,
    minecraftVersion: mcVersion,
    loader,
    versionId: installedVersionId,
    modsCount,
    icon: instanceData.icon,
  };
}
