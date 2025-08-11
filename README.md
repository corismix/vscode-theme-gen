# VS Code Theme Generator CLI

An interactive command-line tool for converting Ghostty terminal color themes into VS Code extensions.

![Theme Generator Demo](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=VS+Code+Theme+Generator)

## Features

- 🎨 **Interactive Theme Configuration**: Step-by-step wizard for setting up your theme
- 🌈 **Live Color Preview**: See your theme colors as you configure
- 📦 **Complete Extension Generation**: Creates a full VS Code extension structure
- 🚀 **Ready-to-Publish**: Generates package.json, README, and all necessary files
- 🔄 **Recent Files**: Keeps track of recently used theme files
- 🎯 **Command Line Options**: Support for automated workflows

## Installation

### From NPM (when published)
```bash
npm install -g vscode-theme-generator-cli
theme-generator
```

### Development Install
```bash
git clone <repository>
cd scripts
npm install
npm start
```

## Usage

### Interactive Mode
```bash
npm start
```

This launches the interactive CLI with a beautiful interface that guides you through:
1. **Welcome Screen**: Choose to create a new theme or load recent files
2. **File Selection**: Pick your Ghostty theme file (.txt)
3. **Theme Configuration**: Set name, description, version, and publisher
4. **Extension Options**: Configure output directory and file generation
5. **Progress Tracking**: Watch as your extension is generated
6. **Success Screen**: Get next steps and open your new theme

### Command Line Mode
```bash
# Basic usage
npm start -- --input my-theme.txt --name "My Theme"

# Full configuration
npm start -- \
  --input ghostty-theme.txt \
  --output ./my-awesome-theme \
  --name "My Awesome Theme" \
  --description "A beautiful dark theme" \
  --publisher "your-name" \
  --version "1.0.0" \
  --license "MIT"
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

## Generated Extension Structure

```
my-theme/
├── package.json              # Extension manifest
├── README.md                 # User documentation
├── CHANGELOG.md              # Version history
├── LICENSE                   # License file
├── .gitignore               # Git ignore rules
├── vsc-extension-quickstart.md  # Developer guide
├── .vscode/
│   └── launch.json          # Debug configuration
└── themes/
    └── my-theme-color-theme.json  # Theme definition
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

### Recent Files
The CLI remembers your recently used theme files for quick access.

### Color Preview
Interactive color preview shows your theme palette with hex values and contrast information.

### Validation
Built-in validation ensures:
- Valid theme file format
- Proper semantic versioning
- Publisher name compliance
- File path validation

### Error Recovery
Graceful error handling with helpful messages and recovery suggestions.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Continue to next step |
| `Tab` | Navigate between form fields |
| `Escape` | Go back to previous step |
| `Ctrl+C` | Exit application |
| `Arrow Keys` | Navigate menus |
| `1-9` | Quick select menu items |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with various theme files
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### "Raw mode is not supported" Error
This error occurs when running in non-interactive terminals. The CLI works best in:
- Terminal.app (macOS)
- iTerm2 (macOS) 
- Windows Terminal
- GNOME Terminal (Linux)

### Theme Not Loading in VS Code
1. Check that the theme file is valid JSON
2. Verify the package.json contribution points
3. Try restarting VS Code
4. Check the developer console for errors

### Generation Errors
- Ensure input file exists and is readable
- Check output directory permissions
- Verify theme file format matches expected pattern

## Support

- 📚 [Documentation](https://github.com/your-repo/wiki)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)

---

**Made with ❤️ for VS Code theme creators**