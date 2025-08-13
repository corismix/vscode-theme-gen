# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-08-13

### Fixed
- Fixed CLI help text to show correct command name `vscode-theme-gen` instead of `theme-generator`
- Updated GitHub repository URLs in error messages
- Added executable permissions to built binary in publish process

## [1.0.0] - 2024-08-13

### Added
- Interactive CLI tool for converting Ghostty terminal color themes to VS Code extensions
- Step-by-step wizard built with React and Ink for terminal UI
- Complete VS Code extension generation with proper manifest structure
- Theme validation with comprehensive error handling
- Support for both `palette = N=#color` and direct color formats
- TypeScript-first architecture with strict mode enabled
- Comprehensive test suite with 98 tests covering core functionality
- Modern build system using Vite with optimized bundle size (~110KB)
- Real-time theme file validation and color format checking
- Custom error classes with helpful recovery suggestions
- Professional documentation generation for generated extensions
- Command-line mode with full configuration options
- Security features including file size limits and path validation

### Features
- **Interactive Mode**: Clean multi-step workflow for theme generation
- **Command Line Mode**: Full CLI support with comprehensive options
- **Theme Processing**: Support for Ghostty theme format with complete color mapping
- **Extension Generation**: Creates complete VS Code extension structure
- **Performance**: Optimized bundle with fast startup and minimal dependencies
- **Developer Experience**: Modern tooling with TypeScript, ESLint, Prettier
- **Testing**: Comprehensive test coverage with Vitest
- **Documentation**: Professional README, changelog, and extension documentation

### Technical Details
- Node.js 18+ and Bun 1.0+ support
- ES modules with modern import/export syntax
- React 18 with Ink for terminal UI components
- TypeScript 5.3+ with strict type checking
- Vite build system for optimal bundling
- Comprehensive error handling and validation
- Minimal runtime dependencies (ink, meow, react)