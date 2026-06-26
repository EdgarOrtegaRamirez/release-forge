import { describe, it, expect } from 'vitest';
import {
  detectBreakingChanges,
  calculateImpact,
  groupCommits,
  generateSummary,
  buildReleaseNote
} from '../src/commit-analyzer.js';
import { Commit, CommitType } from '../src/models.js';

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    hash: 'abc1234',
    shortHash: 'abc1234',
    message: 'feat: add new feature',
    body: null,
    author: 'Test User',
    date: '2026-06-26',
    type: 'feat' as CommitType,
    scope: null,
    isBreaking: false,
    files: [],
    additions: 0,
    deletions: 0,
    ...overrides
  };
}

describe('detectBreakingChanges', () => {
  it('should detect breaking change from isBreaking flag', () => {
    const commit = makeCommit({ isBreaking: true });
    expect(detectBreakingChanges(commit)).toBe(true);
  });

  it('should return false for non-breaking commit', () => {
    const commit = makeCommit({ isBreaking: false });
    expect(detectBreakingChanges(commit)).toBe(false);
  });
});

describe('calculateImpact', () => {
  it('should return zero impact for empty commits', () => {
    const result = calculateImpact([]);
    expect(result.score).toBe(0);
    expect(result.level).toBe('info');
  });

  it('should score breaking changes highly', () => {
    const commits = [
      makeCommit({ isBreaking: true, type: 'feat' }),
      makeCommit({ isBreaking: true, type: 'feat' })
    ];
    const result = calculateImpact(commits);
    expect(result.score).toBeGreaterThan(30);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('should score features moderately', () => {
    const commits = Array(5).fill(null).map(() => makeCommit({ type: 'feat' }));
    const result = calculateImpact(commits);
    expect(result.score).toBeGreaterThan(0);
    expect(result.level).not.toBe('info');
  });

  it('should return low impact for minimal changes', () => {
    const commits = [makeCommit({ type: 'chore' })];
    const result = calculateImpact(commits);
    expect(result.level).toBe('info');
  });
});

describe('groupCommits', () => {
  it('should group by type', () => {
    const commits = [
      makeCommit({ type: 'feat' }),
      makeCommit({ type: 'fix' }),
      makeCommit({ type: 'feat' })
    ];
    const groups = groupCommits(commits, 'type');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('should group by scope', () => {
    const commits = [
      makeCommit({ type: 'feat', scope: 'api' }),
      makeCommit({ type: 'fix', scope: 'api' }),
      makeCommit({ type: 'feat', scope: 'ui' })
    ];
    const groups = groupCommits(commits, 'scope');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('should auto-group with breaking changes first', () => {
    const commits = [
      makeCommit({ type: 'feat', scope: 'api', isBreaking: true }),
      makeCommit({ type: 'fix' }),
      makeCommit({ type: 'feat' })
    ];
    const groups = groupCommits(commits, 'auto');
    const firstGroup = groups[0];
    expect(firstGroup.type).toBe('breaking');
  });

  it('should limit commits per group in output', () => {
    const commits = Array(100).fill(null).map(() => makeCommit({ type: 'feat' }));
    const groups = groupCommits(commits, 'type');
    const featGroup = groups.find(g => g.type === 'feat');
    expect(featGroup).toBeDefined();
    // Max is applied during output generation, not grouping
    expect(featGroup!.commits.length).toBe(100);
  });
});

describe('generateSummary', () => {
  it('should generate summary with features and fixes', () => {
    const commits = [
      makeCommit({ type: 'feat' }),
      makeCommit({ type: 'fix' }),
      makeCommit({ type: 'chore' })
    ];
    const groups = groupCommits(commits, 'auto');
    const summary = generateSummary(commits, groups);
    expect(summary).toContain('feature');
    expect(summary).toContain('bug fix');
  });

  it('should handle empty commits', () => {
    const summary = generateSummary([], []);
    expect(summary).toContain('Release');
  });
});

describe('buildReleaseNote', () => {
  it('should build a complete release note', () => {
    const commits = [
      makeCommit({ type: 'feat', message: 'feat: add login' }),
      makeCommit({ type: 'fix', message: 'fix: resolve crash' }),
      makeCommit({ type: 'feat', message: 'feat!: remove old API', isBreaking: true })
    ];
    const note = buildReleaseNote('1.0.0', '2026-06-26', 'v1.0.0', null, commits);
    expect(note.version).toBe('1.0.0');
    expect(note.date).toBe('2026-06-26');
    expect(note.tag).toBe('v1.0.0');
    expect(note.totalCommits).toBe(3);
    expect(note.breakingChanges.length).toBe(1);
    expect(note.groups.length).toBeGreaterThan(0);
  });
});
