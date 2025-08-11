import fs from 'fs';
import path from 'path';

// Helper to convert theme name to package-safe identifier
export function toPackageName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generate package.json for the extension
export function generatePackageJson(themeName, options, themeFileName) {
  const packageName = toPackageName(themeName);
  const displayName = themeName;
  const description = options.description || 
    `**${themeName}** is a carefully crafted VS Code theme converted from a Ghostty terminal theme. ` +
    `It features thoughtful color choices and excellent readability for extended coding sessions.`;
  
  const packageJson = {
    name: packageName,
    displayName: displayName,
    description: description,
    version: options.version || '0.0.1',
    engines: {
      vscode: "^1.102.0"
    },
    categories: ["Themes"],
    keywords: ["theme", "dark theme", "color theme", themeName.toLowerCase()],
    contributes: {
      themes: [
        {
          label: displayName,
          uiTheme: "vs-dark",
          path: `./themes/${path.basename(themeFileName)}`
        }
      ]
    }
  };
  
  if (options.publisher) {
    packageJson.publisher = options.publisher;
  }
  
  packageJson.repository = {
    type: "git",
    url: `https://github.com/${options.publisher || 'username'}/${packageName}`
  };
  
  packageJson.bugs = {
    url: `https://github.com/${options.publisher || 'username'}/${packageName}/issues`
  };
  
  packageJson.homepage = `https://github.com/${options.publisher || 'username'}/${packageName}#readme`;
  packageJson.license = options.license || "MIT";
  
  return JSON.stringify(packageJson, null, 2) + '\n';
}

// Generate .vscode/launch.json for debugging
export function generateLaunchJson() {
  const launchJson = {
    version: "0.2.0",
    configurations: [
      {
        name: "Extension",
        type: "extensionHost",
        request: "launch",
        args: [
          "--extensionDevelopmentPath=${workspaceFolder}"
        ]
      }
    ]
  };
  
  return JSON.stringify(launchJson, null, 2) + '\n';
}

// Generate README.md
export function generateReadme(themeName, options) {
  const packageName = toPackageName(themeName);
  const description = options.description || 
    `A carefully crafted VS Code theme converted from a Ghostty terminal theme.`;
  
  return `# ${themeName}

${description}

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "${themeName}"
4. Click Install

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/${options.publisher || 'username'}/${packageName}/releases)
2. Copy the extension folder to:
   - **Windows**: \`%USERPROFILE%\\.vscode\\extensions\`
   - **macOS/Linux**: \`~/.vscode/extensions\`
3. Restart VS Code

## Usage

1. Open VS Code
2. Go to \`File > Preferences > Color Theme\` (or \`Code > Preferences > Color Theme\` on macOS)
3. Select "${themeName}"

Alternatively, use Command Palette:
- Press \`Ctrl+K Ctrl+T\` (or \`Cmd+K Cmd+T\` on macOS)
- Select "${themeName}"

## Features

- **Optimized for readability**: Carefully selected colors ensure excellent code readability
- **Comprehensive syntax highlighting**: Support for all major programming languages
- **Comfortable for long coding sessions**: Easy on the eyes with balanced contrast
- **Terminal integration**: Matching terminal colors for a consistent experience

## Screenshots

![${themeName} Screenshot](images/screenshot.png)

## Color Palette

This theme was converted from a Ghostty terminal color scheme and features a carefully curated palette designed for optimal code readability.

## Customization

You can customize this theme in your VS Code settings:

\`\`\`json
"workbench.colorCustomizations": {
  "[${themeName}]": {
    // Your customizations here
  }
}
\`\`\`

## Contributing

Found an issue or have a suggestion? Please [open an issue](https://github.com/${options.publisher || 'username'}/${packageName}/issues) on GitHub.

## License

[${options.license || 'MIT'}](LICENSE)

## Credits

- Original Ghostty theme creators
- VS Code theme generator script

---

**Enjoy coding with ${themeName}!** 🎨
`;
}

// Generate CHANGELOG.md
export function generateChangelog(options) {
  const today = new Date().toISOString().split('T')[0];
  
  return `# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${options.version || '0.0.1'}] - ${today}

### Added
- Initial release
- Complete VS Code theme converted from Ghostty terminal theme
- Comprehensive syntax highlighting for all major languages
- Optimized workbench colors for dark theme
- Terminal color integration
- Support for semantic highlighting

## [Unreleased]

### Planned
- Additional language-specific optimizations
- Theme variants (if applicable)
- User-requested customizations
`;
}

