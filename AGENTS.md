# AGENTS.md — Notes for AI Agents

## Project Overview
ReleaseForge is a TypeScript/Node.js CLI tool that generates intelligent changelogs and release notes from git history. It supports smart commit grouping, breaking change detection, impact scoring, and multiple output formats (markdown, JSON, HTML).

## Tech Stack
- **Language**: TypeScript 5.8+ (compiled to CommonJS)
- **Runtime**: Node.js 18+
- **Build**: `tsc` (no bundler)
- **Test**: Vitest
- **CLI**: Commander.js
- **Templates**: Handlebars

## Project Structure
```
src/
├── cli.ts              — CLI entry point
├── index.ts            — Barrel exports
├── models.ts           — Data types & interfaces
├── git-parser.ts       — Git history parsing
├── commit-analyzer.ts  — Impact scoring & grouping
├── changelog-generator.ts — Output generation
└── template-engine.ts  — Handlebars templates
tests/                  — Vitest test files
```

## Build Commands
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript (tsc)
npm test             # Run tests (vitest run)
npm run dev          # Run with tsx (hot reload)
```

## Key Patterns
- Commits are parsed from `git log` output using custom format strings
- Impact scoring uses weighted factors (breaking: 40pts, features: 25pts, etc.)
- Grouping uses a Map<string, Commit[]> with deterministic sort order
- Output generators are format-specific methods in ChangelogGenerator
- CLI uses Commander.js with subcommands (generate, stats, sample-config, version)

## Security Notes
- No network requests — all data from local git repository
- No file writes except explicit --output-file flag
- Input validation on CLI options (format, group-by strategy)
- Template validation prevents injection via compile-time check

## Testing
- Tests in `tests/` directory use Vitest
- Run `npm test` to execute all tests
- Key test files: git-parser.test.ts, commit-analyzer.test.ts, changelog-generator.test.ts
- 38 tests covering parsing, analysis, grouping, and output generation

## CI
- GitHub Actions in `.github/workflows/ci.yml`
- Runs `npm install`, `npm run build`, `npm test` on push/PR
- Node 18, 20, 22 matrix

## Commit Convention
This project uses conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `test:` — Tests
- `refactor:` — Code refactoring
- `chore:` — Maintenance
