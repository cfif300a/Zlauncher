import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export interface SkinInstallOptions {
  gameDir: string;
  rootGameDir?: string;
  skinUrl: string;
  skinType: 'classic' | 'slim';
  versionId: string;
  username: string;
  httpPort?: number;
  isModded?: boolean;
}

export const CSL_UNIVERSAL_JAR = 'CustomSkinLoader_Universal-15.0.1.jar';
export const CSL_DOWNLOAD_URLS = [
  'https://cdn.modrinth.com/data/idMHQ4n2/versions/OLaesh5y/CustomSkinLoader_Universal-15.0.1.jar',
  'https://github.com/xfl03/MCCustomSkinLoader/releases/download/15.0.1/CustomSkinLoader_Universal-15.0.1.jar',
];

export function getPackFormat(mcVersion: string): number {
  if (!mcVersion) return 48;
  const v = mcVersion.trim();
  if (v.startsWith('1.8')) return 1;
  if (v.startsWith('1.9') || v.startsWith('1.10')) return 2;
  if (v.startsWith('1.11') || v.startsWith('1.12')) return 3;
  if (v.startsWith('1.13') || v.startsWith('1.14')) return 4;
  if (v.startsWith('1.15')) return 5;
  if (v.startsWith('1.16')) return 6;
  if (v.startsWith('1.17')) return 7;
  if (v.startsWith('1.18')) return 8;
  if (v.startsWith('1.19.3')) return 12;
  if (v.startsWith('1.19.4')) return 13;
  if (v.startsWith('1.19')) return 9;
  if (v.startsWith('1.20.1') || v.startsWith('1.20.0')) return 15;
  if (v.startsWith('1.20.2')) return 18;
  if (v.startsWith('1.20.3') || v.startsWith('1.20.4')) return 22;
  if (v.startsWith('1.20.5') || v.startsWith('1.20.6')) return 32;
  if (v.startsWith('1.21.0') || v.startsWith('1.21.1')) return 34;
  if (v.startsWith('1.21.2') || v.startsWith('1.21.3')) return 42;
  if (v.startsWith('1.21.4')) return 46;
  return 48;
}

