import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import AdmZip from 'adm-zip';

export interface JavaInstallation {
  path: string;
  version: string;
  majorVersion: number;
  isDefault: boolean;
  isInternal: boolean;
}

/**
 * Parses the Java major version from `java -version` command output
 */
export function parseJavaMajorVersion(output: string): number | null {
  if (!output) return null;

  // Check for 1.8.x style
  const legacyMatch = output.match(/version\s+["']?1\.(\d+)/i);
  if (legacyMatch) {
    return parseInt(legacyMatch[1], 10);
  }

  // Check for modern 9+ style: version "21.0.1" or "25-ea" or "25.0.4.1"
  const modernMatch = output.match(/(?:version|Runtime Environment|build)\s+["']?(\d+)(?:\.|\-|\+|\s)/i);
  if (modernMatch) {
    return parseInt(modernMatch[1], 10);
  }

  // Fallback pattern e.g. Java 25
  const fallbackMatch = output.match(/Java\s+(\d+)/i);
  if (fallbackMatch) {
    return parseInt(fallbackMatch[1], 10);
  }

  return null;
}

/**
 * Inspects a Java executable to get its major version and formatted display string
 */
export function getJavaInfo(execPath: string): { majorVersion: number; version: string; rawOutput: string } | null {
  try {
    if (!fs.existsSync(execPath)) return null;

    // On Windows, javaw.exe is GUI subsystem and does not pipe console stdout/stderr reliably.
    // Use companion java.exe in the same folder if available to query version.
    let testPath = execPath;
    if (process.platform === 'win32' && /javaw(\.exe)?$/i.test(execPath)) {
      const companion = execPath.replace(/javaw(\.exe)?$/i, 'java$1');
      if (fs.existsSync(companion)) {
        testPath = companion;
      }
    }

    const out = execSync(`"${testPath}" -version 2>&1`, { encoding: 'utf8', timeout: 5000 });
    const major = parseJavaMajorVersion(out);
    if (!major) return null;

    const match =
      out.match(/(?:version|Runtime Environment)\s+["']?([0-9._\-+a-zA-Z]+)/i) ||
      out.match(/build\s+([0-9._\-+a-zA-Z]+)/i);
    const verStr = match ? match[1] : `${major}`;

    return {
      majorVersion: major,
      version: `Java ${verStr}`,
      rawOutput: out.trim(),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Searches a folder recursively for Java executables (`javaw.exe`, `java.exe` or `java`)
 */
export function findJavaExecutableInDir(dir: string, maxDepth: number = 4): string | null {
  if (!fs.existsSync(dir)) return null;

  const isWin = process.platform === 'win32';
  const binDir = path.join(dir, 'bin');

  if (fs.existsSync(binDir)) {
    if (isWin) {
      const javaw = path.join(binDir, 'javaw.exe');
      if (fs.existsSync(javaw)) return javaw;
      const java = path.join(binDir, 'java.exe');
      if (fs.existsSync(java)) return java;
    } else {
      const java = path.join(binDir, 'java');
      if (fs.existsSync(java)) return java;
    }
  }

  // Also check if dir itself contains executables directly
  if (isWin) {
    const directJavaw = path.join(dir, 'javaw.exe');
    if (fs.existsSync(directJavaw)) return directJavaw;
    const directJava = path.join(dir, 'java.exe');
    if (fs.existsSync(directJava)) return directJava;
  } else {
    const directJava = path.join(dir, 'java');
    if (fs.existsSync(directJava)) return directJava;
  }

  if (maxDepth <= 0) return null;

  try {
    const subs = fs.readdirSync(dir, { withFileTypes: true });
    for (const sub of subs) {
      if (sub.isDirectory()) {
        const fullSub = path.join(dir, sub.name);
        const found = findJavaExecutableInDir(fullSub, maxDepth - 1);
        if (found) return found;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Collects all Java executables found in a directory tree up to maxDepth
 */
export function findAllJavaExecutablesInDir(dir: string, maxDepth: number = 4): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const isWin = process.platform === 'win32';
  const binDir = path.join(dir, 'bin');

  if (fs.existsSync(binDir)) {
    if (isWin) {
      const javaw = path.join(binDir, 'javaw.exe');
      if (fs.existsSync(javaw)) results.push(javaw);
      else {
        const java = path.join(binDir, 'java.exe');
        if (fs.existsSync(java)) results.push(java);
      }
    } else {
      const java = path.join(binDir, 'java');
      if (fs.existsSync(java)) results.push(java);
    }
  }

  if (maxDepth <= 0) return results;

  try {
    const subs = fs.readdirSync(dir, { withFileTypes: true });
    for (const sub of subs) {
      if (sub.isDirectory()) {
        const fullSub = path.join(dir, sub.name);
        results.push(...findAllJavaExecutablesInDir(fullSub, maxDepth - 1));
      }
    }
  } catch (e) {}

  return results;
}

/**
 * Checks if a path is the Oracle javapath symlink (which dynamically redirects to whatever JDK was installed last)
 */
export function isOracleJavapath(filePath: string): boolean {
  if (!filePath) return false;
  const lower = filePath.toLowerCase().replace(/\\/g, '/');
  return (
    lower.includes('/oracle/java/javapath') ||
    lower.includes('common files/oracle/java/javapath') ||
    lower.endsWith('/javapath') ||
    lower.includes('/javapath/')
  );
}

/**
 * Scans system and internal launcher runtimes for installed Java versions
 */
export function detectInstalledJavas(rootGameDir?: string): JavaInstallation[] {
  const javaList: JavaInstallation[] = [];
  const checkedPaths = new Set<string>();

  const checkAndAdd = (execPath: string, isDef: boolean = false, isInt: boolean = false) => {
    if (!execPath) return;
    if (isOracleJavapath(execPath)) {
      console.log(`[ZLauncher Java] Ignoring Oracle javapath symlink: ${execPath}`);
      return;
    }

    const normalized = path.normalize(execPath).toLowerCase();
    if (checkedPaths.has(normalized)) return;
    checkedPaths.add(normalized);

    const info = getJavaInfo(execPath);
    if (info) {
      console.log(
        `[ZLauncher Java] Detected ${info.version} (major: ${info.majorVersion}) at: ${execPath}`
      );
      javaList.push({
        path: execPath,
        version: info.version,
        majorVersion: info.majorVersion,
        isDefault: isDef,
        isInternal: isInt,
      });
    }
  };

  // 1. Check internal runtimes folder in rootGameDir
  if (rootGameDir) {
    const runtimesDir = path.join(rootGameDir, 'runtimes');
    if (fs.existsSync(runtimesDir)) {
      const found = findAllJavaExecutablesInDir(runtimesDir, 4);
      for (const exe of found) {
        checkAndAdd(exe, false, true);
      }
    }
  }

  // 2. Check system PATH 'java' / 'javaw' (filtering out javapath symlinks)
  try {
    const cmd = process.platform === 'win32' ? 'where javaw 2>nul || where java' : 'which java';
    const output = execSync(cmd, { encoding: 'utf8', timeout: 3000 }).trim();
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const candidate of lines) {
      if (!isOracleJavapath(candidate)) {
        checkAndAdd(candidate, true, false);
      }
    }
  } catch (e) {}

  // 3. Check JAVA_HOME
  if (process.env.JAVA_HOME && !isOracleJavapath(process.env.JAVA_HOME)) {
    const isWin = process.platform === 'win32';
    const homeJavaw = path.join(process.env.JAVA_HOME, 'bin', isWin ? 'javaw.exe' : 'java');
    const homeJava = path.join(process.env.JAVA_HOME, 'bin', isWin ? 'java.exe' : 'java');
    if (fs.existsSync(homeJavaw)) checkAndAdd(homeJavaw);
    else if (fs.existsSync(homeJava)) checkAndAdd(homeJava);
  }

  // 4. Windows standard directories
  if (process.platform === 'win32') {
    const searchDirs = [
      'C:\\Program Files\\Java',
      'C:\\Program Files (x86)\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Zulu',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Eclipse Adoptium'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Java'),
    ];

    for (const sDir of searchDirs) {
      if (sDir && fs.existsSync(sDir)) {
        const found = findAllJavaExecutablesInDir(sDir, 4);
        for (const exe of found) {
          checkAndAdd(exe);
        }
      }
    }

    // Check Mojang Minecraft launcher runtime folder (%APPDATA%\.minecraft\runtime)
    if (process.env.APPDATA) {
      const mojangRuntime = path.join(process.env.APPDATA, '.minecraft', 'runtime');
      if (fs.existsSync(mojangRuntime)) {
        const found = findAllJavaExecutablesInDir(mojangRuntime, 4);
        for (const exe of found) {
          checkAndAdd(exe);
        }
      }
    }
  }

  return javaList;
}

/**
 * Determines the required Java major version for a given Minecraft version
 */
export function getRequiredJavaMajor(versionData?: any, inheritedData?: any, versionId?: string): number {
  // Check version.json explicit javaVersion
  if (versionData?.javaVersion?.majorVersion) {
    return Number(versionData.javaVersion.majorVersion);
  }
  if (inheritedData?.javaVersion?.majorVersion) {
    return Number(inheritedData.javaVersion.majorVersion);
  }

  const vStr = versionId || versionData?.id || '';

  // Snapshot formats: 26.x, 25w..., 26w...
  if (/(?:^|[-_])2[5-9]\./i.test(vStr) || /^2[5-9]w/i.test(vStr)) {
    return 25;
  }

  // Parse semantic version numbers
  const m = vStr.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (m) {
    const major = parseInt(m[1], 10);
    const minor = parseInt(m[2], 10);
    const patch = parseInt(m[3] || '0', 10);

    if (major === 1) {
      if (minor > 20 || (minor === 20 && patch >= 5)) {
        return 21; // 1.20.5+ requires Java 21
      }
      if (minor >= 18) {
        return 17; // 1.18 - 1.20.4 requires Java 17
      }
      if (minor === 17) {
        return 17; // 1.17 requires Java 16 or 17
      }
      return 8; // 1.16.5 and older
    }
  }

  // Default fallback for modern versions
  if (vStr.includes('26') || vStr.includes('25')) return 25;
  return 21;
}

/**
 * Resolves the direct download URL for a portable Java JRE/JDK zip
 */
export async function resolveJavaDownloadUrl(major: number): Promise<{ url: string; source: string }> {
  // 1. Try Adoptium API v3 (JRE preferred, fallback to JDK / EA)
  try {
    const jreRes = await fetch(
      `https://api.adoptium.net/v3/assets/feature_releases/${major}/ga?architecture=x64&image_type=jre&os=windows`,
      { headers: { 'User-Agent': 'ZLauncher/1.0.0' } }
    );
    if (jreRes.ok) {
      const data = (await jreRes.json()) as any;
      const link = data[0]?.binaries?.[0]?.package?.link;
      if (link) return { url: link, source: `Adoptium OpenJDK ${major} (JRE)` };
    }
  } catch (e) {}

  try {
    const jdkRes = await fetch(
      `https://api.adoptium.net/v3/assets/feature_releases/${major}/ga?architecture=x64&image_type=jdk&os=windows`,
      { headers: { 'User-Agent': 'ZLauncher/1.0.0' } }
    );
    if (jdkRes.ok) {
      const data = (await jdkRes.json()) as any;
      const link = data[0]?.binaries?.[0]?.package?.link;
      if (link) return { url: link, source: `Adoptium OpenJDK ${major} (JDK)` };
    }
  } catch (e) {}

  try {
    const eaRes = await fetch(
      `https://api.adoptium.net/v3/assets/feature_releases/${major}/ea?architecture=x64&image_type=jdk&os=windows`,
      { headers: { 'User-Agent': 'ZLauncher/1.0.0' } }
    );
    if (eaRes.ok) {
      const data = (await eaRes.json()) as any;
      const link = data[0]?.binaries?.[0]?.package?.link;
      if (link) return { url: link, source: `Adoptium OpenJDK ${major} (Early Access)` };
    }
  } catch (e) {}

  // 2. Try Azul Zulu API
  try {
    const zuluRes = await fetch(
      `https://api.azul.com/metadata/v1/zulu/packages/?os=windows&arch=x64&archive_type=zip&java_package_type=jre&java_version=${major}`,
      { headers: { 'User-Agent': 'ZLauncher/1.0.0' } }
    );
    if (zuluRes.ok) {
      const data = (await zuluRes.json()) as any;
      if (data && data[0]?.download_url) {
        return { url: data[0].download_url, source: `Azul Zulu ${major} (JRE)` };
      }
    }
  } catch (e) {}

  // 3. Known stable direct CDN mirror links
  const stableMirrors: Record<number, string> = {
    25: 'https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jre_x64_windows_hotspot_25.0.4.1_1.zip',
    21: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jre_x64_windows_hotspot_21.0.12.1_1.zip',
    17: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jre_x64_windows_hotspot_17.0.20.1_1.zip',
    8: 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u504-b01/OpenJDK8U-jre_x64_windows_hotspot_8u504b01.zip',
  };

  if (stableMirrors[major]) {
    return { url: stableMirrors[major], source: `Adoptium Mirror ${major}` };
  }

  throw new Error(`Не удалось найти источник для автоматической загрузки Java ${major}`);
}

/**
 * Downloads and extracts portable Java runtime into `<rootGameDir>/runtimes/java-<major>`
 */
export async function downloadJavaRuntime(
  major: number,
  rootGameDir: string,
  onProgress?: (status: string, percent: number) => void
): Promise<string> {
  const runtimesDir = path.join(rootGameDir, 'runtimes');
  const targetDir = path.join(runtimesDir, `java-${major}`);

  // If already extracted and working, return it immediately
  const existingExe = findJavaExecutableInDir(targetDir);
  if (existingExe) {
    const info = getJavaInfo(existingExe);
    if (info && info.majorVersion === major) {
      return existingExe;
    }
  }

  fs.mkdirSync(runtimesDir, { recursive: true });

  onProgress?.(`Поиск ссылки для загрузки Java ${major}...`, 2);
  const { url, source } = await resolveJavaDownloadUrl(major);

  const tempZipPath = path.join(runtimesDir, `temp_java_${major}_${Date.now()}.zip`);

  onProgress?.(`Загрузка ${source}...`, 5);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ZLauncher/1.0.0' },
  });
  if (!res.ok) {
    throw new Error(`Ошибка скачивания Java ${major}: HTTP ${res.status} (${res.statusText})`);
  }

  const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
  let downloadedBytes = 0;

  // Stream download to file with progress
  const fileStream = fs.createWriteStream(tempZipPath);
  const reader = res.body?.getReader();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloadedBytes += value.length;
      fileStream.write(Buffer.from(value));

      if (contentLength > 0 && onProgress) {
        const pct = Math.min(99, Math.round((downloadedBytes / contentLength) * 100));
        const dlMb = (downloadedBytes / 1024 / 1024).toFixed(1);
        const totalMb = (contentLength / 1024 / 1024).toFixed(1);
        onProgress(`Загрузка Java ${major}: ${dlMb}/${totalMb} МБ (${pct}%)`, 5 + Math.round(pct * 0.45)); // 5% to 50%
      }
    }
    await new Promise<void>((resolve, reject) => {
      fileStream.end(() => resolve());
      fileStream.on('error', reject);
    });
  } else {
    const arrayBuf = await res.arrayBuffer();
    fs.writeFileSync(tempZipPath, Buffer.from(arrayBuf));
  }

  onProgress?.(`Распаковка Java ${major}...`, 55);

  // Clean target directory before extracting
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
    } catch (e) {}
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // Extract using Windows native tar if available, fallback to AdmZip
  let extracted = false;
  if (process.platform === 'win32') {
    try {
      const tarRes = spawnSync('tar.exe', ['-xf', tempZipPath, '-C', targetDir], {
        windowsHide: true,
        timeout: 60000,
      });
      if (tarRes.status === 0) {
        extracted = true;
      }
    } catch (e) {
      extracted = false;
    }
  }

  if (!extracted) {
    onProgress?.(`Распаковка архива Java ${major} (AdmZip)...`, 65);
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(targetDir, true);
  }

  // Remove temporary zip
  try {
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
  } catch (e) {}

  onProgress?.(`Проверка установленной Java ${major}...`, 95);

  const exePath = findJavaExecutableInDir(targetDir);
  if (!exePath) {
    throw new Error(`Не удалось найти исполняемый файл Java в распакованной папке: ${targetDir}`);
  }

  const info = getJavaInfo(exePath);
  if (!info) {
    throw new Error(`Установленный файл Java (${exePath}) не запускается`);
  }

  onProgress?.(`Java ${major} успешно установлена (${info.version})!`, 100);
  return exePath;
}

/**
 * Ensures a compatible Java runtime is available.
 * 1. Verifies preferredJavaPath if provided.
 * 2. Checks internal launcher runtimes (`<rootGameDir>/runtimes/java-<major>`).
 * 3. Scans system installed Javas.
 * 4. Automatically downloads portable runtime if not found!
 */
export async function ensureJavaRuntime(
  requiredMajor: number,
  rootGameDir: string,
  preferredJavaPath?: string,
  onProgress?: (status: string, percent: number) => void
): Promise<string> {
  console.log(`[ZLauncher Java] Ensuring Java runtime for required major version: ${requiredMajor}`);

  // Step 1: Check user-specified preferred path (ignore if Oracle javapath symlink)
  if (preferredJavaPath && preferredJavaPath.trim() !== '') {
    const trimmed = preferredJavaPath.trim();
    if (!isOracleJavapath(trimmed) && fs.existsSync(trimmed)) {
      const info = getJavaInfo(trimmed);
      if (info) {
        if (info.majorVersion === requiredMajor) {
          console.log(`[ZLauncher Java] Using user-preferred Java (${info.version}): ${trimmed}`);
          return trimmed;
        } else if (requiredMajor > 8 && requiredMajor !== 25 && info.majorVersion >= requiredMajor) {
          console.log(`[ZLauncher Java] Using compatible user-preferred Java (${info.version}): ${trimmed}`);
          return trimmed;
        } else {
          onProgress?.(
            `Выбранная Java (${info.version}) не подходит (требуется Java ${requiredMajor}). Поиск совместимой версии...`,
            5
          );
        }
      }
    }
  }

  // Step 2: Check internal runtimes folder
  const internalDir = path.join(rootGameDir, 'runtimes', `java-${requiredMajor}`);
  const internalExe = findJavaExecutableInDir(internalDir);
  if (internalExe) {
    const info = getJavaInfo(internalExe);
    if (info && info.majorVersion === requiredMajor) {
      console.log(`[ZLauncher Java] Using internal Java ${requiredMajor}: ${internalExe}`);
      return internalExe;
    }
  }

  // Step 3: Check system installed Javas
  const allJavas = detectInstalledJavas(rootGameDir);

  // Exact match (prioritizing true Java 25 installations e.g. java-runtime-epsilon)
  const exactMatch = allJavas.find((j) => j.majorVersion === requiredMajor);
  if (exactMatch) {
    console.log(
      `[ZLauncher Java] Selected exact matching Java ${requiredMajor}: ${exactMatch.path} (${exactMatch.version})`
    );
    return exactMatch.path;
  }

  // For Java 25: Minecraft 26.x requires Java 25. NEVER use Java 26 as fallback!
  if (requiredMajor === 25) {
    console.log('[ZLauncher Java] Exact Java 25 not detected in system. Will auto-download portable Java 25.');
  } else if (requiredMajor > 8) {
    // Compatible match for other versions (e.g. Java 21 can run Java 17 games)
    const compatible = allJavas
      .filter((j) => j.majorVersion >= requiredMajor && j.majorVersion !== 26)
      .sort((a, b) => a.majorVersion - b.majorVersion)[0];
    if (compatible) {
      console.log(`[ZLauncher Java] Selected compatible Java ${compatible.majorVersion}: ${compatible.path}`);
      return compatible.path;
    }
  }

  // Step 4: No compatible Java found anywhere -> Auto-download portable Java!
  onProgress?.(`Java ${requiredMajor} не найдена. Начинается автоматическая установка...`, 5);
  const downloadedExe = await downloadJavaRuntime(requiredMajor, rootGameDir, onProgress);
  return downloadedExe;
}
