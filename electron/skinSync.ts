import dgram from 'dgram';
import http from 'http';
import fs from 'fs';
import path from 'path';

export interface SkinSyncOptions {
  baseDir: string;
  initialUsername?: string;
  initialSkinBuffer?: Buffer | null;
}

export class SkinSyncService {
  private httpPort: number = 28734;
  private udpPort: number = 28733;
  private httpServer: http.Server | null = null;
  private udpSocket: dgram.Socket | null = null;
  private baseDir: string;
  private currentUsername: string = 'Player';
  private currentSkinBuffer: Buffer | null = null;
  private peerSkins: Map<string, { buffer: Buffer; updatedAt: number }> = new Map();

  constructor(opts: SkinSyncOptions) {
    this.baseDir = opts.baseDir;
    if (opts.initialUsername) this.currentUsername = opts.initialUsername;
    if (opts.initialSkinBuffer) this.currentSkinBuffer = opts.initialSkinBuffer;
  }

  public updateIdentity(username: string, skinBuffer?: Buffer | null, gameDir?: string) {
    if (username) this.currentUsername = username.trim();
    if (skinBuffer !== undefined) this.currentSkinBuffer = skinBuffer;
    if (gameDir) this.baseDir = gameDir;

    if (this.currentSkinBuffer && this.currentSkinBuffer.length > 0) {
      this.writeSkinToDisk(this.currentUsername, this.currentSkinBuffer);
      this.broadcastSkin();
    }
  }

  public getHttpPort(): number {
    return this.httpPort;
  }

  public async start(): Promise<void> {
    await this.startHttpServer();
    this.startUdpSocket();
  }

