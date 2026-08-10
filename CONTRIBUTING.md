# Contributing to Codex Floating Ball

Thank you for your interest in improving Codex Floating Ball.

This project welcomes bug reports, feature requests, documentation improvements, and pull requests. Because the application interacts with a locally installed Codex environment, please avoid including private tokens, credentials, local account data, or other sensitive information in issues, logs, screenshots, or pull requests.

## Ways to contribute

You can help by:

- Reporting reproducible bugs.
- Suggesting focused feature improvements.
- Improving Windows or macOS behavior.
- Improving documentation or translations.
- Fixing UI, quota-display, refresh, build, or packaging issues.
- Testing changes across supported platforms.

## Before opening an issue

Please check whether a similar issue already exists.

For a bug report, include:

- Operating system and version.
- Codex CLI or Codex desktop environment used.
- Codex Floating Ball version.
- Steps to reproduce the problem.
- Expected behavior.
- Actual behavior.
- Relevant logs or screenshots, with sensitive information removed.

For a feature request, explain:

- The problem or workflow limitation.
- The proposed behavior.
- Why the change would be useful to Codex Floating Ball users.

## Local development

Requirements:

- Node.js and npm.
- Windows 10/11 or macOS 12+ for platform-specific testing.
- A locally installed and signed-in Codex CLI or Codex desktop environment for quota-related functionality.

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Run tests:

```bash
npm test
```

Build Windows:

```powershell
npm run build:win
```

Build macOS:

```bash
npm run build:mac
```

## Pull request workflow

1. Fork the repository or create a working branch.
2. Make a focused change.
3. Run relevant tests and perform manual validation.
4. Update documentation if user-visible behavior changes.
5. Open a pull request with a clear description of the problem and solution.

Please keep pull requests reasonably scoped. Large unrelated changes are easier to review when split into separate PRs.

## Pull request checklist

Before submitting a PR, please confirm that:

- [ ] The change has a clear purpose.
- [ ] Existing functionality has been checked for regressions.
- [ ] `npm test` passes when applicable.
- [ ] Windows/macOS behavior has been considered when relevant.
- [ ] No credentials, tokens, or private local data are included.
- [ ] User-facing documentation has been updated when necessary.
- [ ] License and attribution from the upstream project remain intact.

## Security issues

Do not publish sensitive security details in a public issue. Please read [SECURITY.md](SECURITY.md) first.

## License

By contributing, you agree that your contributions will be distributed under the repository's MIT License.
