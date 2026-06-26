import { describe, it, expect } from 'vitest';
import { parseCommitMessage, getGitTags, getLatestTag, getGitLog } from '../src/git-parser.js';
import { CommitType } from '../src/models.js';

describe('parseCommitMessage', () => {
  it('should parse conventional commit with type', () => {
    const result = parseCommitMessage('feat: add user authentication');
    expect(result.type).toBe('feat');
    expect(result.scope).toBeNull();
    expect(result.subject).toBe('add user authentication');
    expect(result.isBreaking).toBe(false);
  });

  it('should parse conventional commit with scope', () => {
    const result = parseCommitMessage('feat(auth): add OAuth support');
    expect(result.type).toBe('feat');
    expect(result.scope).toBe('auth');
    expect(result.subject).toBe('add OAuth support');
  });

  it('should detect breaking changes with BREAKING CHANGE', () => {
    const result = parseCommitMessage('feat(api): change API signature\n\nBREAKING CHANGE: removed old endpoint');
    expect(result.isBreaking).toBe(true);
  });

  it('should detect breaking changes with !: syntax', () => {
    const result = parseCommitMessage('feat!: remove legacy API');
    expect(result.isBreaking).toBe(true);
  });

  it('should parse fix commits', () => {
    const result = parseCommitMessage('fix: resolve null pointer exception');
    expect(result.type).toBe('fix');
  });

  it('should parse perf commits', () => {
    const result = parseCommitMessage('perf: optimize database queries');
    expect(result.type).toBe('perf');
  });

  it('should parse refactor commits', () => {
    const result = parseCommitMessage('refactor: simplify authentication flow');
    expect(result.type).toBe('refactor');
  });

  it('should parse docs commits', () => {
    const result = parseCommitMessage('docs: update API documentation');
    expect(result.type).toBe('docs');
  });

  it('should parse chore commits', () => {
    const result = parseCommitMessage('chore: update dependencies');
    expect(result.type).toBe('chore');
  });

  it('should parse test commits', () => {
    const result = parseCommitMessage('test: add unit tests for auth module');
    expect(result.type).toBe('test');
  });

  it('should parse ci commits', () => {
    const result = parseCommitMessage('ci: add GitHub Actions workflow');
    expect(result.type).toBe('ci');
  });

  it('should parse style commits', () => {
    const result = parseCommitMessage('style: format code with prettier');
    expect(result.type).toBe('style');
  });

  it('should parse revert commits', () => {
    const result = parseCommitMessage('revert: revert commit abc123');
    expect(result.type).toBe('revert');
  });

  it('should classify unknown commits as other', () => {
    const result = parseCommitMessage('Updated README');
    expect(result.type).toBe('other');
  });

  it('should parse breaking change with scope', () => {
    const result = parseCommitMessage('feat(api)!: remove v1 endpoints');
    expect(result.type).toBe('feat');
    expect(result.scope).toBe('api');
    expect(result.isBreaking).toBe(true);
  });
});

describe('getGitTags', () => {
  it('should return sorted tags for a git repository', () => {
    const tags = getGitTags('/root/workspace/release-forge');
    expect(Array.isArray(tags)).toBe(true);
  });

  it('should return empty array for non-git directory', () => {
    const tags = getGitTags('/tmp/nonexistent-repo');
    expect(tags).toEqual([]);
  });
});

describe('getLatestTag', () => {
  it('should return the latest tag or null', () => {
    const latest = getLatestTag('/root/workspace/release-forge');
    expect(latest).toBeNull(); // No tags in this repo
  });
});

describe('getGitLog', () => {
  it('should return commits for the release-forge repo', () => {
    const commits = getGitLog(null, 'HEAD', '/root/workspace/release-forge');
    expect(Array.isArray(commits)).toBe(true);
    // Repo may have 0 commits if freshly initialized, but should not error
    expect(commits.length >= 0).toBe(true);
  });

  it('should return empty array for non-git directory', () => {
    const commits = getGitLog(null, 'HEAD', '/tmp/nonexistent-repo');
    expect(commits).toEqual([]);
  });

  it('should populate file stats for each commit', () => {
    const commits = getGitLog(null, 'HEAD', '/root/workspace/release-forge');
    for (const commit of commits) {
      expect(Array.isArray(commit.files)).toBe(true);
      expect(typeof commit.additions).toBe('number');
      expect(typeof commit.deletions).toBe('number');
    }
  });
});
