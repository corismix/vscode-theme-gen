# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code Theme Generator is an interactive CLI tool for converting Ghostty terminal color schemes into VS Code theme extensions. Built with TypeScript, React (Ink), and Vite, it provides a full interactive experience for theme creation and extension generation.

**Key Technologies:**
- **Runtime:** Bun (primary), Node.js 18+ (compatibility)  
- **UI Framework:** React with Ink for terminal interfaces
- **Build System:** Vite with custom shebang plugin for CLI executable
- **CLI Framework:** Meow for argument parsing and help generation

## Development Commands

### Build and Development
- `bun start` - Build production version and run CLI
- `bun run dev` - Build development version and run CLI  
- `bun run build` - Production build (creates executable with shebang)
- `bun run build:dev` - Development build with debugging
- `bun run build:watch` - Watch mode for development

### Code Quality
- `bun run type-check` - TypeScript type checking (no emit)
- `bun run lint` - ESLint with zero warnings policy
- `bun run lint:fix` - Auto-fix linting issues
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check formatting without changes

### Testing
- `bun test` - Run all tests with verbose output
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate coverage reports
- `bun run test:ui` - Visual test interface

### Utility Commands
- `bun run clean` - Remove build artifacts and cache
- `bun run analyze:bundle` - Analyze bundle size and content

## Architecture

### Core Application Flow
1. **CLI Entry** (`main.ts`) - Argument parsing, validation, and React app initialization
2. **Component Tree** - Hierarchical React components using Ink for terminal UI
3. **Business Logic** - Theme parsing, color mapping, and VS Code extension generation
4. **File Operations** - Template-based file generation for complete extensions

### Key Architectural Components

**Theme Processing Pipeline:**
- `lib/theme-generator.ts` - Ghostty format parsing and VS Code theme compilation
- `lib/file-generators.ts` - Extension structure generation (package.json, docs, etc.)
- `lib/utils-simple.ts` - File system utilities and validation helpers

**UI Component Hierarchy:**
- `App.tsx` → `ThemeGenerator.tsx` → Step Components (`steps/`)
- Step-based workflow: File → Theme → Options → Advanced → Process → Success
- Reusable UI components in `ui/` (Header, TextInput, NavigationHints)

**Type System:**
- Centralized type definitions in `types/index.ts`
- Strong typing for Ghostty colors, VS Code themes, and form state
- Comprehensive error handling with custom error classes

### Build Configuration

**Vite Setup (`vite.config.ts`):**
- Custom shebang plugin for CLI executable creation
- Path aliases for clean imports (`@/`, `@/components`, etc.)
- External dependencies (Node.js builtins, React, Ink, Meow)
- ES modules with Node 18+ target

**Key Build Features:**
- Automatic shebang injection for CLI execution
- Bundle optimization with tree shaking and minification
- Development sourcemaps for debugging
- Incremental TypeScript compilation

### Security and Validation

**File Processing Security:**
- Path traversal prevention with normalized path validation
- File size limits and line count restrictions (see `config/limits.ts`)
- Input sanitization for theme files and user inputs
- Comprehensive validation with detailed error messages

**Theme File Parsing:**
- Support for multiple Ghostty formats (palette and key-value)
- Color validation with hex format enforcement
- Metadata extraction with size and content limits
- Graceful handling of malformed or incomplete files

## Development Guidelines

### Code Style and Standards
- **Zero-warning ESLint policy** - All warnings must be resolved before commits
- **Strict TypeScript** - No implicit any, unused parameters/variables not allowed
- **React patterns** - Functional components with hooks, proper state management
- **Error handling** - Custom error classes with detailed messages and suggestions

### File Organization Patterns
- **Barrel exports** - Use `index.ts` files for clean component and utility exports
- **Path aliases** - Always use `@/` imports for consistency and refactoring ease
- **Component co-location** - Related components and styles together in feature directories
- **Type safety** - Export types alongside implementations for reusability

### Testing Strategy
- **Unit tests** for core business logic (theme generation, file operations)
- **Integration tests** for CLI workflows and file system interactions
- **Coverage targets** - Focus on critical paths and error handling scenarios
- **Test utilities** in `src/test/setup.ts` for consistent test environment

### Common Development Tasks

**Adding new theme features:**
1. Update `GhosttyColors` interface in `types/index.ts`
2. Modify parsing logic in `theme-generator.ts`
3. Update VS Code color mappings in `buildVSCodeColors()`
4. Add corresponding tests in `test/lib/`

**Adding new UI components:**
1. Create component in appropriate `components/` subdirectory
2. Export from local `index.ts` for clean imports
3. Follow Ink patterns for terminal-specific rendering
4. Update step logic if component affects workflow

**Extending file generation:**
1. Add new generator functions to `file-generators.ts`
2. Update `GenerationOptions` interface for new options
3. Modify form handling in step components
4. Test generation pipeline thoroughly

### Performance Considerations
- **Bundle size** - CLI startup time is critical for user experience
- **Memory usage** - Large theme files and complex color calculations
- **File I/O** - Async operations with proper error handling and timeouts
- **Terminal rendering** - Ink optimization for responsive UI updates

### Debugging and Troubleshooting
- Use `bun run dev` for development builds with enhanced debugging
- Check `.tsbuildinfo` and clear with `bun run clean` for type issues
- Vite development mode provides detailed error messages and stack traces
- Test CLI behavior with various theme files in `test-themes/` directory