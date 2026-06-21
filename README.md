# OMK — Open Multi-Agent Kit

![OMK cyberpunk terminal control room](docs/assets/omk-readme-hero.png)

**A terminal-first coding agent for orchestrating tools, skills, hooks, MCP servers, and long-lived development sessions.**

OMK publishes the `omk` CLI from `packages/coding-agent`. It is designed for engineers who want a local, inspectable agent runtime with explicit tools, reproducible sessions, and extension points instead of a closed workflow.

> Note: accidental foundation/control-plane CLI builds published as `0.78.x`, `0.79.3`, `0.80.0`, and `0.80.2` are deprecated on npm. Current releases ship the OMK coding-agent surface.

## Install

```bash
npm install -g open-multi-agent-kit
omk --version
omk
```

## What OMK includes

- **Interactive coding CLI** — chat, edit, run commands, review diffs, and continue sessions from the terminal.
- **Tool runtime** — built-in file, shell, search, edit, image, and orchestration tools with policy hooks.
- **Skills and prompts** — reusable workflows for coding, review, research, docs, UI, and release work.
- **MCP integration** — connect external systems through Model Context Protocol servers.
- **Extensions** — add commands, tools, themes, UI widgets, providers, and lifecycle hooks.
- **Session memory** — resumable session files, compaction, branch summaries, and digest helpers.
- **Safety controls** — command gates, sandbox policies, package admission checks, and auditable runtime events.

## Packages

| Package | Description |
| --- | --- |
| `open-multi-agent-kit` | Published `omk` CLI package. |
| `packages/coding-agent` | CLI source, tools, skills/hooks runtime, themes, sessions, and package manager. |
| `packages/ai` | Unified LLM provider API used by the CLI. |
| `packages/agent` | Agent runtime core. |
| `packages/tui` | Terminal UI library. |

## Development

```bash
npm install --ignore-scripts
npm run check
./test.sh
```

Useful package-level checks:

```bash
npm --prefix packages/coding-agent run test -- test/resource-loader.test.ts
npm --prefix packages/ai run test -- test/provider-network.test.ts
```

## Documentation

- `packages/coding-agent/README.md` — CLI usage and configuration
- `packages/coding-agent/docs/extensions.md` — extension API
- `packages/coding-agent/docs/packages.md` — package discovery and install behavior
- `packages/coding-agent/docs/themes.md` — terminal themes
- `packages/coding-agent/docs/sdk.md` — SDK integration

## Security

OMK runs with the permissions of the launching user/process. Use OS sandboxing, containers, or a restricted environment when running untrusted tasks.

Context files such as `AGENTS.md` and `CLAUDE.md` are loaded as parent-to-child project instructions. Treat project-local instructions and third-party extensions as untrusted input unless you control the source. See `SECURITY.md` and `packages/coding-agent/docs/usage.md` for operational guidance.

## License

MIT
