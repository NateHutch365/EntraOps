import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

interface CacheEntry {
  data: unknown;
  mtime: number;
  expiry: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const STREAM_THRESHOLD = 50 * 1024 * 1024; // 50 MB

async function streamParseJson(filePath: string): Promise<unknown> {
  // Dynamic import for stream-json v2 (CJS package — avoids ESM interop issues at import time)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const streamArrayMod = (await import('stream-json/streamers/stream-array.js')) as any;
  const mod = streamArrayMod.default ?? streamArrayMod;
  // stream-json v2: withParserAsStream() creates a Duplex pipeline (parser + StreamArray)
  const parserStream = mod.withParserAsStream();

  const items: unknown[] = [];
  await pipeline(
    createReadStream(filePath),
    parserStream,
    async (source: AsyncIterable<{ key: number; value: unknown }>) => {
      for await (const { value } of source) {
        items.push(value);
      }
    }
  );
  return items;
}

export async function readEamJson(filePath: string): Promise<unknown> {
  const stat = await fs.stat(filePath);
  const cached = CACHE.get(filePath);

  if (cached && cached.mtime === stat.mtimeMs && Date.now() < cached.expiry) {
    return cached.data;
  }

  let data: unknown;
  if (stat.size > STREAM_THRESHOLD) {
    data = await streamParseJson(filePath);
  } else {
    const raw = await fs.readFile(filePath, 'utf8');
    // CRITICAL: PowerShell writes UTF-8 BOM (\uFEFF) — must strip before JSON.parse
    const content = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
    data = JSON.parse(content);
  }

  CACHE.set(filePath, { data, mtime: stat.mtimeMs, expiry: Date.now() + CACHE_TTL_MS });
  return data;
}

export function clearEamCache(): void {
  CACHE.clear();
}
