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

export interface LauncherConfig {
  username: string;
  selectedVersion: string;
  activeInstanceId: string;
  instances: Instance[];
  minRam: number;
  maxRam: number;
  javaPath: string;
  jvmPreset: 'standard' | 'optimized' | 'aikar' | 'custom';
  customJvmArgs: string;
  gameDir: string;
  resolution: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  soundEnabled: boolean;
  soundVolume: number;
  theme: 'cyber' | 'nether' | 'end' | 'lush' | 'overworld';
  particles: boolean;
  skinUrl: string;
  skinType: 'classic' | 'slim';
}

export interface VersionItem {
  id: string;
  type: string;
  url?: string;
  time?: string;
  releaseTime?: string;
  isInstalled?: boolean;
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

export interface ServerStatus {
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

export interface ConsoleLogEntry {
  type: 'stdout' | 'stderr' | 'system';
  text: string;
  timestamp: string;
}
