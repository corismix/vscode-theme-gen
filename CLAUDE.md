# CLAUDE.md

## Project Overview

VS Code Theme Generator - Interactive CLI tool that converts Ghostty terminal color schemes into VS Code theme extensions.

**Tech Stack:** TypeScript, React (Ink), Vite, Bun
**Key Files:**
- `main.ts` - CLI entry point
- `lib/theme-generator.ts` - Core theme conversion logic
- `lib/file-generators.ts` - VS Code extension file generation
- `components/steps/` - UI workflow components

## Development

**Common Commands:**
- `bun start` - Build and run CLI
- `bun run dev` - Development mode
- `bun test` - Run tests
- `bun run type-check` - TypeScript validation

**Architecture:**
- React components with Ink for terminal UI
- Step-based workflow (File → Theme → Options → Generate)
- Vite builds CLI executable with custom shebang plugin
- Path aliases: `@/` for src, `@/components`, etc.

## Code Conventions

- Zero ESLint warnings policy
- Use `@/` imports for all internal modules
- Components in `components/`, utilities in `lib/`
- Types centralized in `types/index.ts`
- Barrel exports via `index.ts` files