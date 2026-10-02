import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DownloadTask {
  url: string;
  destination: string;
  sha1?: string;
  size?: number;
}

export class FastDownloader {
  private concurrency: number;

  constructor(concurrency: number = 10) {
    this.concurrency = concurrency;
  }

  public async downloadFile(url: string, destination: string, expectedSha1?: string): Promise<boolean> {
    try {
      const dir = path.dirname(destination);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check if file exists and sha1 matches
      if (fs.existsSync(destination) && expectedSha1) {
        const hash = await this.getFileSha1(destination);
        if (hash === expectedSha1) {
          return true; // File already verified!
        }
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText} (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (expectedSha1) {
        const hash = crypto.createHash('sha1').update(buffer).digest('hex');
        if (hash.toLowerCase() !== expectedSha1.toLowerCase()) {
          console.warn(`SHA1 mismatch for ${url}: expected ${expectedSha1}, got ${hash}`);
        }
      }

      await fs.promises.writeFile(destination, buffer);
      return true;
    } catch (err) {
      console.error(`Error downloading file from ${url}:`, err);
      throw err;
    }
  }

  public async downloadBatch(
    tasks: DownloadTask[],
    onProgress?: (progress: { completed: number; total: number; currentItem?: string }) => void
  ): Promise<void> {
    const total = tasks.length;
    let completed = 0;
    let queueIndex = 0;

    const worker = async () => {
      while (queueIndex < tasks.length) {
        const index = queueIndex++;
        const task = tasks[index];
        if (!task) break;

        try {
          await this.downloadFile(task.url, task.destination, task.sha1);
        } catch (e) {
          console.error(`Failed task for ${task.url}`, e);
        }

        completed++;
        if (onProgress) {
          onProgress({
            completed,
            total,
            currentItem: path.basename(task.destination)
          });
        }
      }
    };

    const workers: Promise<void>[] = [];
    const numWorkers = Math.min(this.concurrency, tasks.length);

    for (let i = 0; i < numWorkers; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
  }

  private getFileSha1(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
