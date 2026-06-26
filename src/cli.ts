#!/usr/bin/env node
/**
 * ReleaseForge CLI — Intelligent Changelog & Release Notes Generator
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import {
  DEFAULT_CONFIG,
  ChangelogConfig,
  OutputFormat,
  getGitTags,
  getGitLog,
  getLatestTag,
  buildReleaseNote
} from './index.js';
import { ChangelogGenerator } from './changelog-generator.js';
import { TemplateEngine } from './template-engine.js';

const VERSION = '1.0.0';

const program = new Command();

program
  .name('release-forge')
  .description('Intelligent changelog and release notes generator from git history')
  .version(VERSION);

// Generate command
program
  .command('generate')
  .description('Generate release notes from git history')
  .option('-r, --repository <path>', 'Git repository path', '.')
  .option('-f, --from <tag>', 'Starting tag (inclusive)')
  .option('-t, --to <tag>', 'Ending tag (inclusive, defaults to HEAD)')
  .option('-o, --output <format>', 'Output format: markdown, json, html', 'markdown')
  .option('-O, --output-file <path>', 'Write to file instead of stdout')
  .option('-c, --config <path>', 'Path to config file')
  .option('--template <path>', 'Path to custom Handlebars template')
  .option('--group-by <strategy>', 'Group strategy: auto, type, scope, impact', 'auto')
  .option('--no-breaking', 'Exclude breaking changes from output')
  .option('--no-scope', 'Exclude scope from commit messages')
  .action(async (options) => {
    try {
      const config = loadConfig(options);
      validateConfig(config);

      // Get tags
      void getGitTags(config.repository);
      const latestTag = getLatestTag(config.repository);

      let fromTag = config.fromTag;
      let toTag = config.toTag;

      // Auto-detect if not specified
      if (!fromTag && !toTag) {
        // Generate from last tag to HEAD
        if (latestTag) {
          fromTag = latestTag;
          toTag = 'HEAD';
        } else {
          // No tags, generate from all history
          fromTag = null;
          toTag = 'HEAD';
        }
      } else if (!fromTag && latestTag) {
        fromTag = latestTag;
      }

      // Get commits
      const commits = getGitLog(fromTag, toTag, config.repository);

      if (commits.length === 0) {
        console.error('No commits found in the specified range.');
        process.exit(1);
      }

      // Determine version
      const version = toTag ? toTag.replace('v', '') : 'latest';
      const date = new Date().toISOString().split('T')[0];
      const tag = toTag || `v${version}`;
      const previousTag = fromTag === 'HEAD' ? null : fromTag;

      // Build release note
      const release = buildReleaseNote(version, date, tag, previousTag, commits);

      // Generate output
      const generator = new ChangelogGenerator(config);
      let output: string;

      if (config.template) {
        const templateEngine = new TemplateEngine(config);
        output = templateEngine.render(release, config.template);
      } else {
        output = generator.generate(release);
      }

      // Output
      if (config.outputFile) {
        writeFileSync(config.outputFile, output, 'utf-8');
        console.error(`Release notes written to ${config.outputFile}`);
      } else {
        console.log(output);
      }

      console.error(`\nGenerated release notes for ${release.totalCommits} commit(s)`);
      if (release.breakingChanges.length > 0) {
        console.error(`  ${release.breakingChanges.length} breaking change(s) detected`);
      }
      console.error(`  Impact: ${release.impactLevel} (${release.impactScore}/100)`);

    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show statistics about the repository')
  .option('-r, --repository <path>', 'Git repository path', '.')
  .option('-f, --from <tag>', 'Starting tag')
  .option('-t, --to <tag>', 'Ending tag')
  .action((options) => {
    try {
      const repository = options.repository || '.';
      const tags = getGitTags(repository);
      const latestTag = getLatestTag(repository);

      console.log(`Repository: ${repository}`);
      console.log(`Tags: ${tags.length}`);
      if (tags.length > 0) {
        console.log(`Latest tag: ${tags[0]}`);
      }

      const fromTag = options.from || (latestTag && latestTag !== 'HEAD' ? latestTag : null);
      const toTag = options.to || 'HEAD';

      const commits = getGitLog(fromTag, toTag, repository);

      if (commits.length === 0) {
        console.log('\nNo commits found in the specified range.');
        return;
      }

      const totalAdditions = commits.reduce((s, c) => s + c.additions, 0);
      const totalDeletions = commits.reduce((s, c) => s + c.deletions, 0);

      // Count by type
      const typeCounts: Record<string, number> = {};
      for (const commit of commits) {
        typeCounts[commit.type] = (typeCounts[commit.type] || 0) + 1;
      }

      const breakingCount = commits.filter(c => c.isBreaking).length;
      const uniqueAuthors = new Set(commits.map(c => c.author)).size;

      console.log(`\nCommits: ${commits.length}`);
      console.log(`Authors: ${uniqueAuthors}`);
      console.log(`Added: ${totalAdditions}`);
      console.log(`Deleted: ${totalDeletions}`);
      console.log(`Breaking changes: ${breakingCount}`);
      console.log('\nBy type:');
      for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`);
      }

    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Config command
program
  .command('sample-config')
  .description('Print a sample configuration file')
  .action(() => {
    const config = {
      repository: '.',
      fromTag: null,
      toTag: null,
      outputFormat: 'markdown',
      outputFile: null,
      template: null,
      groupBy: 'auto',
      includeBreaking: true,
      includeScope: true,
      maxCommitsPerGroup: 50,
      customTypes: {}
    };
    console.log(JSON.stringify(config, null, 2));
  });

// Version command
program
  .command('version')
  .description('Show version')
  .action(() => {
    console.log(`release-forge v${VERSION}`);
  });

function loadConfig(options: any): ChangelogConfig {
  let config = { ...DEFAULT_CONFIG };

  // Override with CLI options
  if (options.repository) config.repository = options.repository;
  if (options.from) config.fromTag = options.from;
  if (options.to) config.toTag = options.to;
  if (options.output) config.outputFormat = options.output as OutputFormat;
  if (options.outputFile) config.outputFile = options.outputFile;
  if (options.template) config.template = options.template;
  if (options.groupBy) config.groupBy = options.groupBy as ChangelogConfig['groupBy'];
  if (options.breaking === false) config.includeBreaking = false;
  if (options.scope === false) config.includeScope = false;

  // Load from config file
  if (options.config) {
    try {
      const fileConfig = JSON.parse(readFileSync(options.config, 'utf-8'));
      config = { ...config, ...fileConfig };
    } catch (error) {
      console.error(`Failed to load config file: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  // Default outputFile to undefined if not specified
  if (!config.outputFile) config.outputFile = undefined;

  return config;
}

function validateConfig(config: ChangelogConfig): void {
  const validFormats = ['markdown', 'json', 'html'];
  if (!validFormats.includes(config.outputFormat)) {
    throw new Error(`Invalid output format: ${config.outputFormat}. Must be one of: ${validFormats.join(', ')}`);
  }

  const validGroupBy = ['auto', 'type', 'scope', 'impact'];
  if (!validGroupBy.includes(config.groupBy)) {
    throw new Error(`Invalid group-by strategy: ${config.groupBy}. Must be one of: ${validGroupBy.join(', ')}`);
  }

  if (config.outputFile && config.template) {
    if (!TemplateEngine.validateTemplate(config.template)) {
      throw new Error(`Invalid template file: ${config.template}`);
    }
  }
}

program.parse();
