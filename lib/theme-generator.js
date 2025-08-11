import fs from 'fs';
import path from 'path';
import { isValidHexColor, sanitizeColorValue } from './utils.js';
import { UI_TEXT, FILE_CONSTANTS } from './constants.js';

// Theme generation functions extracted from the original script

// Use constants from the main constants file
const MAX_FILE_SIZE_BYTES = FILE_CONSTANTS.MAX_FILE_SIZE_BYTES;
const MAX_LINES = 10000;
const VALID_COLOR_KEYS = [
  'background', 'foreground', 'cursor', 'cursor_text', 'cursor-text',
  'selection_background', 'selection_foreground', 'selection-background', 'selection-foreground',
  'cursor-color'
];
const COLOR_KEY_REGEX = /^color\d+$/;
const PALETTE_REGEX = /^palette\s*=\s*(\d+)\s*=\s*(.+)$/;
const LINE_REGEX = /^(\w+)[\s=:]+(.+)$/;

export function readText(filePath) {
  if (typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }
  
  try {
    const resolvedPath = path.resolve(filePath);
    const content = fs.readFileSync(resolvedPath, 'utf8');
    
    // Validate file size
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(UI_TEXT.VALIDATION_MESSAGES.FILE_TOO_LARGE);
    }
    
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

export function parseTxt(filePath) {
  const contents = readText(filePath).trim();
  const lines = contents.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
  
  // Validate line count
  if (lines.length > MAX_LINES) {
    throw new Error(`Too many lines in file (maximum ${MAX_LINES})`);
  }
  
  const colors = {};
  const meta = {};
  let processedLines = 0;

  for (const line of lines) {
    processedLines++;
    if (processedLines > 1000) { // Reasonable limit for config lines
      console.warn('Too many configuration lines, truncating');
      break;
    }
    
    // First, check for Ghostty palette format: palette = N=#color
    const paletteMatch = line.match(PALETTE_REGEX);
    if (paletteMatch) {
      const [, paletteNumber, colorValue] = paletteMatch;
      const colorKey = `color${paletteNumber}`;
      const sanitizedColor = sanitizeColorValue(colorValue.trim());
      if (sanitizedColor) {
        colors[colorKey] = sanitizedColor;
      } else {
        console.warn(`Invalid color value for ${colorKey}: ${colorValue}`);
      }
      continue;
    }
    
    // Then check for regular format: key = value
    const match = line.match(LINE_REGEX);
    if (match) {
      const [, key, value] = match;
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      
      // Validate key length
      if (trimmedKey.length > 100) {
        console.warn(`Skipping line with overly long key: ${trimmedKey.substring(0, 20)}...`);
        continue;
      }
      
      if (COLOR_KEY_REGEX.test(trimmedKey)) {
        const sanitizedColor = sanitizeColorValue(trimmedValue);
        if (sanitizedColor) {
          colors[trimmedKey] = sanitizedColor;
        } else {
          console.warn(`Invalid color value for ${trimmedKey}: ${trimmedValue}`);
        }
      } else if (VALID_COLOR_KEYS.includes(trimmedKey)) {
        const sanitizedColor = sanitizeColorValue(trimmedValue);
        if (sanitizedColor) {
          // Normalize key names (convert hyphens to underscores for consistency)
          const normalizedKey = trimmedKey.replace(/-/g, '_');
          colors[normalizedKey] = sanitizedColor;
        } else {
          console.warn(`Invalid color value for ${trimmedKey}: ${trimmedValue}`);
        }
      } else {
        // For meta values, limit length and sanitize
        const sanitizedValue = trimmedValue.length > 200 ? trimmedValue.substring(0, 200) : trimmedValue;
        meta[trimmedKey] = sanitizedValue;
      }
    }
  }

  return { colors, meta };
}

export function roleMap(parsed) {
  const { colors } = parsed;
  return {
    black: colors.color0 || '#000000',
    red: colors.color1 || '#ff0000',
    green: colors.color2 || '#00ff00',
    yellow: colors.color3 || '#ffff00',
    blue: colors.color4 || '#0000ff',
    magenta: colors.color5 || '#ff00ff',
    cyan: colors.color6 || '#00ffff',
    white: colors.color7 || '#ffffff',
    brightBlack: colors.color8 || '#808080',
    brightRed: colors.color9 || '#ff8080',
    brightGreen: colors.color10 || '#80ff80',
    brightYellow: colors.color11 || '#ffff80',
    brightBlue: colors.color12 || '#8080ff',
    brightMagenta: colors.color13 || '#ff80ff',
    brightCyan: colors.color14 || '#80ffff',
    brightWhite: colors.color15 || '#ffffff',
    background: colors.background || colors.color0 || '#000000',
    foreground: colors.foreground || colors.color15 || '#ffffff',
    cursor: colors.cursor || colors.cursor_color || colors.color15 || '#ffffff',
    cursorText: colors.cursor_text || colors.color0 || '#000000',
    selectionBackground: colors.selection_background || colors.color4 || '#0000ff',
    selectionForeground: colors.selection_foreground || colors.color15 || '#ffffff'
  };
}

export function buildColors(R) {
  return {
    'activityBar.background': R.black,
    'activityBar.foreground': R.white,
    'activityBarBadge.background': R.blue,
    'activityBarBadge.foreground': R.white,
    'badge.background': R.blue,
    'badge.foreground': R.white,
    'button.background': R.blue,
    'button.foreground': R.white,
    'button.hoverBackground': R.brightBlue,
    'dropdown.background': R.brightBlack,
    'dropdown.foreground': R.white,
    'editor.background': R.background,
    'editor.foreground': R.foreground,
    'editor.lineHighlightBackground': `${R.brightBlack}40`,
    'editor.selectionBackground': R.selectionBackground,
    'editor.selectionForeground': R.selectionForeground,
    'editorCursor.foreground': R.cursor,
    'editorGroup.border': R.brightBlack,
    'editorGroupHeader.tabsBackground': R.black,
    'editorWidget.background': R.brightBlack,
    'input.background': R.brightBlack,
    'input.foreground': R.white,
    'list.activeSelectionBackground': R.blue,
    'list.activeSelectionForeground': R.white,
    'list.hoverBackground': R.brightBlack,
    'list.inactiveSelectionBackground': R.brightBlack,
    'menu.background': R.brightBlack,
    'menu.foreground': R.white,
    'panel.background': R.black,
    'panel.border': R.brightBlack,
    'panelTitle.activeForeground': R.white,
    'progressBar.background': R.blue,
    'sideBar.background': R.black,
    'sideBar.foreground': R.white,
    'sideBarSectionHeader.background': R.brightBlack,
    'statusBar.background': R.black,
    'statusBar.foreground': R.white,
    'tab.activeBackground': R.background,
    'tab.activeForeground': R.foreground,
    'tab.border': R.brightBlack,
    'tab.inactiveBackground': R.black,
    'tab.inactiveForeground': R.brightWhite,
    'terminal.ansiBlack': R.black,
    'terminal.ansiRed': R.red,
    'terminal.ansiGreen': R.green,
    'terminal.ansiYellow': R.yellow,
    'terminal.ansiBlue': R.blue,
    'terminal.ansiMagenta': R.magenta,
    'terminal.ansiCyan': R.cyan,
    'terminal.ansiWhite': R.white,
    'terminal.ansiBrightBlack': R.brightBlack,
    'terminal.ansiBrightRed': R.brightRed,
    'terminal.ansiBrightGreen': R.brightGreen,
    'terminal.ansiBrightYellow': R.brightYellow,
    'terminal.ansiBrightBlue': R.brightBlue,
    'terminal.ansiBrightMagenta': R.brightMagenta,
    'terminal.ansiBrightCyan': R.brightCyan,
    'terminal.ansiBrightWhite': R.brightWhite,
    'terminal.background': R.background,
    'terminal.foreground': R.foreground,
    'titleBar.activeBackground': R.black,
    'titleBar.activeForeground': R.white
  };
}

export function tokenColorsFromRoles(R) {
  return [
    { scope: 'comment', settings: { foreground: R.brightBlack, fontStyle: 'italic' } },
    { scope: 'string', settings: { foreground: R.green } },
    { scope: 'constant.numeric', settings: { foreground: R.magenta } },
    { scope: 'constant.language', settings: { foreground: R.blue } },
    { scope: 'keyword', settings: { foreground: R.red } },
    { scope: 'storage', settings: { foreground: R.red } },
    { scope: 'entity.name.function', settings: { foreground: R.yellow } },
    { scope: 'entity.name.class', settings: { foreground: R.cyan } },
    { scope: 'entity.name.type', settings: { foreground: R.cyan } },
    { scope: 'variable.parameter', settings: { foreground: R.brightWhite } },
    { scope: 'support.function', settings: { foreground: R.brightBlue } },
    { scope: 'support.class', settings: { foreground: R.brightCyan } },
    { scope: 'markup.heading', settings: { foreground: R.yellow, fontStyle: 'bold' } },
    { scope: 'markup.bold', settings: { fontStyle: 'bold' } },
    { scope: 'markup.italic', settings: { fontStyle: 'italic' } }
  ];
}

export function tinaciousJsonRainbowTokenColors() {
  return [
    { scope: 'punctuation.definition.dictionary.begin.json', settings: { foreground: '#f6b34c' } },
    { scope: 'punctuation.definition.dictionary.end.json', settings: { foreground: '#f6b34c' } },
    { scope: 'punctuation.definition.array.begin.json', settings: { foreground: '#83e96c' } },
    { scope: 'punctuation.definition.array.end.json', settings: { foreground: '#83e96c' } },
    { scope: 'punctuation.definition.string.begin.json', settings: { foreground: '#c89ef0' } },
    { scope: 'punctuation.definition.string.end.json', settings: { foreground: '#c89ef0' } },
    { scope: 'punctuation.separator.dictionary.key-value.json', settings: { foreground: '#3ad4b7' } },
    { scope: 'punctuation.separator.dictionary.pair.json', settings: { foreground: '#e4e5df' } },
    { scope: 'punctuation.separator.array.json', settings: { foreground: '#e4e5df' } }
  ];
}

export function resolveName(inPath, explicitName, meta) {
  // Validate inputs
  if (explicitName && typeof explicitName === 'string' && explicitName.trim()) {
    return explicitName.trim();
  }
  
  if (meta && meta.name && typeof meta.name === 'string' && meta.name.trim()) {
    return meta.name.trim();
  }
  
  if (typeof inPath !== 'string') {
    return 'Unknown Theme';
  }
  
  try {
    const baseName = path.basename(inPath, '.txt');
    return baseName.replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  } catch {
    return 'Unknown Theme';
  }
}

export function buildTheme(parsed, inPath, explicitName) {
  // Validate inputs
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid parsed data');
  }
  
  try {
    const R = roleMap(parsed);
    const name = resolveName(inPath, explicitName, parsed.meta);
    const colors = buildColors(R);
    const tokenColors = tokenColorsFromRoles(R).concat(tinaciousJsonRainbowTokenColors());
    
    return {
      name,
      type: 'dark',
      colors,
      tokenColors,
      semanticHighlighting: true
    };
  } catch (error) {
    throw new Error(`Failed to build theme: ${error.message}`);
  }
}

export function extractColorPalette(parsed) {
  const R = roleMap(parsed);
  return {
    primary: {
      background: R.background,
      foreground: R.foreground,
      cursor: R.cursor
    },
    colors: [
      { name: 'Black', value: R.black, bright: R.brightBlack },
      { name: 'Red', value: R.red, bright: R.brightRed },
      { name: 'Green', value: R.green, bright: R.brightGreen },
      { name: 'Yellow', value: R.yellow, bright: R.brightYellow },
      { name: 'Blue', value: R.blue, bright: R.brightBlue },
      { name: 'Magenta', value: R.magenta, bright: R.brightMagenta },
      { name: 'Cyan', value: R.cyan, bright: R.brightCyan },
      { name: 'White', value: R.white, bright: R.brightWhite }
    ]
  };
}