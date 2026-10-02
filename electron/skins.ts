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
}

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
    // Default fallback to high quality Steve skin
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

    // 1. Update resourcePacks
    const rpRegex = /^resourcePacks:(.*)$/m;
    const rpMatch = content.match(rpRegex);

    if (rpMatch) {
      try {
        let packs: string[] = JSON.parse(rpMatch[1]);
        if (!Array.isArray(packs)) packs = [];
        // Ensure vanilla is first
        if (!packs.includes('vanilla')) {
          packs.unshift('vanilla');
        }
        // Remove old occurrences
        packs = packs.filter((p) => p !== targetPackName && p !== 'ZLauncherSkinPack' && p !== `${targetPackName}.zip`);
        // Append at the end for highest priority override!
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

    // 2. Update incompatibleResourcePacks (so Minecraft won't warn or uncheck)
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

export async function installOfflineSkin(options: SkinInstallOptions): Promise<boolean> {
  try {
    const skinBuffer = await resolveSkinBuffer(options.skinUrl);
    if (!skinBuffer || skinBuffer.length === 0) {
      console.warn('[ZLauncher Skin] No valid skin buffer found');
      return false;
    }

    const targetDirs = [options.gameDir];
    if (options.rootGameDir && options.rootGameDir !== options.gameDir) {
      targetDirs.push(options.rootGameDir);
    }

    for (const dir of targetDirs) {
      const rpDir = path.join(dir, 'resourcepacks', 'ZLauncherSkinPack');
      fs.mkdirSync(rpDir, { recursive: true });

      // 1. Write pack.mcmeta
      const packFormat = getPackFormat(options.versionId);
      const mcmeta = {
        pack: {
          pack_format: packFormat,
          supported_formats: {
            min_inclusive: 1,
            max_inclusive: 999,
          },
          description: 'ZLauncher Offline Skin Support (Active)',
        },
      };
      fs.writeFileSync(path.join(rpDir, 'pack.mcmeta'), JSON.stringify(mcmeta, null, 2), 'utf8');

      // 2. Write pack.png (Use the skin itself as the pack icon!)
      fs.writeFileSync(path.join(rpDir, 'pack.png'), skinBuffer);

      // 3. Create all asset entity skin paths
      const entityDir = path.join(rpDir, 'assets', 'minecraft', 'textures', 'entity');
      const wideDir = path.join(entityDir, 'player', 'wide');
      const slimDir = path.join(entityDir, 'player', 'slim');

      fs.mkdirSync(entityDir, { recursive: true });
      fs.mkdirSync(wideDir, { recursive: true });
      fs.mkdirSync(slimDir, { recursive: true });

      // Legacy Minecraft paths (1.6 to 1.12)
      fs.writeFileSync(path.join(entityDir, 'steve.png'), skinBuffer);
      fs.writeFileSync(path.join(entityDir, 'alex.png'), skinBuffer);

      // Modern Minecraft 1.19.3+ default models
      const defaultModelNames = [
        'steve',
        'alex',
        'ari',
        'chris',
        'devan',
        'efe',
        'kai',
        'makena',
        'noor',
        'sunny',
        'zuri',
      ];

      for (const name of defaultModelNames) {
        fs.writeFileSync(path.join(wideDir, `${name}.png`), skinBuffer);
        fs.writeFileSync(path.join(slimDir, `${name}.png`), skinBuffer);
      }

      // 4. Create ZIP archive in resourcepacks folder as well
      try {
        const zip = new AdmZip();
        zip.addLocalFolder(rpDir);
        zip.writeZip(path.join(dir, 'resourcepacks', 'ZLauncherSkinPack.zip'));
      } catch (zipErr) {
        console.warn('[ZLauncher Skin] Zip packaging note:', zipErr);
      }

      // 5. Compatibility copies for Fabric/Forge skin mods (OfflineSkins / CustomSkinLoader)
      if (options.username) {
        const modSkinPaths = [
          path.join(dir, 'config', 'offlineskins', `${options.username}.png`),
          path.join(dir, 'cachedImages', 'skins', `${options.username}.png`),
          path.join(dir, 'CustomSkinLoader', 'skins', `${options.username}.png`),
        ];
        for (const p of modSkinPaths) {
          try {
            fs.mkdirSync(path.dirname(p), { recursive: true });
            fs.writeFileSync(p, skinBuffer);
          } catch (e) {}
        }
      }

      // 6. Automatically activate in options.txt
      enableSkinPackInOptions(dir);
    }

    console.log(`[ZLauncher Skin] Skin successfully applied for singleplayer offline mode! User: ${options.username}`);
    return true;
  } catch (err) {
    console.error('[ZLauncher Skin] Error installing offline skin:', err);
    return false;
  }
}
