# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code theme generator CLI that converts Ghostty terminal color themes (.txt files) into complete VS Code extensions. Built with React + Ink for an interactive terminal UI.

## Architecture

### Core Components
- **theme-generator-cli.js**: Entry point, meow CLI setup, validation, and Ink app initialization
- **components/App.js**: Main React component managing step-based UI flow (Welcome → File Selection → Theme Config → Extension Options → Progress → Success)
- **lib/theme-generator.js**: Core theme conversion logic - parses .txt files, maps colors to VS Code theme JSON structure
- **lib/file-generators.js**: Generates extension files (package.json, README, theme JSON, etc.)
- **lib/utils.js**: File validation, path utilities, recent files management

### UI Flow
Interactive multi-step wizard using Ink components:
1. Welcome screen with recent files
2. File selector with live validation
3. Theme configuration (name, description, version)
4. Extension options (output path, file generation flags)
5. Progress indicator during generation
6. Success screen with next steps

## Development Commands

```bash
# Run interactive CLI
npm start
# or
npm run dev

# Run with command-line arguments
npm start -- --input theme.txt --name "My Theme"

# Install dependencies
npm install
```

## Key Technical Details

### Babel Configuration
Uses `babel-register-esm` for ES modules support with JSX transformation. The `.babelrc.json` configures React preset.

### Color Mapping
Ghostty format → VS Code theme:
- `color0-15`: Terminal 16-color palette
- `background/foreground`: Editor colors
- `cursor/selection_*`: Cursor and selection colors

The `roleMap()` function assigns semantic roles (black, red, green, etc.) and `buildColors()` maps to VS Code workbench/syntax colors.

### File Generation
Creates complete extension structure:
- `package.json` with contribution points
- Theme JSON in `themes/` directory
- README, CHANGELOG, LICENSE files
- `.vscode/launch.json` for debugging
- Optional quickstart guide

### Recent Files
Stores recently used theme files in `.vscode-theme-generator-recent.json` for quick access.

## Input File Format

Expects Ghostty terminal theme .txt files:
```
background=#1a1a1a
foreground=#e0e0e0
color0=#000000
color1=#ff0000
# ... colors 2-15
```

## Testing Theme Generation

To test theme generation without the interactive UI:
```bash
node generate_theme_from_txt.js --in input.txt --out output.json --name "Theme Name"
```