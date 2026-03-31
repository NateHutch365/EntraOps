import simpleGit from 'simple-git';
import path from 'node:path';
import type { RbacSystem } from '../../shared/types/eam.js';
import type {
  CommitListItem,
  CommitListResponse,
  CommitChangeSummary,
  ComparisonResult,
  GitCommit,
} from '../../shared/types/api.js';
import { computeChangeSummary } from './changeSummary.js';

// ENTRAOPS_ROOT: path to the git repo root (parent of PrivilegedEAM/)
// Must be configured at deployment — defaults to process.cwd() for dev
const REPO_ROOT = process.env.ENTRAOPS_ROOT ?? path.resolve('.');

const RBAC_SYSTEMS: RbacSystem[] = [
  'EntraID',
  'ResourceApps',
  'IdentityGovernance',
  'DeviceManagement',
  'Defender',
];

const SYSTEM_PATH_RE = /PrivilegedEAM\/([^/]+)\//;

function deriveAffectedSystems(files: string[]): RbacSystem[] {
  const found = new Set<RbacSystem>();
  for (const f of files) {
    const m = SYSTEM_PATH_RE.exec(f);
    if (m && RBAC_SYSTEMS.includes(m[1] as RbacSystem)) {
      found.add(m[1] as RbacSystem);
    }
  }
  return [...found];
}

/**
 * Parse raw `git log --format=%H%n%h%n%an%n%aI%n%s --name-only` output into commit entries.
 *
 * git log --name-only inserts a blank line between the format header and the file list,
 * AND between commits. Splitting on double-newlines mixes commit headers with file lists.
 * Instead, detect commit boundaries by 40-char hex full hashes.
 */
function parseRawLog(raw: string): { fullHash: string; hash: string; author: string; date: string; message: string; files: string[] }[] {
  const lines = raw.trim().split('\n');
  const result: { fullHash: string; hash: string; author: string; date: string; message: string; files: string[] }[] = [];
  let i = 0;

  while (i < lines.length) {
    const fullHash = lines[i]?.trim() ?? '';
    // Full git hashes are exactly 40 hex chars — use as commit boundary marker
    if (!/^[0-9a-f]{40}$/i.test(fullHash)) {
      i++;
      continue;
    }

    const hash = lines[i + 1]?.trim() ?? '';
    const author = lines[i + 2]?.trim() ?? '';
    const date = lines[i + 3]?.trim() ?? '';
    const message = lines[i + 4]?.trim() ?? '';
    i += 5;

    // Skip the blank line git inserts between the header block and the file list
    if (lines[i]?.trim() === '') i++;

    // Collect file names until a blank line or the start of the next commit
    const files: string[] = [];
    while (i < lines.length) {
      const line = lines[i]?.trim() ?? '';
      if (line === '' || /^[0-9a-f]{40}$/i.test(line)) break;
      files.push(line);
      i++;
    }

    // Skip any trailing blank lines between commits
    while (i < lines.length && lines[i]?.trim() === '') i++;

    result.push({ fullHash, hash, author, date, message, files });
  }

  return result;
}

export async function getPaginatedCommits(page: number, pageSize: number): Promise<CommitListResponse> {
  const git = simpleGit(REPO_ROOT);
  try {
    const skip = (page - 1) * pageSize;

    const [rawLog, rawCount] = await Promise.all([
      git.raw([
        'log',
        `--max-count=${pageSize}`,
        `--skip=${skip}`,
        '--format=%H%n%h%n%an%n%aI%n%s',
        '--name-only',
      ]),
      git.raw(['rev-list', '--count', 'HEAD']),
    ]);

    const parsed = parseRawLog(rawLog);
    const total = parseInt(rawCount.trim(), 10) || 0;

    const commits: CommitListItem[] = parsed.map(c => {
      const affectedSystems = deriveAffectedSystems(c.files);
      return {
        hash: c.hash,
        fullHash: c.fullHash,
        message: c.message,
        author: c.author,
        date: c.date,
        affectedSystems,
        hasPrivilegedEAMChanges: affectedSystems.length > 0,
      };
    });

    return { commits, total, page, pageSize };
  } catch {
    return { commits: [], total: 0, page, pageSize };
  }
}

