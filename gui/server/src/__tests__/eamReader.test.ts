import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

// Mock fs module
vi.mock('node:fs/promises');

// Import after mocking
import { readEamJson, clearEamCache } from '../../services/eamReader.js';

const mockStat = { mtimeMs: 1000, size: 100 } as ReturnType<typeof fs.stat> extends Promise<infer T> ? T : never;
const mockData = [{ ObjectId: 'abc', ObjectDisplayName: 'Test User' }];
const mockJson = JSON.stringify(mockData);
const mockJsonWithBom = '\uFEFF' + mockJson;

describe('readEamJson BOM handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEamCache();
    vi.mocked(fs.stat).mockResolvedValue(mockStat);
  });

  it('parses JSON without BOM', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(mockJson as unknown as Uint8Array<ArrayBufferLike>);
    const result = await readEamJson('/some/file.json');
    expect(result).toEqual(mockData);
  });

  it('strips UTF-8 BOM before parsing', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(mockJsonWithBom as unknown as Uint8Array<ArrayBufferLike>);
    const result = await readEamJson('/some/file.json');
    expect(result).toEqual(mockData);
  });
});

describe('readEamJson caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEamCache();
    vi.mocked(fs.stat).mockResolvedValue(mockStat);
    vi.mocked(fs.readFile).mockResolvedValue(mockJson as unknown as Uint8Array<ArrayBufferLike>);
  });

  it('returns cached result without re-reading on second call with same mtime', async () => {
    await readEamJson('/cached/file.json');
    await readEamJson('/cached/file.json');
    // readFile should only be called once (second call hits cache)
    expect(fs.readFile).toHaveBeenCalledOnce();
  });
});
