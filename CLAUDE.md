# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Code navigation: CodeGraph first

This repo is indexed by CodeGraph (`.codegraph/` at the repo root; `apps/web/.codegraph/` for the web app). Always navigate code with it BEFORE grep, find, or Read:

- Use the `codegraph_explore` MCP tool for any question about code: how X works, where X is, bugs, call paths, blast radius of a change. Pass a natural-language question or symbol/file names. Pass `projectPath` for `apps/web` to query the web index.
- Before editing a symbol or file, call `codegraph_explore` with its name or path. It returns current line-numbered source (safe to `Edit` from), callers and affected code. Do not Read the same file again.
- Shell fallback when the MCP tool is unavailable: `codegraph explore "<symbol names or question>"`.
- Trust its results; do not re-verify with grep. Use Read/Grep only for details it does not cover, or for non-code files it does not index (configs, docs, Prisma schema, `.env.example`).
- Do not delegate code lookups to a separate search sub-agent. Call `codegraph_explore` directly.
- Do not run `codegraph init` or re-index unless the user asks.
