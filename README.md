# VS Code Theme Generator CLI

A professional-grade TypeScript CLI tool for converting Ghostty terminal color themes into complete VS Code extensions. Built with modern React architecture and TweakCC-quality design patterns.

![Theme Generator Demo](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=VS+Code+Theme+Generator+CLI)

## Features

- 🎨 **Interactive Split-Pane UI**: Professional wizard with real-time theme preview
- 🌈 **Live Color Preview**: Advanced color visualization with syntax highlighting
- 📦 **Complete Extension Generation**: Full VS Code extension structure with TypeScript support
- ⚡ **TypeScript Architecture**: Type-safe development with modern React patterns
- 🔄 **Smart State Management**: React Context API with persistent configuration
- 🎯 **Professional CLI Experience**: Keyboard-first navigation with accessibility support
- 🛡️ **Comprehensive Error Handling**: Graceful error recovery with helpful messages
- 📊 **Advanced Validation**: Real-time input validation with detailed feedback
- 🎪 **Notification System**: Professional toast notifications and status updates

## Installation

### From NPM (when published)
```bash
npm install -g vscode-theme-generator-cli
theme-generator
```

### Development Install
```bash
git clone <repository>
cd vscode-theme-generator
npm install
npm run build
npm start
```

## Usage

### Interactive Mode
```bash
# Start the interactive CLI
npm start

# Development mode with hot reloading
npm run dev
```

The interactive CLI features a sophisticated multi-step wizard:

1. **Welcome Screen**: Recent files management with quick access
2. **File Selector**: Advanced file picker with validation and preview
3. **Theme Configurator**: Split-pane configuration with live preview
4. **Extension Options**: Professional output configuration
5. **Progress Indicator**: Real-time generation progress with status updates
6. **Success Screen**: Completion summary with next steps

### Command Line Mode
```bash
# Basic usage
theme-generator --input my-theme.txt --name "My Theme"

# Full configuration
theme-generator \
  --input ghostty-theme.txt \
  --output ./my-awesome-theme \
  --name "My Awesome Theme" \
  --description "A beautiful dark theme" \
  --publisher "your-name" \
  --version "1.0.0" \
  --license "MIT"

# Development with build
npm run build && node dist/index.js --input theme.txt
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input Ghostty theme file (.txt) | Required |
| `--output` | `-o` | Output directory for extension | Auto-generated |
| `--name` | `-n` | Theme display name | Auto-detected |
| `--description` | `-d` | Theme description | Auto-generated |
| `--publisher` | `-p` | Publisher name for package.json | Optional |
| `--version` | `-v` | Theme version | 0.0.1 |
| `--license` | `-l` | License type | MIT |
| `--no-readme` | | Skip README.md generation | false |
| `--no-changelog` | | Skip CHANGELOG.md generation | false |
| `--no-quickstart` | | Skip quickstart guide generation | false |
| `--help` | `-h` | Show help and usage information | |
| `--version` | | Show CLI version | |

## Development Commands

### Build and Development
```bash
# Build for production
npm run build

# Development build with source maps
npm run build:dev

# Watch mode for development
npm run build:watch

# Type checking only
npm run type-check
```

### Code Quality
```bash
# Lint TypeScript code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Testing
```bash
# Run test suite
npm test

# Watch mode for tests
npm run test:watch

# Coverage reporting
npm run test:coverage
```

### Maintenance
```bash
# Clean build artifacts
npm run clean

# Full rebuild
npm run clean && npm run build
```

## Input Format

The tool accepts Ghostty terminal theme files in `.txt` format with color definitions:

```
# Example theme file
background=#1a1a1a
foreground=#e0e0e0
cursor=#ffffff

# Standard 16-color palette
color0=#000000
color1=#ff0000
color2=#00ff00
color3=#ffff00
color4=#0000ff
color5=#ff00ff
color6=#00ffff
color7=#ffffff
color8=#808080
color9=#ff8080
color10=#80ff80
color11=#ffff80
color12=#8080ff
color13=#ff80ff
color14=#80ffff
color15=#ffffff
```

