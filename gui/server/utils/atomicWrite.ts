import fs from 'node:fs/promises';

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, content, 'utf-8');
  await fs.rename(tmp, filePath);
}
