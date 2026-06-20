# prodtail

A production readiness and minimalism rules enforcer CLI for AI coding agents (Cursor, Claude Code, Cline, Roo, Windsurf, Antigravity).

`prodtail` checks your codebase for security, performance, design consistency, SEO metadata, and dead code, and provides a production-readiness audit score. It also injects agent rules configurations and safely prompts you before deleting files.

---

## Prerequisites

- **Node.js**: Version `22.6.0` or higher (which supports executing TypeScript directly using native type stripping).

## Installation

### 1. Global Installation (via NPM)
Once published to the NPM registry, it can be installed globally:
```bash
npm install -g prodtail
```
Or executed on-demand without installation:
```bash
npx prodtail init
```

### 2. Local Installation from Source
If sharing the folder directly or via a Git repository:
1. Clone or copy the folder to your machine.
2. In the `prodtail` directory, run:
   ```bash
   npm link
   ```
   *(If you get permission errors, you can create a local symlink in your user binary path, e.g., `ln -sf /path/to/prodtail/src/index.ts ~/.local/bin/prodtail`)*

---

## Commands

### `prodtail init`
Initializes a local rules configuration under `.prodtail/` and injects agent instructions into active directories:
- **Cursor**: `.cursor/rules/prodtail.mdc`
- **Claude Code**: `CLAUDE.md`
- **Cline**: `.clinerules` or `.clinerules/prodtail.md`
- **Roo**: `.roorules` or `.roorules/prodtail.md`
- **Windsurf**: `.windsurf/rules/prodtail.md`
- **Antigravity**: `AGENTS.md` and `.agents/rules/prodtail.md`

It also automatically updates the project's `.gitignore` to prevent rules files from being committed and pushed to GitHub.

### `prodtail scan`
Performs lightweight static checks across the codebase:
- **Security**: Hardcoded secrets, API keys, and client-side environment leaks.
- **Dependency**: Deprecated packages and unused modules.
- **Performance**: Nested loop bottlenecks and synchronous file system calls in source directories.
- **SEO & AI**: Missing metadata tags and heading structure deficits.
- **Design**: Hardcoded hex colors and inline styling violations.

### `prodtail audit`
Runs a deep static scan, calculates a **Production Readiness Score (0-100)**, and outputs a risk report with recommended fixes and executive insights. No code modifications are performed during the audit.

### `prodtail approve [file]`
Scans the project for unused files (or verifies a specific file), checks import references, and prompts you to approve deletion:
- **SAFE TO DELETE**: 0 imports detected.
- **UNCERTAIN**: Referenced in build/test files only.
- **HIGH RISK**: Actively imported in application source files.

---

## License

MIT
# prodtail
