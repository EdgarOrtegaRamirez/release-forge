/**
 * Changelog generator — produces formatted output from release notes
 */

import { ReleaseNote, ChangelogConfig } from './models.js';

export class ChangelogGenerator {
  private config: ChangelogConfig;

  constructor(config: ChangelogConfig) {
    this.config = config;
  }

  /**
   * Generate changelog in the specified format
   */
  generate(release: ReleaseNote): string {
    switch (this.config.outputFormat) {
      case 'markdown':
        return this.generateMarkdown(release);
      case 'json':
        return this.generateJson(release);
      case 'html':
        return this.generateHtml(release);
      default:
        return this.generateMarkdown(release);
    }
  }

  /**
   * Generate markdown format changelog
   */
  private generateMarkdown(release: ReleaseNote): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Release ${release.version}`);
    lines.push('');
    lines.push(`**Date:** ${release.date}`);
    lines.push(`**Tag:** \`${release.tag}\``);
    if (release.previousTag) {
      lines.push(`**From:** \`${release.previousTag}\``);
    }
    lines.push('');

    // Summary
    lines.push(`> ${release.summary}`);
    lines.push('');

    // Impact badge
    const impactEmoji = this.getImpactEmoji(release.impactLevel);
    lines.push(`**Impact:** ${impactEmoji} ${release.impactLevel.charAt(0).toUpperCase() + release.impactLevel.slice(1)} (${release.impactScore}/100)`);
    lines.push('');

    // Stats
    lines.push(`**Commits:** ${release.totalCommits} | **Added:** ${release.totalAdditions} | **Deleted:** ${release.totalDeletions}`);
    lines.push('');

    // Groups
    for (const group of release.groups) {
      lines.push(`## ${group.emoji} ${group.label}`);
      lines.push('');

      for (const commit of group.commits.slice(0, this.config.maxCommitsPerGroup)) {
        let line = `- ${this.formatCommitMessage(commit)}`;

        if (this.config.includeScope && commit.scope) {
          line += ` \`${commit.scope}\``;
        }

        if (commit.body) {
          const firstLine = commit.body.split('\n')[0];
          if (firstLine.trim()) {
            line += ` — ${firstLine.trim()}`;
          }
        }

        lines.push(line);
      }

      if (group.commits.length > this.config.maxCommitsPerGroup) {
        lines.push(`- ... and ${group.commits.length - this.config.maxCommitsPerGroup} more`);
      }

      lines.push('');
    }

    // Contributors
    const contributors = this.getContributors(release);
    if (contributors.length > 0) {
      lines.push(`### Contributors`);
      lines.push('');
      for (const contributor of contributors) {
        lines.push(`- ${contributor}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format a single commit message for display
   */
  private formatCommitMessage(commit: { message: string; shortHash: string }): string {
    const shortHash = commit.shortHash;
    // Remove the type prefix for cleaner display
    const message = commit.message.replace(/^(feat|fix|perf|refactor|docs|chore|test|ci|style|revert|breaking)(?:\([^)]*\))?!?:\s*/, '');
    return `[${shortHash}](https://github.com/${this.config.repository}/commit/${shortHash}) ${message}`;
  }

  /**
   * Generate JSON format changelog
   */
  private generateJson(release: ReleaseNote): string {
    const output = {
      version: release.version,
      date: release.date,
      tag: release.tag,
      previousTag: release.previousTag,
      summary: release.summary,
      impact: {
        score: release.impactScore,
        level: release.impactLevel,
        factors: []
      },
      stats: {
        totalCommits: release.totalCommits,
        totalAdditions: release.totalAdditions,
        totalDeletions: release.totalDeletions
      },
      groups: release.groups.map(g => ({
        type: g.type,
        label: g.label,
        emoji: g.emoji,
        impact: g.impact,
        commits: g.commits.map(c => ({
          hash: c.shortHash,
          message: c.message,
          type: c.type,
          scope: c.scope,
          isBreaking: c.isBreaking,
          files: c.files,
          additions: c.additions,
          deletions: c.deletions
        }))
      })),
      breakingChanges: release.breakingChanges.map(c => ({
        hash: c.shortHash,
        message: c.message,
        files: c.files
      })),
      contributors: this.getContributors(release)
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Generate HTML format changelog
   */
  private generateHtml(release: ReleaseNote): string {
    const impactColor = this.getImpactColor(release.impactLevel);

    const groupsHtml = release.groups.map(group => {
      const commitsHtml = group.commits.slice(0, this.config.maxCommitsPerGroup)
        .map(commit => {
          const message = commit.message.replace(/^(feat|fix|perf|refactor|docs|chore|test|ci|style|revert|breaking)(?:\([^)]*\))?!?:\s*/, '');
          return `<li><a href="https://github.com/${this.config.repository}/commit/${commit.shortHash}">${message}</a>${commit.scope ? ` <code>${commit.scope}</code>` : ''}</li>`;
        })
        .join('\n        ');

      return `
      <div class="group">
        <h3>${group.emoji} ${group.label}</h3>
        <ul>
          ${commitsHtml}
        </ul>
      </div>`;
    }).join('\n    ');

    const contributorsHtml = this.getContributors(release)
      .map(c => `<li>${c}</li>`)
      .join('\n        ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Release ${release.version}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #24292e; }
    h1 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    .meta { color: #586069; }
    .impact { padding: 0.5em 1em; border-radius: 4px; display: inline-block; font-weight: bold; }
    .group { margin: 1.5em 0; }
    .group h3 { margin-top: 0; }
    ul { padding-left: 2em; }
    li { margin: 0.3em 0; }
    code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .stats { color: #586069; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Release ${release.version}</h1>
  <p class="meta">
    <strong>Date:</strong> ${release.date}<br>
    <strong>Tag:</strong> <code>${release.tag}</code>
    ${release.previousTag ? `<br><strong>From:</strong> <code>${release.previousTag}</code>` : ''}
  </p>
  <blockquote>${release.summary}</blockquote>
  <div class="impact" style="background: ${impactColor}20; color: ${impactColor};">
    Impact: ${release.impactLevel.toUpperCase()} (${release.impactScore}/100)
  </div>
  <p class="stats">
    Commits: ${release.totalCommits} | Added: ${release.totalAdditions} | Deleted: ${release.totalDeletions}
  </p>
  ${groupsHtml}
  <div class="group">
    <h3>Contributors</h3>
    <ul>${contributorsHtml}</ul>
  </div>
</body>
</html>`;
  }

  private getImpactEmoji(level: string): string {
    switch (level) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📊';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  }

  private getImpactColor(level: string): string {
    switch (level) {
      case 'critical': return '#d73a4a';
      case 'high': return '#e36209';
      case 'medium': return '#d4a72c';
      case 'low': return '#6f42c1';
      default: return '#586069';
    }
  }

  private getContributors(release: ReleaseNote): string[] {
    const seen = new Set<string>();
    const contributors: string[] = [];
    for (const commit of release.groups.flatMap(g => g.commits)) {
      if (!seen.has(commit.author)) {
        seen.add(commit.author);
        contributors.push(commit.author);
      }
    }
    return contributors;
  }
}