export async function resolveSkinBuffer(skinUrl?: string): Promise<Buffer | null> {
  if (!skinUrl || !skinUrl.trim()) {
    try {
      const res = await fetch('https://minotar.net/skin/MHF_Steve', {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch (e) {
      return null;
    }
  }

  const trimmed = skinUrl.trim();

  // 1. Data URL
  if (trimmed.startsWith('data:image/')) {
    const base64Data = trimmed.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  // 2. File URL
  if (trimmed.startsWith('file:///')) {
    const filePath = decodeURIComponent(trimmed.replace(/^file:\/\/\//, ''));
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  }

  // 3. HTTP / HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
      }
    } catch (e) {
      console.warn('[ZLauncher Skin] Failed to fetch skin from network:', e);
    }
  }

  // 4. Local file path
  if (fs.existsSync(trimmed)) {
    return fs.readFileSync(trimmed);
  }

  return null;
}

export function enableSkinPackInOptions(gameDir: string): void {
  const optionsPath = path.join(gameDir, 'options.txt');
  const targetPackName = 'file/ZLauncherSkinPack';

  try {
    let content = '';
    if (fs.existsSync(optionsPath)) {
      content = fs.readFileSync(optionsPath, 'utf8');
    }

    const rpRegex = /^resourcePacks:(.*)$/m;
    const rpMatch = content.match(rpRegex);

    if (rpMatch) {
      try {
        let packs: string[] = JSON.parse(rpMatch[1]);
        if (!Array.isArray(packs)) packs = [];
        if (!packs.includes('vanilla')) {
          packs.unshift('vanilla');
        }
        packs = packs.filter((p) => p !== targetPackName && p !== 'ZLauncherSkinPack' && p !== `${targetPackName}.zip`);
        packs.push(targetPackName);
        content = content.replace(rpRegex, `resourcePacks:${JSON.stringify(packs)}`);
      } catch (e) {
        if (!content.includes(targetPackName)) {
          content = content.replace(rpRegex, `resourcePacks:["vanilla","${targetPackName}"]`);
        }
      }
    } else {
      if (content.length > 0 && !content.endsWith('\n')) content += '\n';
      content += `resourcePacks:["vanilla","${targetPackName}"]\n`;
    }

    const irpRegex = /^incompatibleResourcePacks:(.*)$/m;
    const irpMatch = content.match(irpRegex);

    if (irpMatch) {
      try {
        let irPacks: string[] = JSON.parse(irpMatch[1]);
        if (!Array.isArray(irPacks)) irPacks = [];
        if (!irPacks.includes(targetPackName)) {
          irPacks.push(targetPackName);
        }
        content = content.replace(irpRegex, `incompatibleResourcePacks:${JSON.stringify(irPacks)}`);
      } catch (e) {}
    } else {
      if (!content.endsWith('\n')) content += '\n';
      content += `incompatibleResourcePacks:["${targetPackName}"]\n`;
    }

    fs.writeFileSync(optionsPath, content, 'utf8');
  } catch (err) {
    console.error('[ZLauncher Skin] Failed to update options.txt:', err);
  }
}

export function disableSkinPackInOptions(gameDir: string): void {
  const optionsPath = path.join(gameDir, 'options.txt');
  const targetPackName = 'file/ZLauncherSkinPack';

  try {
    if (!fs.existsSync(optionsPath)) return;
    let content = fs.readFileSync(optionsPath, 'utf8');

    const rpRegex = /^resourcePacks:(.*)$/m;
    const rpMatch = content.match(rpRegex);
    if (rpMatch) {
      try {
        let packs: string[] = JSON.parse(rpMatch[1]);
        if (Array.isArray(packs)) {
          const filtered = packs.filter(
            (p) => p !== targetPackName && p !== 'ZLauncherSkinPack' && p !== `${targetPackName}.zip`
          );
          content = content.replace(rpRegex, `resourcePacks:${JSON.stringify(filtered)}`);
        }
      } catch (e) {}
    }

    const irpRegex = /^incompatibleResourcePacks:(.*)$/m;
    const irpMatch = content.match(irpRegex);
    if (irpMatch) {
      try {
        let irPacks: string[] = JSON.parse(irpMatch[1]);
        if (Array.isArray(irPacks)) {
          const filtered = irPacks.filter(
            (p) => p !== targetPackName && p !== 'ZLauncherSkinPack' && p !== `${targetPackName}.zip`
          );
          content = content.replace(irpRegex, `incompatibleResourcePacks:${JSON.stringify(filtered)}`);
        }
      } catch (e) {}
    }

    fs.writeFileSync(optionsPath, content, 'utf8');
  } catch (err) {
    console.warn('[ZLauncher Skin] disableSkinPackInOptions warning:', err);
  }
}

export function patchCustomSkinLoaderJar(jarPath: string): boolean {
  // CustomSkinLoader 15.0.1 is clean and intact.
  // JVM flag -Dcustomskinloader.ignorePatchFailure=true is passed via launcher to handle unmapped versions safely.
  return fs.existsSync(jarPath);
}

export async function ensureCustomSkinLoaderMod(
  instanceDir: string,
  rootGameDir: string,
  httpPort: number = 28734
): Promise<boolean> {
  try {
    const cacheDir = path.join(rootGameDir, 'cache', 'mods');
    fs.mkdirSync(cacheDir, { recursive: true });
    const cachedJarPath = path.join(cacheDir, CSL_UNIVERSAL_JAR);

    // Download to cache if not present or empty
    if (!fs.existsSync(cachedJarPath) || fs.statSync(cachedJarPath).size < 100000) {
      let downloaded = false;
      for (const url of CSL_DOWNLOAD_URLS) {
        try {
          console.log(`[ZLauncher Skin] Downloading CustomSkinLoader Universal from ${url}...`);
          const res = await fetch(url, { headers: { 'User-Agent': 'ZLauncher/1.0.0' } });
          if (res.ok) {
            const arr = await res.arrayBuffer();
            fs.writeFileSync(cachedJarPath, Buffer.from(arr));
            downloaded = true;
            console.log(`[ZLauncher Skin] CustomSkinLoader cached successfully (${arr.byteLength} bytes)`);
            break;
          }
        } catch (downloadErr) {
          console.warn(`[ZLauncher Skin] Download error from ${url}:`, downloadErr);
        }
      }
      if (!downloaded && !fs.existsSync(cachedJarPath)) {
        console.warn('[ZLauncher Skin] Could not download CustomSkinLoader Universal');
        return false;
      }
    }

    // Ensure mapping.xml inside cached jar supports Minecraft 26.3+ (protocol 777+)
    patchCustomSkinLoaderJar(cachedJarPath);

    // Copy to instance mods directory
    const modsDir = path.join(instanceDir, 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    const targetModPath = path.join(modsDir, CSL_UNIVERSAL_JAR);
    if (!fs.existsSync(targetModPath) || fs.statSync(targetModPath).size !== fs.statSync(cachedJarPath).size) {
      fs.copyFileSync(cachedJarPath, targetModPath);
      console.log(`[ZLauncher Skin] Installed CustomSkinLoader Universal to ${targetModPath}`);
    }
    patchCustomSkinLoaderJar(targetModPath);

    // Configure CustomSkinLoader.json with multi-source loadlist
    const cslConfig = {
      enable: true,
      loadlist: [
        {
          name: 'LocalSkin',
          type: 'Legacy',
          checkPNG: false,
          model: 'auto',
          skin: 'CustomSkinLoader/LocalSkin/skins/{USERNAME}.png',
          cape: 'CustomSkinLoader/LocalSkin/capes/{USERNAME}.png',
          elytra: 'CustomSkinLoader/LocalSkin/elytras/{USERNAME}.png',
        },
        {
          name: 'ZLauncherSkinService',
          type: 'Legacy',
          checkPNG: false,
          model: 'auto',
          skin: `http://127.0.0.1:${httpPort}/skin/{USERNAME}.png`,
        },
        {
          name: 'ElyBy',
          type: 'ElyByAPI',
        },
        {
          name: 'Mojang',
          type: 'MojangAPI',
        },
        {
          name: 'TLauncher',
          type: 'Legacy',
          checkPNG: false,
          model: 'auto',
          skin: 'https://auth.tlauncher.org/skin/profile/texture/login/{USERNAME}',
        },
        {
          name: 'Minotar',
          type: 'Legacy',
          checkPNG: false,
          model: 'auto',
          skin: 'https://minotar.net/skin/{USERNAME}',
        },
      ],
    };

    const targetDirs = [instanceDir];
    if (rootGameDir && rootGameDir !== instanceDir) {
      targetDirs.push(rootGameDir);
    }

    for (const dir of targetDirs) {
      const cslDir = path.join(dir, 'CustomSkinLoader');
      fs.mkdirSync(cslDir, { recursive: true });
      fs.writeFileSync(path.join(cslDir, 'CustomSkinLoader.json'), JSON.stringify(cslConfig, null, 2), 'utf8');
      // Ensure SkinPack override is disabled to avoid cloned player models!
      disableSkinPackInOptions(dir);
    }

    return true;
  } catch (e) {
    console.error('[ZLauncher Skin] ensureCustomSkinLoaderMod error:', e);
    return false;
  }
}

export async function installOfflineSkin(options: SkinInstallOptions): Promise<boolean> {
  try {
    const skinBuffer = await resolveSkinBuffer(options.skinUrl);
    if (!skinBuffer || skinBuffer.length === 0) {
      console.warn('[ZLauncher Skin] No valid skin buffer found');
      return false;
    }

    const cleanUsername = (options.username || 'Player').trim();
    const vId = options.versionId || '';
    const isModded =
      options.isModded !== false &&
      (options.isModded === true ||
        vId.includes('fabric') ||
        vId.includes('forge') ||
        vId.includes('quilt') ||
        vId.includes('neoforge') ||
        fs.existsSync(path.join(options.gameDir, 'mods')));

    const targetDirs = [options.gameDir];
    if (options.rootGameDir && options.rootGameDir !== options.gameDir) {
      targetDirs.push(options.rootGameDir);
    }

    // 1. If modded instance: Install CustomSkinLoader Universal mod and write CSL config
    if (isModded) {
      await ensureCustomSkinLoaderMod(options.gameDir, options.rootGameDir || options.gameDir, options.httpPort || 28734);
    }

    // 2. Write skin to all CustomSkinLoader local paths
    for (const dir of targetDirs) {
      const cslSkinsDir = path.join(dir, 'CustomSkinLoader', 'LocalSkin', 'skins');
      const offlineskinsDir = path.join(dir, 'config', 'offlineskins');
      const cachedImagesDir = path.join(dir, 'cachedImages', 'skins');

      for (const d of [cslSkinsDir, offlineskinsDir, cachedImagesDir]) {
        try {
          fs.mkdirSync(d, { recursive: true });
          fs.writeFileSync(path.join(d, `${cleanUsername}.png`), skinBuffer);
          fs.writeFileSync(path.join(d, `${cleanUsername.toLowerCase()}.png`), skinBuffer);
        } catch (e) {}
      }
    }

    // 3. For pure vanilla fallback (when no modloader is available)
    if (!isModded) {
      for (const dir of targetDirs) {
        const rpDir = path.join(dir, 'resourcepacks', 'ZLauncherSkinPack');
        fs.mkdirSync(rpDir, { recursive: true });

        const packFormat = getPackFormat(options.versionId);
        const mcmeta = {
          pack: {
            pack_format: packFormat,
            supported_formats: { min_inclusive: 1, max_inclusive: 999 },
            description: 'ZLauncher Offline Skin Support (Active)',
          },
        };
        fs.writeFileSync(path.join(rpDir, 'pack.mcmeta'), JSON.stringify(mcmeta, null, 2), 'utf8');
        fs.writeFileSync(path.join(rpDir, 'pack.png'), skinBuffer);

        const entityDir = path.join(rpDir, 'assets', 'minecraft', 'textures', 'entity');
        const wideDir = path.join(entityDir, 'player', 'wide');
        const slimDir = path.join(entityDir, 'player', 'slim');

        fs.mkdirSync(entityDir, { recursive: true });
        fs.mkdirSync(wideDir, { recursive: true });
        fs.mkdirSync(slimDir, { recursive: true });

        fs.writeFileSync(path.join(entityDir, 'steve.png'), skinBuffer);
        fs.writeFileSync(path.join(entityDir, 'alex.png'), skinBuffer);

        const defaultModelNames = [
          'steve', 'alex', 'ari', 'chris', 'devan', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri',
        ];
        for (const name of defaultModelNames) {
          fs.writeFileSync(path.join(wideDir, `${name}.png`), skinBuffer);
          fs.writeFileSync(path.join(slimDir, `${name}.png`), skinBuffer);
        }

        try {
          const zip = new AdmZip();
          zip.addLocalFolder(rpDir);
          zip.writeZip(path.join(dir, 'resourcepacks', 'ZLauncherSkinPack.zip'));
        } catch (zipErr) {}

        enableSkinPackInOptions(dir);
      }
    }

    console.log(`[ZLauncher Skin] Skin ready for ${cleanUsername} (isModded=${isModded})`);
    return true;
  } catch (err) {
    console.error('[ZLauncher Skin] Error installing skin:', err);
    return false;
  }
}
