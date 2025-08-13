# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern TypeScript CLI application for converting Ghostty terminal color themes to VS Code extensions. Features a clean, modular architecture with comprehensive testing, optimized performance (50.11 kB bundle), and 98 tests covering all core functionality.

## Architecture

### Core Components

- **CLI Entry**: `src/main.ts` - Meow-based CLI with comprehensive validation
- **Theme Engine**: `src/lib/theme-generator.ts` - Ghostty to VS Code theme conversion with full color mapping
- **File Generators**: `src/lib/file-generators.ts` - Complete VS Code extension structure generation
- **Main Controller**: `src/components/ThemeGenerator.tsx` - 177-line workflow orchestrator
- **Step Components**: `src/components/steps/` - Clean, focused step-based UI components
- **Utility Components**: `src/components/ui/` - Reusable UI elements

### Key Technologies

- **Runtime**: Bun 1.0+ or Node.js 18+ with native ES modules
- **Package Manager**: Bun (primary) with npm compatibility
- **Language**: TypeScript 5.3+ with strict mode enabled
- **UI Framework**: React 18 with Ink for terminal UI
- **Build System**: Vite 7.1+ producing ~53 kB optimized bundle
- **Testing**: Vitest 3.2+ with 98 comprehensive tests
- **Dependencies**: Minimal runtime dependencies (ink, meow, react)

## Development Commands

### Essential Commands

```bash
# Build for production
bun run build

# Development build with source maps
bun run build:dev

# Type checking (no emit)
bun run type-check

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Lint code
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Format code with Prettier
bun run format

# Check formatting
bun run format:check

# Clean build artifacts
bun run clean

# Start the CLI (builds first)
bun start

# Development mode
bun run dev
```

### Testing Specific Files

```bash
# Run specific test file
bun vitest src/test/lib/theme-generator.test.ts

# Run tests matching pattern
bun vitest --grep "parseThemeFile"

# Debug tests
bun vitest --reporter=verbose
```

## Code Standards

### TypeScript Configuration

- Strict mode enabled
- Path aliases configured (@/, @/components, @/utils, @/lib, @/context)
- Target: ES2020, Module: ESNext
- React JSX automatic runtime

### ESLint Rules

- TypeScript strict rules with @typescript-eslint
- React hooks rules enforced
- Max line length: 120 characters
- Trailing commas: always-multiline
- Semicolons: always
- Quotes: single (with template literals allowed)
- Indent: 2 spaces

### Prettier Configuration

- Single quotes
- Semicolons
- Print width: 100
- Arrow parens: avoid
- Trailing comma: ES5

## Project Structure

```
src/
├── components/              # React UI components (2 main + 6 steps)
│   ├── App.tsx             # Main application orchestrator
│   ├── ThemeGenerator.tsx  # Core workflow controller (177 lines)
│   ├── types.ts            # Component interfaces
│   ├── steps/              # Step-based workflow components
│   │   ├── FileStep.tsx    # File selection with validation
│   │   ├── ThemeStep.tsx   # Theme name configuration
│   │   ├── OptionsStep.tsx # Extension options setup
│   │   ├── ProcessStep.tsx # Generation progress display
│   │   ├── SuccessStep.tsx # Completion summary
│   │   └── ErrorDisplay.tsx # Error handling UI
│   └── ui/                 # Reusable UI components
│       ├── Header.tsx      # Consistent header
│       └── TextInput.tsx   # Validated text input
├── hooks/                  # Custom React hooks
│   └── useTextInput.tsx    # Input validation hook
├── lib/                    # Core business logic
│   ├── theme-generator.ts  # Ghostty to VS Code conversion
│   ├── file-generators.ts  # Extension file generation
│   └── utils-simple.ts     # File utilities
├── types/                  # TypeScript definitions
│   ├── theme.types.ts      # Theme-related types
│   ├── error.types.ts      # Error handling types
│   └── simplified.ts       # Application data types
├── config/                 # Configuration
│   └── limits.ts           # File size and validation limits
├── test/                   # Comprehensive test suite (98 tests)
│   ├── lib/                # Core logic tests
│   ├── hooks/              # Hook testing
│   └── integration/        # Integration tests
└── main.ts                 # CLI entry point
```

## Key Implementation Details

### Theme Parsing

The theme parser (`src/lib/theme-generator.ts`) handles:
- Ghostty theme file format (both `key=value` and `palette = N=#color` formats)
- Color validation with hex format verification and automatic # prefix addition
- Palette format parsing with complete 16-color support
- File size limits (1MB max) and line count limits for security
- Comprehensive error handling with custom ValidationError and FileProcessingError classes
- Theme name resolution from file metadata or filename

### Architecture Patterns

Clean, modular design with:
- **Step-based workflow**: Each step is a focused component with clear responsibilities
- **Custom hooks**: `useTextInput` for validated input handling
- **Type safety**: Comprehensive TypeScript interfaces and strict mode
- **Error boundaries**: Graceful error handling with recovery suggestions
- **Performance**: Minimal bundle size (50.11 kB) with optimized dependencies

### File Generation

Generates complete VS Code extension structure:
- **package.json**: Proper extension manifest with themes contribution
- **Theme JSON**: Complete workbench colors and syntax token colors mapping
- **Documentation**: README.md with installation and usage instructions
- **Metadata**: CHANGELOG.md, LICENSE, and VS Code launch configuration
- **Directory structure**: Proper themes/ folder with correctly named theme files

## Error Handling

- **Custom error classes**: ValidationError for input validation, FileProcessingError for file operations
- **Comprehensive validation**: File path validation, theme format validation, color format validation
- **Security measures**: Path traversal prevention, file size limits, line count limits
- **User-friendly messages**: Clear error descriptions with actionable suggestions
- **Graceful recovery**: ErrorDisplay component with retry mechanisms

## Testing Strategy

- **98 comprehensive tests** covering all core functionality
- **Unit tests**: Complete coverage of theme-generator, file-generators, and utils
- **Integration tests**: CLI validation patterns and workflow testing
- **Hook tests**: Custom hook behavior validation
- **Mock filesystem**: Safe testing without actual file operations
- **Performance testing**: Bundle size and startup time validation
- **Test framework**: Vitest with TypeScript support and fast execution

## Performance Metrics

- **Bundle Size**: ~53 kB production build (gzip: ~14 kB)
- **Test Coverage**: 98 tests covering all core functionality  
- **Build Time**: ~74ms for production builds (Bun + Vite)
- **Package Installation**: 2-4x faster with Bun vs npm
- **Dependencies**: Minimal runtime dependencies (ink, meow, react)
- **Memory Usage**: Efficient with 1MB file size limits
- **Startup Time**: 3x faster CLI initialization with Bun runtime

## Important Notes

- **Runtime**: Bun 1.0+ is recommended for optimal performance (Node.js 18+ still supported)
- **Package Manager**: Uses Bun for dependency management (npm compatibility maintained)
- **TypeScript First**: All code must use TypeScript with strict mode enabled
- **Error Handling**: Use existing ValidationError and FileProcessingError classes
- **Component Patterns**: Follow React hooks patterns with proper lifecycle management
- **Terminal Compatibility**: Maintain Ink component compatibility across terminals
- **Security**: File operations include path validation and size limits
- **Testing**: All new features require corresponding tests
- **Performance**: Maintain fast startup and minimal bundle size with Bun optimizations