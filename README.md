# VS Code Theme Generator CLI

A modern TypeScript CLI tool for converting Ghostty terminal color themes into complete VS Code extensions. Features a clean, modular architecture with comprehensive testing and optimized performance.

![Theme Generator Demo](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=VS+Code+Theme+Generator+CLI)

## Features

- 🎨 **Interactive Terminal UI**: Step-by-step wizard built with React and Ink
- 📦 **Complete Extension Generation**: Full VS Code extension structure with proper manifest
- ⚡ **Optimized Performance**: 50.11 kB bundle size with fast startup
- 🔧 **TypeScript First**: Strict mode enabled with comprehensive type safety
- 🧪 **Comprehensive Testing**: 98 tests with full coverage of core functionality
- 🛡️ **Robust Error Handling**: Custom error classes with helpful messages
- 📊 **Theme Validation**: Real-time validation of Ghostty theme files
- 🎯 **Developer Experience**: Modern build system with Vite and ESM support

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

The interactive CLI features a clean multi-step workflow:

1. **File Selection**: Choose your Ghostty theme file with validation
2. **Theme Configuration**: Set theme name and display preferences
3. **Extension Options**: Configure output directory and metadata
4. **Processing**: Real-time generation with progress feedback
5. **Success**: Completion summary with installation instructions

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
# Example Ghostty theme file
palette = 0=#1e1113
palette = 1=#ff3e71
palette = 2=#7ee044
palette = 3=#f5b649
palette = 4=#4583d6
palette = 5=#c061cb
palette = 6=#44c9b1
palette = 7=#ccc1c3
palette = 8=#696969
palette = 9=#ff5588
palette = 10=#8fcc22
palette = 11=#ffcc44
palette = 12=#6699ff
palette = 13=#d67bd6
palette = 14=#77eedd
palette = 15=#f2e7e5

background = #180c0f
foreground = #f2e7e5
cursor-color = #f2e7e5
```

## Project Architecture

### Clean Modular Structure
```
src/
├── components/              # React UI components (2 main + 6 steps)
│   ├── App.tsx             # Main application orchestrator
│   ├── ThemeGenerator.tsx  # Core workflow controller (177 lines)
│   ├── types.ts            # Shared component interfaces
│   ├── steps/              # Step-based components
│   │   ├── FileStep.tsx    # File selection with validation
│   │   ├── ThemeStep.tsx   # Theme name configuration
│   │   ├── OptionsStep.tsx # Extension metadata setup
│   │   ├── ProcessStep.tsx # Generation progress display
│   │   ├── SuccessStep.tsx # Completion summary
│   │   └── ErrorDisplay.tsx # Error handling UI
│   └── ui/                 # Reusable UI components
│       ├── Header.tsx      # Consistent header component
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

### Build System & Performance
- **TypeScript**: Strict mode with comprehensive type coverage
- **Vite**: Modern build system producing 50.11 kB optimized bundle
- **Vitest**: 98 tests with full coverage of core functionality
- **ESLint + Prettier**: Code quality enforcement
- **React 18 + Ink**: Terminal UI with modern hooks patterns
- **ES Modules**: Modern ESM support with Node.js 18+

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

### Quality & Testing

#### Comprehensive Test Coverage
- **98 Tests**: Full coverage of core functionality
- **Unit Tests**: Business logic validation
- **Integration Tests**: End-to-end workflows
- **Hook Tests**: React hook behavior validation

#### Performance Optimization
- **Bundle Size**: 50.11 kB optimized production build
- **Fast Startup**: Minimal dependencies for quick loading
- **Memory Efficient**: Clean component lifecycle management
- **File Size Limits**: 1MB theme file limit for security

#### Developer Experience
- **TypeScript Strict**: Complete type safety
- **Modern Tooling**: Vite, Vitest, ESLint, Prettier
- **ES Modules**: Native ESM with proper imports
- **Error Handling**: Custom error classes with context

### Theme Processing
- **Ghostty Format Support**: Full palette and standard color formats
- **Color Validation**: Hex color format validation with error messages
- **Theme Name Resolution**: Smart name extraction from files or metadata
- **VS Code Mapping**: Complete workbench and syntax token color mapping

## Navigation

| Key Combination | Action | Context |
|----------------|--------|---------|
| `Enter` | Continue to next step | Global |
| `Tab` | Navigate form fields | Forms |
| `Escape` | Go back or exit | Global |
| `Ctrl+C` | Exit application | Global |
| `q` | Quit from any step | Global |

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
npm run type-check  # Validate types (strict mode)
npm run lint        # Check code style
npm test           # Run 98 tests

# Build and test
npm run build      # Creates 50.11 kB bundle
npm start -- --input test-theme.txt

# Submit pull request
```

### Code Standards
- **TypeScript**: All new code must be TypeScript with proper types
- **Testing**: Add tests for new features (Vitest + Testing Library)
- **Linting**: Code must pass ESLint and Prettier checks
- **Documentation**: Update README and inline docs for changes

## Technology Stack

- **Runtime**: Node.js 18+ with native ES modules
- **Language**: TypeScript 5.3+ with strict mode enabled
- **UI Framework**: React 18 with Ink for terminal UI
- **Build System**: Vite 7.1+ with optimized bundling
- **Testing**: Vitest 3.2+ with 98 comprehensive tests
- **Code Quality**: ESLint + Prettier with strict rules
- **Dependencies**: Minimal (3 runtime: ink, meow, react)

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
- 🐛 **Issues**: [GitHub Issues](https://github.com/corismer/vscode-theme-generator/issues) for bugs and features
- 🎯 **Examples**: Sample theme files in repository
- ⚡ **Performance**: Optimized for professional development workflows

---

**Clean Architecture • TypeScript • Comprehensive Testing**  
*50.11 kB bundle • 98 tests • Modern ESM*