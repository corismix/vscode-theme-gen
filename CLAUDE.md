# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code Theme Generator - an interactive CLI tool that converts Ghostty terminal color schemes into complete, publishable VS Code theme extensions. Built with TypeScript, React (Ink) for the terminal UI, and Vite for bundling. Runtime is Bun (Node 18+ also supported).

## Development Commands

- `bun run dev` - Development build + run (use this while iterating)
- `bun start` - Production build + run
- `bun run build` - Production build only (`vite build`, outputs `dist/index.js` with a shebang injected)
- `bun run build:watch` - `tsc --watch` + `vite build --watch` in parallel
- `bun run type-check` - TypeScript validation, no emit
- `bun run lint` / `bun run lint:fix` - ESLint over `src` (zero-warning policy: `--max-warnings 0`)
- `bun run format` / `bun run format:check` - Prettier over `src/**/*.{ts,tsx,json,md}`
- `bun test` - Run full Vitest suite (verbose reporter)
- `bun run test:watch` - Vitest watch mode
- `bun run test:coverage` - Coverage report (v8 provider; 80% threshold on branches/functions/lines/statements)
- `bun run test:ui` - Vitest visual UI
- `bun run clean` - Remove `dist` and `.tsbuildinfo`

**Running a single test file:** `bun vitest run src/test/lib/theme-generator.test.ts`
**Running a single test by name:** `bun vitest run -t "test name substring"`

Tests live under `src/test/` (`src/test/lib/` for unit tests of `src/lib/*`, `src/test/integration/` for CLI/workflow tests), not in the top-level `tests/` directory, which holds sample Ghostty fixture files.

## Architecture

**Entry point:** `src/main.ts` parses CLI flags with `meow`, validates them, derives initial `FormData` (and optionally a `skipToStep`), then renders `App` via Ink's `render()`. It also wires `SIGINT`/`SIGTERM` and uncaught-exception/rejection handlers to unmount cleanly.

**Wizard flow:** `src/components/App.tsx` → `src/components/ThemeGenerator.tsx` is the orchestrator. It owns all wizard state (`currentStep: Step`, `formData: FormData`, `themeData: ThemeData | null`, `error`) and step transitions (`goToNext`/`goToBack`), and renders the active step from `src/components/steps/`:

1. `file` (`FileStep`) - select/validate the Ghostty theme file (`.ghostty`, `.txt`, `.toml`, `.conf`, `.config`); calls `parseThemeFile` then `buildVSCodeTheme` on advance
2. `theme` (`ThemeStep`) - review parsed theme, set name/metadata
3. `options` (`OptionsStep`) - extension metadata (description, publisher, version, license, output path); validates publisher format and output path before advancing
4. `advanced` (`AdvancedOptionsStep`) - toggles for README/CHANGELOG/quickstart/gitignore generation, etc.
5. `preview` (`PreviewStep`) - color swatches (via `extractColorPalette`), a sample syntax-highlighted snippet using the real token colors, and a full recap of every choice before generation
6. `process` (`ProcessStep`) - runs generation, calls `onSuccess`/`onError`
7. `success` (`SuccessStep`) / `error` (`ErrorDisplay`) - terminal states; on error, ESC returns to `preview` (the step generation is always launched from), not `file`

Global keyboard handling (ESC to go back, `?` for help overlay, Ctrl+C to exit) lives in `ThemeGenerator` via Ink's `useInput`. CLI flags can skip ahead in the wizard: `--input` alone jumps to `theme`, `--input` + `--name` jumps to `options` (wired via `initialData.skipToStep` in a mount-time effect in `ThemeGenerator`).

**Core conversion logic** (`src/lib/theme-generator.ts`, the largest module): parses Ghostty theme files (palette-style and key-value formats, including hyphenated keys like `cursor-color`/`selection-background`) into `GhosttyColors`, with validation/sanitization against limits from `src/config`, then maps them to a full `VSCodeTheme` (workbench colors + `tokenColors` for syntax highlighting) via semantic color-role mapping. The theme's accent color is derived from `cursor-color` (falling back to palette red) and used for brand/interactive UI (buttons, badges, focus borders, active-tab indicators) while genuinely semantic colors (errors, warnings, git-deleted, debug stop) stay tied to the palette's red/yellow/etc regardless of accent; `selection-background`/`selection-foreground` drive editor/terminal selection colors the same way. Color math includes hand-rolled HSL-space `lighten`/`darken` (perceptually correct, unlike naive RGB interpolation) and WCAG contrast helpers (`relativeLuminance`, `contrastRatio`, `ensureContrast`, `isLightBackground`) — the latter is applied to a handful of readability-critical foreground/background pairs (activity bar, sidebar, tabs, status bar, title bar) to guarantee AA contrast, and also determines the generated theme's `type` (`light`/`dark`) from the actual background luminance rather than hardcoding `dark`.

**Extension scaffolding** (`src/lib/file-generators.ts`): turns a `VSCodeTheme` + `GenerationOptions` into the full set of extension files (`package.json`, theme JSON, README, CHANGELOG, quickstart guide, icon, `.gitignore`/`.vscodeignore`) and writes them to the output path. Output-path validation guards against path traversal (see the `allowOutsideCwd` flag, which opts out of the cwd-containment check).

**Centralized limits/config** (`src/config/`, documented in `src/config/README.md`): all magic numbers (file size caps, string length caps, timeouts, allowed extensions, defaults like theme version/license) live in `limits.ts` and are overridable via `THEME_*` environment variables. Always source limits from here rather than hardcoding.

**Types** (`src/types/index.ts`): single consolidated file for `FormData`, `GhosttyColors`, `VSCodeTheme`/`VSCodeThemeColors`, `GenerationOptions`/`GenerationResults`, error classes (`ValidationError`, `FileProcessingError`, `GenerationError`, `SecurityError`), and Ink-specific UI types (`InkKeyEvent`, `TextInputHook`).

**Build:** Vite bundles `src/main.ts` to a single ESM file (`dist/index.js`), externalizing Node builtins plus `react`/`ink`/`meow`, and a custom plugin prepends the `#!/usr/bin/env node` shebang. `NODE_ENV` (`development`/`production`) controls sourcemaps and is set by the `dev`/`build` scripts.

## Code Conventions

- Zero ESLint warnings policy (`--max-warnings 0` is enforced in CI-equivalent local runs)
- Use `@/` path aliases for internal imports (`@/components`, `@/lib`, `@/config`, `@/types`) rather than relative paths across module boundaries — configured in both `tsconfig.json` and `vite.config.ts`/`vitest.config.ts`, so keep new aliases in sync across all three if added
- Components in `src/components/` (`steps/` for wizard steps, `ui/` for reusable pieces), business logic in `src/lib/`, shared types in `src/types/index.ts`, tunable limits in `src/config/`
- Barrel exports via `index.ts` (e.g. `src/components/steps/index.ts`, `src/components/ui/index.ts`)
- Strict TypeScript (`strict`, `noUnusedLocals`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` all on) — avoid `any` and non-null assertions (both flagged as warnings)
