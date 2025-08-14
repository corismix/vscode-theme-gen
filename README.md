# VS Code Theme Generator

An interactive CLI tool that converts [Ghostty](https://ghostty.org/) terminal color schemes into VS Code theme extensions. Built with TypeScript, React (Ink), and Vite for a seamless terminal-based experience.

## ✨ Features

- **Interactive Workflow** - Step-by-step guided process for creating VS Code themes
- **Ghostty Compatibility** - Supports multiple Ghostty color scheme formats (palette and key-value)
- **Professional Output** - Generates complete VS Code extension packages ready for publishing
- **Validation & Error Handling** - Comprehensive input validation with helpful error messages
- **Customizable Options** - Configure theme metadata, descriptions, and advanced settings
- **Zero Configuration** - Works out of the box with sensible defaults

## 🚀 Quick Start

The easiest way to use the VS Code Theme Generator is with `bunx` (no installation required):

```bash
bunx vscode-theme-gen
```

This will start the interactive CLI that guides you through:

1. **Theme File Selection** - Choose your Ghostty color scheme file
2. **Theme Configuration** - Set name, description, and metadata
3. **Options Selection** - Configure advanced settings and preferences
4. **Generation** - Create your complete VS Code extension

## 📖 Usage

### Basic Usage

```bash
bunx vscode-theme-gen
```

The interactive interface will guide you through each step:

```
┌─ VS Code Theme Generator ─────────────────────────────────────┐
│                                                               │
│  Convert Ghostty color schemes to VS Code themes              │
│                                                               │
│  Select theme file: /path/to/your/ghostty-theme.conf          │
│  Theme name: My Custom Theme                                  │
│  Description: A beautiful theme based on my terminal          │
│  Author: Your Name                                            │
│                                                               │
│  Generating extension...                                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Command Line Options

```bash
# Show help
bunx vscode-theme-gen --help

# Show version
bunx vscode-theme-gen --version
```

### Generated Extension Structure

The tool creates a complete VS Code extension with:

```
my-custom-theme/
├── package.json           # Extension metadata and configuration
├── README.md             # Documentation with preview images
├── CHANGELOG.md          # Version history
├── icon.png              # Extension icon
├── themes/
│   └── my-custom-theme.json    # Your VS Code theme
└── vsc-extension-quickstart.md # VS Code extension guide
```

## 🛠️ Development

### Prerequisites

- [Bun](https://bun.sh/) or Node.js 18+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/corismix/vscode-theme-gen.git
cd vscode-theme-gen

# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun start` | Build production version and run CLI |
| `bun run dev` | Build development version and run CLI |
| `bun run build` | Production build (creates executable with shebang) |
| `bun run build:dev` | Development build with debugging |
| `bun run build:watch` | Watch mode for development |
| `bun run type-check` | TypeScript type checking (no emit) |
| `bun run lint` | ESLint with zero warnings policy |
| `bun run lint:fix` | Auto-fix linting issues |
| `bun run format` | Format code with Prettier |
| `bun run format:check` | Check formatting without changes |
| `bun test` | Run all tests with verbose output |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Generate coverage reports |
| `bun run test:ui` | Visual test interface |
| `bun run clean` | Remove build artifacts and cache |
| `bun run analyze:bundle` | Analyze bundle size and content |

### Project Structure

```
src/
├── components/           # React components for the CLI interface
│   ├── steps/           # Step-by-step workflow components
│   └── ui/              # Reusable UI components
├── lib/                 # Core business logic
│   ├── theme-generator.ts    # Ghostty → VS Code conversion
│   ├── file-generators.ts    # Extension file generation
│   └── utils-simple.ts       # Utilities and validation
├── types/               # TypeScript type definitions
├── config/              # Configuration and limits
└── test/                # Test files and utilities
```

### Key Technologies

- **TypeScript** - Type-safe development
- **React + Ink** - Terminal UI components
- **Vite** - Fast build system with custom plugins
- **Meow** - CLI argument parsing
- **Vitest** - Testing framework

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun run test:watch

# Generate coverage report
bun run test:coverage

# Open visual test interface
bun run test:ui
```

### Test Categories

- **Unit Tests** - Core business logic (theme generation, file operations)
- **Integration Tests** - CLI workflows and file system interactions
- **Coverage Reports** - Focus on critical paths and error handling

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the existing code style
4. **Run tests** (`bun test`) and linting (`bun run lint`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- **Zero-warning ESLint policy** - All warnings must be resolved
- **Strict TypeScript** - No implicit any, all types must be defined
- **Test coverage** - Add tests for new features and bug fixes
- **Documentation** - Update README and comments for significant changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ghostty](https://ghostty.org/) - The excellent terminal emulator that inspired this tool
- [Ink](https://github.com/vadimdemedes/ink) - For making beautiful terminal interfaces with React
- [VS Code](https://code.visualstudio.com/) - The editor that makes development a joy

---

**Made with ❤️ using Claude Code**