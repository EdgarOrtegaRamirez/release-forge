/**
 * Git history parser — extracts commits from a git repository
 */

import { execSync } from 'child_process';
import { Commit, CommitType, TYPE_PATTERN, BREAKING_KEYWORDS } from './models.js';

function safeExec(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    }).trim();
  } catch {
    return '';
  }
}

export function parseCommitMessage(message: string): {
  type: CommitType;
  scope: string | null;
  subject: string;
  isBreaking: boolean;
} {
  // Check for breaking change markers
  let isBreaking = false;
  for (const keyword of BREAKING_KEYWORDS) {
    if (message.includes(keyword)) {
      isBreaking = true;
      break;
    }
  }

  // Parse conventional commit format
  const match = message.match(TYPE_PATTERN);
  if (match) {
    const type = match[1] as CommitType;
    const scope = match[2] || null;
    const subject = match[3];
    return { type, scope, subject, isBreaking };
  }

  // Check if it's a revert
  if (message.toLowerCase().startsWith('revert:')) {
    return { type: 'revert', scope: null, subject: message, isBreaking };
  }

  // Check for !: pattern (breaking change shorthand)
  if (message.includes('!: ')) {
    const parts = message.split('!: ');
    return { type: 'breaking', scope: null, subject: parts[1] || message, isBreaking: true };
  }

  return { type: 'other', scope: null, subject: message, isBreaking };
}

export function getGitTags(repoPath?: string): string[] {
  const output = safeExec('git tag --sort=-version:refname', repoPath);
  if (!output) return [];
  return output.split('\n').filter(t => t.trim().length > 0);
}

export function getGitLog(
  fromTag: string | null,
  toTag: string | null,
  repoPath?: string
): Commit[] {
  // Build the revision range
  let revRange = toTag || 'HEAD';
  if (fromTag) {
    revRange = `${fromTag}..${revRange}`;
  }

  // Get commit log with stats
  const logOutput = safeExec(
    `git log ${revRange} --pretty=format:'%H%n%h%n%an%n%ad%n%s%n%b%n---COMMIT_SEP---' --date=short`,
    repoPath
  );

  if (!logOutput) return [];

  // Parse raw commits
  const rawCommits = logOutput.split('---COMMIT_SEP---').filter(c => c.trim());
  const commits: Commit[] = [];

  for (const raw of rawCommits) {
    const lines = raw.trim().split('\n');
    if (lines.length < 5) continue;

    const hash = lines[0];
    const shortHash = lines[1];
    const author = lines[2];
    const date = lines[3];
    const message = lines[4];
    // Body starts at line 5 if present (after %b)
    const bodyLines = lines.slice(5);
    const body = bodyLines.length > 0 ? bodyLines.join('\n').trim() : null;

    const parsed = parseCommitMessage(message);

    commits.push({
      hash,
      shortHash,
      message,
      body,
      author,
      date,
      type: parsed.type,
      scope: parsed.scope,
      isBreaking: parsed.isBreaking,
      files: [],
      additions: 0,
      deletions: 0
    });
  }

  // Get file stats for each commit
  for (const commit of commits) {
    const stats = getCommitStats(commit.hash, repoPath);
    commit.files = stats.files;
    commit.additions = stats.additions;
    commit.deletions = stats.deletions;
  }

  return commits;
}

interface CommitStats {
  files: string[];
  additions: number;
  deletions: number;
}

function getCommitStats(hash: string, repoPath?: string): CommitStats {
  // Get changed files
  const filesOutput = safeExec(
    `git diff-tree --no-commit-id --name-status -r ${hash}`,
    repoPath
  );

  const files: string[] = [];
  let additions = 0;
  let deletions = 0;

  if (filesOutput) {
    const lines = filesOutput.split('\n');
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        files.push(parts[1]);
      }
    }
  }

  // Get diff stats
  const statsOutput = safeExec(
    `git show --stat --format='' ${hash}`,
    repoPath
  );

  if (statsOutput) {
    const lastLine = statsOutput.split('\n').filter(l => l.includes('file')).pop();
    if (lastLine) {
      const addMatch = lastLine.match(/(\d+) insertion/);
      const delMatch = lastLine.match(/(\d+) deletion/);
      if (addMatch) additions = parseInt(addMatch[1], 10);
      if (delMatch) deletions = parseInt(delMatch[1], 10);
    }
  }

  return { files, additions, deletions };
}

export function getLatestTag(repoPath?: string): string | null {
  const tags = getGitTags(repoPath);
  return tags.length > 0 ? tags[0] : null;
}

export function getTagDate(tag: string, repoPath?: string): string {
  const output = safeExec(`git log -1 --format=%ad --date=short ${tag}`, repoPath);
  return output || new Date().toISOString().split('T')[0];
}

export function getTagHash(tag: string, repoPath?: string): string {
  const output = safeExec(`git rev-list -n 1 ${tag}`, repoPath);
  return output || '';
}
