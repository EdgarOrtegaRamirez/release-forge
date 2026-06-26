# Security Policy

## Security Measures

ReleaseForge is a local-first tool that reads git history from your repository. It does not make network requests or transmit any data externally.

### Input Validation
- All CLI arguments are validated against allowed values
- File paths are validated for existence and readability
- Template files are validated for syntax before compilation

### Data Handling
- No data is transmitted externally
- All processing happens locally
- No caching of sensitive information
- Git operations use safe command execution with timeout limits

### Dependencies
- Only 4 production dependencies: `commander`, `git-parse`, `handlebars`, `semver`
- All dependencies are pinned to specific versions
- No transitive dependencies with known vulnerabilities

## Reporting Security Issues

If you discover a security vulnerability, please open a private security advisory on GitHub.
