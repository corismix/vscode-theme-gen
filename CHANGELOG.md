# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-18

### Changed
- **BREAKING**: Complete rewrite of theme generation algorithm based on Eidolon Root theme analysis
- **BREAKING**: File naming changed from `{package-name}-color-theme.json` to `{name}-theme.json`
- **Algorithm**: Complete overhaul to use direct palette color mapping instead of complex derivations
- **Color Mapping**: Fixed editor background to use `palette[0]` (color0) instead of background color
- **Background Hierarchy**: Activity/Sidebar/Status now use actual background color, Editor/Panel/Terminal use palette[0]

### Added  
- **650+ VS Code Color Properties**: Comprehensive coverage of all VS Code UI elements
- **Enhanced Token Colors**: Direct palette mapping with proper scope assignments:
  - Comments: palette[8] (brightBlack) with italic
  - Keywords: palette[10] (brightGreen)  
  - Strings: palette[1] (red)
  - Functions: palette[12] (brightBlue)
  - Classes: palette[5] (magenta)
  - Numbers: palette[9] (brightRed)
  - Operators: palette[6] (cyan)
  - Tags: palette[11] (brightYellow)
- **JSON Rainbow Colors**: 9-level color cycling for nested JSON structures
- **Special Case Handling**: `root.txt` → `eidolon-root` theme name resolution
- **Opacity Helper**: Consistent `withOpacity()` function for all transparency effects

### Fixed
- **Color Accuracy**: Themes now generate with palette-first approach matching professional themes
- **Semantic Colors**: Consistent error=red, warning=yellow, success=green, info=blue mapping
- **UI Consistency**: All VS Code interface elements properly styled with appropriate colors
- **Opacity Calculations**: Standardized opacity values (20%, 40%, 60%, 80%) throughout
- **Background Variants**: Proper calculated variants (widgets, inputs) based on palette[0]

### Technical  
- **Performance**: Removed complex color derivation functions for direct palette access
- **Maintainability**: Simplified codebase with clearer color mapping logic
- **Type Safety**: All TypeScript errors resolved with proper type definitions

## [1.0.2] - 2024-08-13

### Fixed
- **CRITICAL**: Fixed `bunx vscode-theme-gen` not executing by removing conditional entry point check
- Improved CLI compatibility across package managers (bunx, npx, yarn dlx)
- Fixed Node.js built-in module resolution for CLI execution

### Changed
- Simplified entry point to always execute main function for CLI tools
- Updated Vite configuration for better Node.js target compatibility
- Enhanced external dependency handling for CLI tools

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