## Project Architecture

### TypeScript Structure
```
src/
├── components/               # React UI components
│   ├── App.tsx              # Main application component
│   ├── Welcome.tsx          # Welcome screen with recent files
│   ├── FileSelector.tsx     # Advanced file picker
│   ├── ThemeConfigurator.tsx # Split-pane theme configuration
│   ├── ExtensionOptions.tsx # Output configuration
│   ├── ProgressIndicator.tsx # Real-time progress display
│   ├── SuccessScreen.tsx    # Completion summary
│   └── shared/              # Reusable UI components
│       ├── SplitPane.tsx    # Responsive layout component
│       ├── ThemePreview.tsx # Live color preview
│       ├── SelectInput.tsx  # Professional dropdown component
│       ├── NotificationSystem.tsx # Toast notifications
│       ├── ErrorBoundary.tsx # Error recovery
│       └── KeyboardShortcuts.tsx # Accessibility support
├── context/                 # React Context providers
│   ├── AppContext.tsx       # Global application state
│   └── NotificationContext.tsx # Notification management
├── hooks/                   # Custom React hooks
│   └── useNotifications.ts  # Notification system hook
├── lib/                     # Core business logic
│   ├── theme-generator.ts   # Theme conversion engine
│   ├── file-generators.ts   # Extension file generation
│   └── utils.ts             # File operations and utilities
├── utils/                   # Shared utilities
│   ├── types.ts             # TypeScript type definitions
│   ├── config.ts            # Configuration management
│   └── error-handling.ts    # Error processing
└── main.ts                  # CLI entry point with meow
```

### Build System
- **TypeScript**: Full type safety with strict mode
- **Vite**: Modern build system with HMR support
- **Vitest**: Fast testing framework with TypeScript support
- **ESLint + Prettier**: Code quality and formatting
- **React**: Modern hooks-based architecture

## Generated Extension Structure

```
my-theme/
├── package.json              # Extension manifest with TypeScript support
├── README.md                 # Professional user documentation
├── CHANGELOG.md              # Version history with formatting
├── LICENSE                   # License file
├── .gitignore               # Comprehensive ignore rules
├── vsc-extension-quickstart.md  # Developer guide
├── .vscode/
│   └── launch.json          # Debug configuration
└── themes/
    └── my-theme-color-theme.json  # Complete theme definition
```

## Testing Your Theme

1. **Open in VS Code**:
   ```bash
   code ./my-theme
   ```

2. **Test the Extension**:
   - Press `F5` to launch Extension Development Host
   - Use `Ctrl+K Ctrl+T` (or `Cmd+K Cmd+T` on Mac) to open theme picker
   - Select your theme from the list

3. **Make Changes**:
   - Edit `themes/*.json` to customize colors
   - Changes are applied automatically in the development host

## Publishing

1. **Install VSCE**:
   ```bash
   npm install -g vsce
   ```

2. **Package Extension**:
   ```bash
   cd my-theme
   vsce package
   ```

3. **Publish to Marketplace**:
   ```bash
   vsce publish
   ```

## Advanced Features

### TweakCC-Quality User Experience

#### Split-Pane Interface
- **Real-time preview**: Live theme visualization as you configure
- **Responsive design**: Adapts to terminal size and preferences
- **Professional layout**: Side-by-side configuration and preview

#### Intelligent State Management
- **React Context API**: Centralized state with type safety
- **Persistent configuration**: Settings saved between sessions
- **Recent files management**: Quick access to frequently used themes
- **Undo/redo support**: Non-destructive editing workflow

#### Advanced Validation System
- **Real-time feedback**: Instant validation as you type
- **Comprehensive checks**: Theme format, semantic versioning, file paths
- **Context-aware suggestions**: Intelligent autocomplete and recommendations
- **Error recovery**: Graceful handling with actionable error messages

