# ReleaseForge

Intelligent changelog and release notes generator from git history. Generates polished release notes with smart commit grouping, automatic breaking change detection, impact scoring, and multiple output formats.

## Features

- **Smart Commit Grouping** — Groups commits by type, scope, impact, or auto-detect
- **Breaking Change Detection** — Identifies BREAKING CHANGE markers, `!:` syntax, and diff patterns
- **Impact Scoring** — Calculates a 0-100 impact score based on breaking changes, features, fixes, and code volume
- **Multiple Output Formats** — Markdown, JSON, and HTML output
- **Custom Templates** — Handlebars template support for custom output
- **CLI & Library** — Use as a CLI tool or import as a Node.js library
- **Git History Analysis** — Analyzes full git history with file-level stats

## Quick Start

### Installation

```bash
npm install release-forge
```

### CLI Usage

```bash
# Generate markdown changelog from last tag to HEAD
release-forge generate

# Generate from specific tags
release-forge generate --from v1.0.0 --to v2.0.0

# Output as JSON
release-forge generate --output json

# Output to file
release-forge generate --output-file CHANGELOG.md

# Show repository stats
release-forge stats

# View sample config
release-forge sample-config
```

### Library Usage

```typescript
import { getGitLog, buildReleaseNote } from 'release-forge';
import { ChangelogGenerator } from 'release-forge';

const commits = getGitLog('v1.0.0', 'v2.0.0', '/path/to/repo');
const release = buildReleaseNote('2.0.0', '2026-06-26', 'v2.0.0', 'v1.0.0', commits);

const generator = new ChangelogGenerator({
  repository: 'user/repo',
  outputFormat: 'markdown'
});

const changelog = generator.generate(release);
```

## CLI Reference

### `generate` — Generate release notes

| Option | Description | Default |
|--------|-------------|---------|
| `-r, --repository <path>` | Git repository path | `.` |
| `-f, --from <tag>` | Starting tag | auto (latest tag) |
| `-t, --to <tag>` | Ending tag | `HEAD` |
| `-o, --output <format>` | Output format: markdown, json, html | `markdown` |
| `-O, --output-file <path>` | Write to file instead of stdout | stdout |
| `-c, --config <path>` | Path to config file | — |
| `--template <path>` | Custom Handlebars template | — |
| `--group-by <strategy>` | Group strategy: auto, type, scope, impact | `auto` |
| `--no-breaking` | Exclude breaking changes | — |
| `--no-scope` | Exclude scope from messages | — |

### `stats` — Show repository statistics

| Option | Description | Default |
|--------|-------------|---------|
| `-r, --repository <path>` | Git repository path | `.` |
| `-f, --from <tag>` | Starting tag | latest tag |
| `-t, --to <tag>` | Ending tag | `HEAD` |

## Configuration

Create a `.release-forge.json` file:

```json
{
  "repository": ".",
  "fromTag": null,
  "toTag": null,
  "outputFormat": "markdown",
  "outputFile": null,
  "template": null,
  "groupBy": "auto",
  "includeBreaking": true,
  "includeScope": true,
  "maxCommitsPerGroup": 50,
  "customTypes": {}
}
```

## Impact Scoring

ReleaseForge calculates an impact score (0-100) based on:

| Factor | Max Points |
|--------|-----------|
| Breaking changes | 40 |
| New features | 25 |
| Performance improvements | 15 |
| Bug fixes | 10 |
| File change volume | 10 |

Impact levels: `critical` (70+), `high` (50+), `medium` (30+), `low` (10+), `info` (<10)

## Commit Conventions

ReleaseForge supports conventional commits and auto-detects:

- `feat:` — Features
- `fix:` — Bug fixes
- `perf:` — Performance improvements
- `refactor:` — Code refactoring
- `docs:` — Documentation changes
- `chore:` — Maintenance tasks
- `test:` — Test additions/changes
- `ci:` — CI/CD changes
- `style:` — Code style changes
- `revert:` — Reverted commits
- `BREAKING CHANGE` or `!:` — Breaking changes

## Architecture

```
src/
├── cli.ts              — CLI entry point (Commander.js)
├── index.ts            — Public API exports
├── models.ts           — TypeScript interfaces & types
├── git-parser.ts       — Git log parsing & commit extraction
├── commit-analyzer.ts  — Impact scoring, grouping, release notes
├── changelog-generator.ts — Markdown/JSON/HTML output
└── template-engine.ts  — Handlebars template support
```

## License

MIT