  private async startHttpServer(): Promise<void> {
    return new Promise((resolve) => {
      const tryPort = (port: number) => {
        const server = http.createServer(async (req, res) => {
          try {
            const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
            const pathname = url.pathname;

            // Route: GET /skin/:username or /skin/:username.png
            if (pathname.startsWith('/skin/')) {
              let targetUser = decodeURIComponent(pathname.replace(/^\/skin\//, '')).replace(/\.png$/i, '').trim();
              if (!targetUser) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Missing username');
                return;
              }

              const skin = await this.resolveSkinForUser(targetUser);
              if (skin) {
                res.writeHead(200, {
                  'Content-Type': 'image/png',
                  'Content-Length': skin.length,
                  'Cache-Control': 'public, max-age=60',
                });
                res.end(skin);
                return;
              }

              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Skin not found');
              return;
            }

            // Route: GET /status
            if (pathname === '/status' || pathname === '/api/status') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                status: 'online',
                username: this.currentUsername,
                hasSkin: !!this.currentSkinBuffer,
                httpPort: this.httpPort,
                peerCount: this.peerSkins.size,
                peers: Array.from(this.peerSkins.keys()),
              }));
              return;
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Error: ${e.message}`);
          }
        });

        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && port < 28750) {
            tryPort(port + 1);
          } else {
            console.warn(`[SkinSync HTTP] Port ${port} error:`, err.message);
            resolve();
          }
        });

        server.listen(port, '0.0.0.0', () => {
          this.httpPort = port;
          this.httpServer = server;
          console.log(`[SkinSync HTTP] Skin server running on http://127.0.0.1:${port}`);
          resolve();
        });
      };

      tryPort(this.httpPort);
    });
  }

  private startUdpSocket(): void {
    try {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      socket.on('error', (err) => {
        console.warn('[SkinSync UDP] Socket error:', err.message);
      });

      socket.on('message', (msg, rinfo) => {
        try {
          const str = msg.toString('utf8');
          const data = JSON.parse(str);

          if (!data || !data.username) return;

          const senderUser = String(data.username).trim();
          if (senderUser.toLowerCase() === this.currentUsername.toLowerCase()) {
            return; // Ignore own broadcast
          }

          if (data.type === 'ZLAUNCHER_SKIN_BROADCAST') {
            if (data.skinBase64) {
              const buffer = Buffer.from(data.skinBase64, 'base64');
              this.peerSkins.set(senderUser, { buffer, updatedAt: Date.now() });
              this.writeSkinToDisk(senderUser, buffer);
              console.log(`[SkinSync UDP] Received skin for peer "${senderUser}" from ${rinfo.address}`);
            }

            // Unicast reply with our skin back to sender
            if (this.currentSkinBuffer) {
              const reply = Buffer.from(JSON.stringify({
                type: 'ZLAUNCHER_SKIN_REPLY',
                username: this.currentUsername,
                httpPort: this.httpPort,
                skinBase64: this.currentSkinBuffer.toString('base64'),
              }));
              socket.send(reply, rinfo.port, rinfo.address, (err) => {
                if (err) console.warn('[SkinSync UDP] Reply send warning:', err.message);
              });
            }
          } else if (data.type === 'ZLAUNCHER_SKIN_REPLY') {
            if (data.skinBase64) {
              const buffer = Buffer.from(data.skinBase64, 'base64');
              this.peerSkins.set(senderUser, { buffer, updatedAt: Date.now() });
              this.writeSkinToDisk(senderUser, buffer);
              console.log(`[SkinSync UDP] Registered peer reply skin for "${senderUser}"`);
            }
          }
        } catch (e) {}
      });

      socket.bind(this.udpPort, '0.0.0.0', () => {
        try {
          socket.setBroadcast(true);
          this.udpSocket = socket;
          console.log(`[SkinSync UDP] Listening on 0.0.0.0:${this.udpPort}`);
          // Send initial announcement
          this.broadcastSkin();
        } catch (err: any) {
          console.warn('[SkinSync UDP] SetBroadcast note:', err.message);
        }
      });
    } catch (err: any) {
      console.warn('[SkinSync UDP] Start warning:', err.message);
    }
  }

  public broadcastSkin(): void {
    if (!this.udpSocket || !this.currentSkinBuffer) return;

    try {
      const payload = Buffer.from(JSON.stringify({
        type: 'ZLAUNCHER_SKIN_BROADCAST',
        username: this.currentUsername,
        httpPort: this.httpPort,
        skinBase64: this.currentSkinBuffer.toString('base64'),
      }));

      // Broadcast to local subnet
      this.udpSocket.send(payload, this.udpPort, '255.255.255.255', (err) => {
        if (err) console.warn('[SkinSync UDP] Broadcast note:', err.message);
      });

      // Also send to loopback for multi-instance testing
      this.udpSocket.send(payload, this.udpPort, '127.0.0.1', () => {});
    } catch (e: any) {
      console.warn('[SkinSync UDP] Broadcast failed:', e.message);
    }
  }

  private writeSkinToDisk(username: string, skinBuffer: Buffer): void {
    if (!username || !skinBuffer || skinBuffer.length === 0) return;

    const dirsToTarget: string[] = [this.baseDir];
    const instancesDir = path.join(this.baseDir, 'instances');
    if (fs.existsSync(instancesDir)) {
      try {
        const list = fs.readdirSync(instancesDir, { withFileTypes: true });
        for (const item of list) {
          if (item.isDirectory()) {
            dirsToTarget.push(path.join(instancesDir, item.name));
          }
        }
      } catch (e) {}
    }

    for (const dir of dirsToTarget) {
      const cslSkinDir = path.join(dir, 'CustomSkinLoader', 'LocalSkin', 'skins');
      const offlineskinsDir = path.join(dir, 'config', 'offlineskins');
      const cachedImagesDir = path.join(dir, 'cachedImages', 'skins');

      for (const d of [cslSkinDir, offlineskinsDir, cachedImagesDir]) {
        try {
          fs.mkdirSync(d, { recursive: true });
          fs.writeFileSync(path.join(d, `${username}.png`), skinBuffer);
          fs.writeFileSync(path.join(d, `${username.toLowerCase()}.png`), skinBuffer);
        } catch (e) {}
      }
    }
  }

  private async resolveSkinForUser(username: string): Promise<Buffer | null> {
    const cleanUser = username.trim();

    // 1. Self skin
    if (cleanUser.toLowerCase() === this.currentUsername.toLowerCase() && this.currentSkinBuffer) {
      return this.currentSkinBuffer;
    }

    // 2. Peer skin from memory
    const peer = this.peerSkins.get(cleanUser) || this.peerSkins.get(cleanUser.toLowerCase());
    if (peer) {
      return peer.buffer;
    }

    // 3. Local disk skin in CustomSkinLoader folder
    const diskPath = path.join(this.baseDir, 'CustomSkinLoader', 'LocalSkin', 'skins', `${cleanUser}.png`);
    if (fs.existsSync(diskPath)) {
      try {
        const buf = fs.readFileSync(diskPath);
        this.peerSkins.set(cleanUser, { buffer: buf, updatedAt: Date.now() });
        return buf;
      } catch (e) {}
    }

    // 4. Ely.by Direct
    try {
      const elyRes = await fetch(`http://skinsystem.ely.by/skins/${encodeURIComponent(cleanUser)}.png`, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (elyRes.ok) {
        const arr = await elyRes.arrayBuffer();
        const buf = Buffer.from(arr);
        this.peerSkins.set(cleanUser, { buffer: buf, updatedAt: Date.now() });
        this.writeSkinToDisk(cleanUser, buf);
        return buf;
      }
    } catch (e) {}

    // 5. Minotar / Mojang fallback
    try {
      const minotarRes = await fetch(`https://minotar.net/skin/${encodeURIComponent(cleanUser)}`, {
        headers: { 'User-Agent': 'ZLauncher/1.0.0' },
      });
      if (minotarRes.ok) {
        const arr = await minotarRes.arrayBuffer();
        const buf = Buffer.from(arr);
        this.peerSkins.set(cleanUser, { buffer: buf, updatedAt: Date.now() });
        this.writeSkinToDisk(cleanUser, buf);
        return buf;
      }
    } catch (e) {}

    return null;
  }

  public stop(): void {
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = null;
    }
  }
}