#### Professional Notifications
- **Toast notifications**: Non-intrusive status updates
- **Progress indicators**: Real-time generation progress
- **Success confirmations**: Clear completion feedback
- **Error alerts**: Detailed error information with recovery steps

#### Accessibility & Keyboard Navigation
- **Keyboard-first design**: Full functionality without mouse
- **Screen reader support**: Semantic markup and ARIA labels
- **Focus management**: Logical tab order and focus indicators
- **High contrast support**: Accessible color schemes

### Color Intelligence
- **Advanced color parsing**: Support for various color formats
- **Color relationships**: Automatic color harmony detection
- **Contrast analysis**: Accessibility compliance checking
- **Theme validation**: Ensures color combinations work well together

## Keyboard Shortcuts

| Key Combination | Action | Context |
|----------------|--------|---------|
| `Enter` | Continue to next step / Confirm selection | Global |
| `Tab` | Navigate between form fields | Forms |
| `Shift+Tab` | Navigate backwards | Forms |
| `Escape` | Go back to previous step | Global |
| `Ctrl+C` | Exit application | Global |
| `↑↓` | Navigate menu items | Menus |
| `←→` | Navigate split-pane focus | Split-pane |
| `Space` | Select/toggle item | Selections |
| `1-9` | Quick select menu items | Numbered menus |
| `Ctrl+R` | Refresh preview | Theme preview |
| `Ctrl+Z` | Undo last change | Configuration |
| `F1` | Show help | Global |

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Run type checking**: `npm run type-check`
4. **Run tests**: `npm test`
5. **Start development**: `npm run dev`

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes with TypeScript
npm run type-check  # Validate types
npm run lint        # Check code style
npm test           # Run test suite

# Build and test
npm run build
npm start -- --input test-theme.txt

# Submit pull request
```

### Code Standards
- **TypeScript**: All new code must be TypeScript with proper types
- **Testing**: Add tests for new features (Vitest + Testing Library)
- **Linting**: Code must pass ESLint and Prettier checks
- **Documentation**: Update README and inline docs for changes

## Technology Stack

- **Runtime**: Node.js 18+ with ES modules
- **Language**: TypeScript with strict mode
- **UI Framework**: React 18 with hooks
- **CLI Framework**: Ink for terminal UI
- **Build System**: Vite + TypeScript compiler
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier + TypeScript strict mode
- **Package Manager**: npm with lockfile

## Requirements

- **Node.js**: 18.0.0 or higher
- **Terminal**: Modern terminal with Unicode support
- **OS**: macOS, Windows, or Linux

## Troubleshooting

### TypeScript Issues
```bash
# Type check without building
npm run type-check

# Clean and rebuild
npm run clean && npm run build

# Check dependencies
npm audit && npm update
```

### Runtime Errors
- **"Raw mode not supported"**: Use a modern terminal (iTerm2, Windows Terminal, GNOME Terminal)
- **Module resolution**: Ensure Node.js 18+ and ES modules support
- **Build failures**: Check TypeScript configuration and dependencies

### Theme Generation Issues
- **Invalid theme file**: Use built-in validation to check format
- **Permission errors**: Verify output directory write permissions
- **Color parsing**: Check for valid hex colors in input file
- **Extension issues**: Validate generated package.json structure

### Performance Issues
- **Slow startup**: Check for large node_modules or outdated Node.js
- **Memory usage**: Monitor with `node --inspect` for large theme files
- **UI responsiveness**: Ensure terminal supports modern features

## License

MIT License - see LICENSE file for details.

## Support & Community

- 📚 **Documentation**: Comprehensive inline docs and TypeScript definitions
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/issues) for bugs and features
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions) for questions
- 🎯 **Examples**: Sample theme files in repository
- ⚡ **Performance**: Optimized for professional development workflows

---

**Built with TypeScript, React, and professional CLI patterns**  
*Made with ❤️ for VS Code theme creators*