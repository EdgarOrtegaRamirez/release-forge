/**
 * Core data models for ReleaseForge
 */

export type CommitType = 'feat' | 'fix' | 'perf' | 'refactor' | 'docs' | 'chore' | 'test' | 'ci' | 'style' | 'revert' | 'breaking' | 'other';

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type OutputFormat = 'markdown' | 'json' | 'html';

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  body: string | null;
  author: string;
  date: string;
  type: CommitType;
  scope: string | null;
  isBreaking: boolean;
  files: string[];
  additions: number;
  deletions: number;
}

export interface ReleaseGroup {
  type: string;
  label: string;
  emoji: string;
  commits: Commit[];
  impact: ImpactLevel;
}

export interface ReleaseNote {
  version: string;
  date: string;
  tag: string;
  previousTag: string | null;
  groups: ReleaseGroup[];
  summary: string;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  breakingChanges: Commit[];
  impactScore: number;
  impactLevel: ImpactLevel;
}

export interface ImpactScore {
  score: number;
  level: ImpactLevel;
  factors: string[];
}

export interface ChangelogConfig {
  repository: string;
  fromTag: string | null;
  toTag: string | null;
  outputFormat: OutputFormat;
  outputFile?: string;
  template: string | null;
  groupBy: 'type' | 'scope' | 'impact' | 'auto';
  includeBreaking: boolean;
  includeScope: boolean;
  maxCommitsPerGroup: number;
  customTypes: Record<string, { label: string; emoji: string }>;
}

export const DEFAULT_CONFIG: ChangelogConfig = {
  repository: '.',
  fromTag: null,
  toTag: null,
  outputFormat: 'markdown',
  template: null,
  groupBy: 'auto',
  includeBreaking: true,
  includeScope: true,
  maxCommitsPerGroup: 50,
  customTypes: {}
};

export const TYPE_CONFIG: Record<CommitType, { label: string; emoji: string }> = {
  feat: { label: 'Features', emoji: '✨' },
  fix: { label: 'Bug Fixes', emoji: '🐛' },
  perf: { label: 'Performance Improvements', emoji: '⚡' },
  refactor: { label: 'Refactoring', emoji: '♻️' },
  docs: { label: 'Documentation', emoji: '📝' },
  chore: { label: 'Chores', emoji: '🔧' },
  test: { label: 'Tests', emoji: '🧪' },
  ci: { label: 'CI/CD', emoji: '🔄' },
  style: { label: 'Style Changes', emoji: '🎨' },
  revert: { label: 'Reverts', emoji: '⏪' },
  breaking: { label: 'Breaking Changes', emoji: '💥' },
  other: { label: 'Other Changes', emoji: '📦' }
};

export const BREAKING_KEYWORDS = [
  'BREAKING CHANGE',
  'BREAKING-CHANGE',
  'breaking change',
  'BREAKING',
  '!: ',
  '!:'
];

export const SCOPE_PATTERN = /^(?:([a-zA-Z0-9_-]+):)?(.+)$/;
export const TYPE_PATTERN = /^(feat|fix|perf|refactor|docs|chore|test|ci|style|revert|breaking)(?:\(([^)]+)\))?!?:\s+(.+)$/;
