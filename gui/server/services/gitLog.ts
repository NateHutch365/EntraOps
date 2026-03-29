import simpleGit from 'simple-git';
import path from 'node:path';

// Inline type: avoids cross-workspace relative import issues.
// Matches GitCommit in gui/shared/types/api.ts
interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

// ENTRAOPS_ROOT: path to the git repo root (parent of PrivilegedEAM/)
// Must be configured at deployment — defaults to process.cwd() for dev
const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve('.');

export async function getRecentPrivilegedEAMCommits(count = 5): Promise<GitCommit[]> {
  const git = simpleGit(REPO_ROOT);
  try {
    const log = await git.log({
      maxCount: count,
      '--': null,
      'PrivilegedEAM/': null,
    } as Parameters<typeof git.log>[0]);
    // Empty log.all = no commits touching PrivilegedEAM/ yet — return empty array, not error
    return log.all.map(c => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      author: c.author_name,
      date: c.date,
    }));
  } catch {
    // Git not available or repo not initialized — return empty, not 500
    return [];
  }
}
