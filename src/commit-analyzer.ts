/**
 * Commit analyzer — detects impact, groups commits, scores releases
 */

import {
  Commit,
  ReleaseGroup,
  ReleaseNote,
  ImpactScore,
  ImpactLevel,
  CommitType,
  TYPE_CONFIG,
  ChangelogConfig
} from './models.js';

/**
 * Detect breaking changes in a commit by analyzing diff patterns
 */
export function detectBreakingChanges(commit: Commit): boolean {
  if (commit.isBreaking) return true;

  // Check for file deletions (could indicate API removal)
  const deletedFiles = commit.files.filter(f => f.startsWith('src/') || f.startsWith('lib/'));
  if (deletedFiles.length > 3) return true;

  // Check for package.json changes (could indicate dependency breaking changes)
  if (commit.files.some(f => f === 'package.json' || f === 'package-lock.json')) {
    // Major version bump in package.json is a strong indicator
    if (commit.body && /major/i.test(commit.body)) return true;
  }

  return false;
}

/**
 * Calculate impact score for a set of commits
 */
export function calculateImpact(commits: Commit[]): ImpactScore {
  if (commits.length === 0) {
    return { score: 0, level: 'info', factors: [] };
  }

  let score = 0;
  const factors: string[] = [];

  // Count by type
  void 0; // typeCounts would be used for future stats
  const breakingCount = commits.filter(c => detectBreakingChanges(c)).length;
  const featCount = commits.filter(c => c.type === 'feat').length;
  const fixCount = commits.filter(c => c.type === 'fix').length;
  const perfCount = commits.filter(c => c.type === 'perf').length;

  // Breaking changes are the biggest impact factor (0-40 points)
  if (breakingCount > 0) {
    const breakingScore = Math.min(40, breakingCount * 15);
    score += breakingScore;
    factors.push(`${breakingCount} breaking change(s)`);
  }

  // Features (0-25 points)
  if (featCount > 0) {
    const featScore = Math.min(25, featCount * 3);
    score += featScore;
    factors.push(`${featCount} new feature(s)`);
  }

  // Performance improvements (0-15 points)
  if (perfCount > 0) {
    score += Math.min(15, perfCount * 5);
    factors.push(`${perfCount} performance improvement(s)`);
  }

  // Bug fixes (0-10 points)
  if (fixCount > 0) {
    score += Math.min(10, fixCount);
    factors.push(`${fixCount} bug fix(es)`);
  }

  // File change volume (0-10 points)
  const totalChanges = commits.reduce((sum, c) => sum + c.additions + c.deletions, 0);
  if (totalChanges > 1000) {
    score += 10;
    factors.push(`Large change volume (${totalChanges} lines)`);
  } else if (totalChanges > 500) {
    score += 5;
    factors.push(`Moderate change volume (${totalChanges} lines)`);
  }

  // Determine impact level
  let level: ImpactLevel;
  if (score >= 70) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 30) level = 'medium';
  else if (score >= 10) level = 'low';
  else level = 'info';

  return { score: Math.min(100, score), level, factors };
}

/**
 * Group commits by type, scope, impact, or auto
 */
export function groupCommits(commits: Commit[], groupBy: ChangelogConfig['groupBy']): ReleaseGroup[] {
  const groups: Map<string, Commit[]> = new Map();

  for (const commit of commits) {
    let groupKey: string;

    if (groupBy === 'type') {
      groupKey = commit.type;
    } else if (groupBy === 'scope' && commit.scope) {
      groupKey = `scope:${commit.scope}`;
    } else if (groupBy === 'impact') {
      const impact = calculateImpact([commit]);
      groupKey = `impact:${impact.level}`;
    } else {
      // Auto: breaking first, then by type
      if (detectBreakingChanges(commit)) {
        groupKey = 'breaking';
      } else {
        groupKey = commit.type;
      }
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(commit);
  }

  // Convert to ReleaseGroup array
  const result: ReleaseGroup[] = [];

  for (const [key, groupCommits] of Array.from(groups.entries())) {
    let type: string;
    let label: string;
    let emoji: string;
    let impact: ImpactLevel;

    if (key === 'breaking') {
      type = 'breaking';
      label = 'Breaking Changes';
      emoji = '💥';
      impact = 'critical';
    } else if (key.startsWith('scope:')) {
      const scope = key.replace('scope:', '');
      type = scope;
      label = scope;
      emoji = '📦';
      impact = calculateImpact(groupCommits).level;
    } else if (key.startsWith('impact:')) {
      const level = key.replace('impact:', '') as ImpactLevel;
      type = level;
      label = `${level.charAt(0).toUpperCase() + level.slice(1)} Impact`;
      emoji = impactEmoji(level);
      impact = level;
    } else {
      const config = TYPE_CONFIG[key as CommitType] || TYPE_CONFIG.other;
      type = key;
      label = config.label;
      emoji = config.emoji;
      impact = calculateImpact(groupCommits).level;
    }

    result.push({
      type,
      label,
      emoji,
      commits: groupCommits,
      impact
    });
  }

  // Sort: breaking first, then by impact, then by type order
  const impactOrder: Record<ImpactLevel, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const typeOrder: Record<string, number> = {};
  let order = 0;
  for (const [key] of Object.entries(TYPE_CONFIG)) {
    typeOrder[key] = order++;
  }

  result.sort((a, b) => {
    // Breaking changes first
    if (a.type === 'breaking' && b.type !== 'breaking') return -1;
    if (b.type === 'breaking' && a.type !== 'breaking') return 1;

    // Then by impact
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;

    // Then by type order
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  });

  return result;
}

function impactEmoji(level: ImpactLevel): string {
  switch (level) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '📊';
    case 'low': return 'ℹ️';
    case 'info': return '📋';
  }
}

/**
 * Generate a concise summary of the release
 */
export function generateSummary(commits: Commit[], groups: ReleaseGroup[]): string {
  const breaking = groups.find(g => g.type === 'breaking');
  const featCount = commits.filter(c => c.type === 'feat').length;
  const fixCount = commits.filter(c => c.type === 'fix').length;
  const refactorCount = commits.filter(c => c.type === 'refactor').length;

  const parts: string[] = [];

  if (breaking) {
    parts.push(`${breaking.commits.length} breaking change(s)`);
  }
  if (featCount > 0) {
    parts.push(`${featCount} new feature(s)`);
  }
  if (fixCount > 0) {
    parts.push(`${fixCount} bug fix(es)`);
  }
  if (refactorCount > 0) {
    parts.push(`${refactorCount} refactoring(s)`);
  }

  if (parts.length === 0) {
    return `Release with ${commits.length} change(s)`;
  }

  return `Release with ${parts.join(', ')}`;
}

/**
 * Build a complete release note from commits
 */
export function buildReleaseNote(
  version: string,
  date: string,
  tag: string,
  previousTag: string | null,
  commits: Commit[]
): ReleaseNote {
  const groups = groupCommits(commits, 'auto');
  const impact = calculateImpact(commits);
  const summary = generateSummary(commits, groups);

  const breakingChanges = commits.filter(c => detectBreakingChanges(c));

  return {
    version,
    date,
    tag,
    previousTag,
    groups,
    summary,
    totalCommits: commits.length,
    totalAdditions: commits.reduce((s, c) => s + c.additions, 0),
    totalDeletions: commits.reduce((s, c) => s + c.deletions, 0),
    breakingChanges,
    impactScore: impact.score,
    impactLevel: impact.level
  };
}