async function showFileAtRef(git: ReturnType<typeof simpleGit>, ref: string, filePath: string): Promise<unknown[]> {
  try {
    const content = await git.show([`${ref}:${filePath}`]);
    return JSON.parse(content) as unknown[];
  } catch {
    return [];
  }
}

export async function getCommitChangeSummary(hash: string, rbacSystem: RbacSystem): Promise<CommitChangeSummary> {
  const git = simpleGit(REPO_ROOT);
  try {
    const jsonPath = `PrivilegedEAM/${rbacSystem}/${rbacSystem}.json`;

    const [currentObjects, parentObjects] = await Promise.all([
      showFileAtRef(git, hash, jsonPath),
      showFileAtRef(git, `${hash}^`, jsonPath),
    ]);

    const sections = computeChangeSummary(
      parentObjects as Parameters<typeof computeChangeSummary>[0],
      currentObjects as Parameters<typeof computeChangeSummary>[0],
    );

    return { commitHash: hash, rbacSystem, sections };
  } catch {
    return { commitHash: hash, rbacSystem, sections: [] };
  }
}

async function getCommitMeta(git: ReturnType<typeof simpleGit>, hash: string): Promise<GitCommit & { fullHash: string }> {
  try {
    const raw = await git.raw(['log', '-1', '--format=%H%n%h%n%an%n%aI%n%s', hash]);
    const lines = raw.trim().split('\n');
    const [fullHash, shortHash, author, date, message] = lines;
    return {
      fullHash: fullHash?.trim() ?? hash,
      hash: shortHash?.trim() ?? hash.slice(0, 7),
      author: author?.trim() ?? '',
      date: date?.trim() ?? '',
      message: message?.trim() ?? '',
    };
  } catch {
    return { fullHash: hash, hash: hash.slice(0, 7), author: '', date: '', message: '' };
  }
}

export async function getCommitComparison(
  fromHash: string,
  toHash: string,
  rbacSystem: RbacSystem,
): Promise<ComparisonResult> {
  const git = simpleGit(REPO_ROOT);
  try {
    const jsonPath = `PrivilegedEAM/${rbacSystem}/${rbacSystem}.json`;

    const [fromObjects, toObjects, rawDiff, fromMeta, toMeta] = await Promise.all([
      showFileAtRef(git, fromHash, jsonPath),
      showFileAtRef(git, toHash, jsonPath),
      git.diff([fromHash, toHash, '--', jsonPath]).catch(() => ''),
      getCommitMeta(git, fromHash),
      getCommitMeta(git, toHash),
    ]);

    const sections = computeChangeSummary(
      fromObjects as Parameters<typeof computeChangeSummary>[0],
      toObjects as Parameters<typeof computeChangeSummary>[0],
    );

    return {
      from: fromMeta,
      to: toMeta,
      rbacSystem,
      sections,
      rawDiff,
    };
  } catch {
    return {
      from: { fullHash: fromHash, hash: fromHash.slice(0, 7), author: '', date: '', message: '' },
      to: { fullHash: toHash, hash: toHash.slice(0, 7), author: '', date: '', message: '' },
      rbacSystem,
      sections: [],
      rawDiff: '',
    };
  }
}

export async function getAffectedSystems(hash: string): Promise<RbacSystem[]> {
  const git = simpleGit(REPO_ROOT);
  try {
    const raw = await git.raw(['diff-tree', '--no-commit-id', '--name-only', '-r', hash]);
    const files = raw.trim().split('\n').filter(Boolean);
    return deriveAffectedSystems(files);
  } catch {
    return [];
  }
}
