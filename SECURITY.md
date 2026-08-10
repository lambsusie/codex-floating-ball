# Security Policy

## Supported versions

Security-related fixes are generally applied to the latest maintained release of Codex Floating Ball.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Older releases | Best effort |

## Security model

Codex Floating Ball is designed as a local desktop companion for Codex users.

The application reads quota information from the locally installed Codex CLI. It is not intended to request, store, transmit, or upload your Codex Token.

Because the application runs on the user's machine, issues involving any of the following should be treated as potentially security-sensitive:

- Exposure of Codex authentication material.
- Unexpected transmission of local data.
- Unsafe handling of local files or processes.
- Command execution beyond what is required for normal quota retrieval.
- Packaging or update behavior that could enable arbitrary code execution.
- Dependency vulnerabilities that materially affect the desktop application.

## Reporting a vulnerability

Please do **not** include tokens, credentials, private logs, personal data, or exploit details in a public GitHub issue.

If GitHub Private Vulnerability Reporting is enabled for this repository, please use it.

If private reporting is not available, open a public issue containing only a minimal, non-sensitive description stating that you have identified a possible security issue and would like a private contact method. Do not include exploit steps or secrets in that issue.

Useful information for a security report includes:

- Affected version.
- Operating system.
- A concise description of the issue.
- Reproduction steps, shared privately.
- Potential impact.
- Suggested mitigation, if known.

## Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing vulnerability details.

## Scope clarification

Issues that only affect unsupported local modifications, unrelated third-party software, or normal behavior of the upstream Codex CLI may fall outside the scope of this project.