// Generate vsc-extension-quickstart.md
export function generateQuickstart(themeName) {
  return `# ${themeName} - Developer Guide

## Getting Started

This extension was generated from a Ghostty terminal theme file using an interactive CLI tool.

## What's in the folder

* \`package.json\` - Extension manifest defining theme location and metadata
* \`themes/\` - Contains the theme JSON file(s)
* \`.vscode/launch.json\` - Debug configuration for Extension Development Host
* \`README.md\` - User-facing documentation
* \`CHANGELOG.md\` - Version history
* This file - Developer quick start guide

## Testing the Theme

1. Press \`F5\` to open a new VS Code window with your extension loaded
2. Open the Command Palette (\`Ctrl+Shift+P\` or \`Cmd+Shift+P\` on Mac)
3. Type "Color Theme" and select \`Preferences: Color Theme\`
4. Choose "${themeName}" from the list
5. Open various file types to test syntax highlighting

## Making Changes

### Theme Colors

Edit \`themes/*.json\` to modify:
- **Workbench colors**: UI elements like sidebar, tabs, status bar
- **Token colors**: Syntax highlighting rules
- **Semantic colors**: Language-specific semantic tokens

Changes are automatically applied to the Extension Development Host window.

### Testing Token Scopes

1. Open a file with syntax highlighting
2. Use Command Palette: \`Developer: Inspect Editor Tokens and Scopes\`
3. Click on any text to see its token scope
4. Use this information to customize token colors

## Publishing

### First Time Setup

1. Install vsce: \`npm install -g vsce\`
2. Create a publisher account at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
3. Get a Personal Access Token from Azure DevOps

### Publishing Steps

1. Update version in \`package.json\`
2. Update \`CHANGELOG.md\`
3. Package: \`vsce package\`
4. Publish: \`vsce publish\`

## Resources

- [VS Code Theme Documentation](https://code.visualstudio.com/api/extension-guides/color-theme)
- [Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Tips

- Use the built-in theme editor: \`Developer: Generate Color Theme From Current Settings\`
- Test with different file types and languages
- Check accessibility with high contrast themes
- Validate JSON files before publishing
`;
}

// Generate complete extension structure
export async function generateExtensionFiles(extensionRoot, themeName, options, themeFileName) {
  const results = [];
  
  try {
    // Create necessary directories
    const vscodePath = path.join(extensionRoot, '.vscode');
    const themesPath = path.join(extensionRoot, 'themes');
    
    await fs.promises.mkdir(vscodePath, { recursive: true });
    await fs.promises.mkdir(themesPath, { recursive: true });
    
    // Generate package.json
    const packageJsonContent = generatePackageJson(themeName, options, themeFileName);
    await fs.promises.writeFile(path.join(extensionRoot, 'package.json'), packageJsonContent);
    results.push({ file: 'package.json', status: 'created' });
    
    // Generate .vscode/launch.json
    const launchJsonContent = generateLaunchJson();
    await fs.promises.writeFile(path.join(vscodePath, 'launch.json'), launchJsonContent);
    results.push({ file: '.vscode/launch.json', status: 'created' });
    
    // Generate README.md
    if (options.generateReadme !== false) {
      const readmeContent = generateReadme(themeName, options);
      await fs.promises.writeFile(path.join(extensionRoot, 'README.md'), readmeContent);
      results.push({ file: 'README.md', status: 'created' });
    }
    
    // Generate CHANGELOG.md
    if (options.generateChangelog !== false) {
      const changelogContent = generateChangelog(options);
      await fs.promises.writeFile(path.join(extensionRoot, 'CHANGELOG.md'), changelogContent);
      results.push({ file: 'CHANGELOG.md', status: 'created' });
    }
    
    // Generate vsc-extension-quickstart.md
    if (options.generateQuickstart !== false) {
      const quickstartContent = generateQuickstart(themeName);
      await fs.promises.writeFile(path.join(extensionRoot, 'vsc-extension-quickstart.md'), quickstartContent);
      results.push({ file: 'vsc-extension-quickstart.md', status: 'created' });
    }
    
    // Generate .gitignore
    const gitignoreContent = `node_modules/
*.vsix
.vscode-test/
*.log
.DS_Store
`;
    await fs.promises.writeFile(path.join(extensionRoot, '.gitignore'), gitignoreContent);
    results.push({ file: '.gitignore', status: 'created' });
    
    // Generate LICENSE
    const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} ${options.publisher || 'Theme Author'}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    await fs.promises.writeFile(path.join(extensionRoot, 'LICENSE'), licenseContent);
    results.push({ file: 'LICENSE', status: 'created' });
    
    return results;
    
  } catch (error) {
    throw new Error(`Failed to generate extension files: ${error.message}`);
  }
}