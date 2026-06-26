import { describe, it, expect } from 'vitest';
import { ChangelogGenerator } from '../src/changelog-generator.js';
import { ReleaseNote, CommitType } from '../src/models.js';

function makeReleaseNote(): ReleaseNote {
  return {
    version: '1.0.0',
    date: '2026-06-26',
    tag: 'v1.0.0',
    previousTag: null,
    groups: [],
    summary: 'Initial release',
    totalCommits: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    breakingChanges: [],
    impactScore: 0,
    impactLevel: 'info'
  };
}

describe('ChangelogGenerator', () => {
  it('should generate markdown output', () => {
    const generator = new ChangelogGenerator({
      repository: 'EdgarOrtegaRamirez/release-forge',
      fromTag: null,
      toTag: null,
      outputFormat: 'markdown',
      template: null,
      groupBy: 'auto',
      includeBreaking: true,
      includeScope: true,
      maxCommitsPerGroup: 50,
      customTypes: {}
    });

    const release = makeReleaseNote();
    const output = generator.generate(release);
    expect(output).toContain('# Release 1.0.0');
    expect(output).toContain('Initial release');
  });

  it('should generate JSON output', () => {
    const generator = new ChangelogGenerator({
      repository: 'EdgarOrtegaRamirez/release-forge',
      fromTag: null,
      toTag: null,
      outputFormat: 'json',
      template: null,
      groupBy: 'auto',
      includeBreaking: true,
      includeScope: true,
      maxCommitsPerGroup: 50,
      customTypes: {}
    });

    const release = makeReleaseNote();
    const output = generator.generate(release);
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.date).toBe('2026-06-26');
  });

  it('should generate HTML output', () => {
    const generator = new ChangelogGenerator({
      repository: 'EdgarOrtegaRamirez/release-forge',
      fromTag: null,
      toTag: null,
      outputFormat: 'html',
      template: null,
      groupBy: 'auto',
      includeBreaking: true,
      includeScope: true,
      maxCommitsPerGroup: 50,
      customTypes: {}
    });

    const release = makeReleaseNote();
    const output = generator.generate(release);
    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('Release 1.0.0');
    expect(output).toContain('</html>');
  });

  it('should include breaking changes in markdown', () => {
    const generator = new ChangelogGenerator({
      repository: 'EdgarOrtegaRamirez/release-forge',
      fromTag: null,
      toTag: null,
      outputFormat: 'markdown',
      template: null,
      groupBy: 'auto',
      includeBreaking: true,
      includeScope: true,
      maxCommitsPerGroup: 50,
      customTypes: {}
    });

    const release = makeReleaseNote();
    release.breakingChanges = [
      {
        hash: 'abc1234',
        shortHash: 'abc1234',
        message: 'feat!: remove old API',
        body: 'This breaks compatibility',
        author: 'Test',
        date: '2026-06-26',
        type: 'feat' as CommitType,
        scope: 'api',
        isBreaking: true,
        files: ['src/api.ts'],
        additions: 10,
        deletions: 5
      }
    ];
    release.groups = [
      {
        type: 'breaking',
        label: 'Breaking Changes',
        emoji: '💥',
        commits: release.breakingChanges,
        impact: 'critical'
      }
    ];
    release.totalCommits = 1;

    const output = generator.generate(release);
    expect(output).toContain('Breaking Changes');
    expect(output).toContain('💥');
  });
});
