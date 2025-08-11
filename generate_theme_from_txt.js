#!/usr/bin/env node

/*
Generate a complete dark VS Code theme JSON from a terminal color scheme text file.

- No presets. Works with any similarly formatted txt (e.g., tinacious.txt, root.txt, prismarc.txt):
    palette = 0=#1d1d26
    palette = 1=#ff3399
    ...
    palette = 15=#ffffff
    background = #1d1d26
    foreground = #cbcbf0
    cursor-color = #ff3399
    cursor-text = #000000
    selection-background = #ff3399
    selection-foreground = #1d1d26
  Optional overrides:
    name = My Theme
    accent-index = 1      (or accent-color = #hex)
    dim-index = 8         (or dim-color = #hex)
    ui-bg-index = 0       (or ui-bg-color = #hex)
    ui-fg-index = 7       (or ui-fg-color = #hex)

Usage:
  node scripts/generate_theme_from_txt.js --in ../prismarc/src-theme/prismarc.txt --out ../prismarc/themes/Prismarc-color-theme.json [--name "Prismarc"]

This script generates:
- A full workbench color set (editor, widgets, lists, tabs, status, activity, sidebar, panels, etc.)
- Comprehensive token colors
- Extended JSON key depth (36 levels) using Tinacious’s 9-color cycle
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  generatePackageJson, 
  generateLaunchJson, 
  generateReadme, 
  generateChangelog, 
  generateQuickstart,
  generateExtensionFiles
} from './lib/file-generators.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { 
    inPath: null, 
    outPath: null, 
    name: null,
    fullExtension: false,
    publisher: null,
    version: '0.0.1',
    description: null
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in' && argv[i + 1]) out.inPath = argv[++i];
    else if (a === '--out' && argv[i + 1]) out.outPath = argv[++i];
    else if (a === '--name' && argv[i + 1]) out.name = argv[++i];
    else if (a === '--full-extension') out.fullExtension = true;
    else if (a === '--publisher' && argv[i + 1]) out.publisher = argv[++i];
    else if (a === '--version' && argv[i + 1]) out.version = argv[++i];
    else if (a === '--description' && argv[i + 1]) out.description = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node scripts/generate_theme_from_txt.js --in <path/to/*.txt> --out <path/to/theme.json> [options]');
      console.log('\nOptions:');
      console.log('  --name "Theme Name"      Set the theme display name');
      console.log('  --full-extension         Generate complete VS Code extension structure');
      console.log('  --publisher <name>       Set publisher name (for package.json)');
      console.log('  --version <version>      Set initial version (default: 0.0.1)');
      console.log('  --description <text>     Set theme description');
      console.log('\nExamples:');
      console.log('  # Generate just the theme file:');
      console.log('  node scripts/generate_theme_from_txt.js --in theme.txt --out theme.json');
      console.log('\n  # Generate complete extension:');
      console.log('  node scripts/generate_theme_from_txt.js --in theme.txt --out my-theme/themes/theme.json --full-extension --publisher myname');
      process.exit(0);
    }
  }
  if (!out.inPath || !out.outPath) {
    console.error('Error: --in and --out are required.');
    process.exit(1);
  }
  
  // Auto-detect if we should create full extension (when output path suggests new directory structure)
  if (!out.fullExtension && out.outPath.includes('/themes/')) {
    const parentDir = path.dirname(path.dirname(out.outPath));
    if (!fs.existsSync(parentDir) || !fs.existsSync(path.join(parentDir, 'package.json'))) {
      out.fullExtension = true;
      console.log('Auto-detected new extension creation. Generating full extension structure...');
    }
  }
  
  return out;
}

function readText(p) { return fs.readFileSync(p, 'utf8'); }

// Validation and processing constants
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_LINES = 10000;
const MAX_CONFIG_LINES = 1000;
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_LENGTH = 200;
const MAX_PALETTE_INDEX = 255;
const FILE_MODE_READABLE = 0o644;
const VALID_HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const VALID_KEY_REGEX = /^[a-z0-9_-]+$/i;

// Alpha transparency constants
const ALPHA_VALUES = {
  VERY_LIGHT: 0x08,
  LIGHT: 0x15,
  MEDIUM_LIGHT: 0x20,
  MEDIUM: 0x30,
  MEDIUM_DARK: 0x40,
  DARK: 0x60,
  VERY_DARK: 0x80
};

function validateAndSanitizeColorValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return VALID_HEX_REGEX.test(trimmed) ? trimmed : null;
}

function parseTxt(filePath) {
  // Validate file path
  if (typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }
  
  let text;
  try {
    text = readText(filePath);
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
  
  // Validate file size
  if (text.length > MAX_FILE_SIZE) {
    throw new Error('File too large (maximum 1MB)');
  }
  
  const lines = text.split(/\r?\n/);
  
  // Validate line count
  if (lines.length > MAX_LINES) {
    throw new Error('File has too many lines (maximum 10,000)');
  }
  
  const data = { palette: {}, meta: {} };
  let processedLines = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    
    processedLines++;
    if (processedLines > MAX_CONFIG_LINES) {
      console.warn('Too many configuration lines, truncating');
      break;
    }
    
    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const keyPart = line.slice(0, eq).trim();
    const valuePart = line.slice(eq + 1).trim();
    
    // Validate key length
    if (keyPart.length > MAX_KEY_LENGTH) {
      console.warn(`Skipping line with overly long key: ${keyPart.substring(0, 20)}...`);
      continue;
    }

    if (/^palette\b/i.test(keyPart)) {
      const m = line.match(/palette\s*=\s*(\d+)\s*=\s*(#[0-9a-fA-F]{3,8})/);
      if (m) {
        const paletteIndex = parseInt(m[1], 10);
        const colorValue = validateAndSanitizeColorValue(m[2]);
        
        // Validate palette index range
        if (paletteIndex >= 0 && paletteIndex <= MAX_PALETTE_INDEX && colorValue) {
          data.palette[paletteIndex] = colorValue;
        } else {
          console.warn(`Invalid palette entry: ${line}`);
        }
      }
      continue;
    }

    const normalizedKey = keyPart.replace(/\s+/g, '').toLowerCase();
    
    // Validate key format
    if (!VALID_KEY_REGEX.test(normalizedKey)) {
      console.warn(`Skipping line with invalid key format: ${keyPart}`);
      continue;
    }
    
    // Validate and sanitize color values for known color properties
    if (normalizedKey.includes('color') || normalizedKey.includes('background') || normalizedKey.includes('foreground')) {
      const sanitizedValue = validateAndSanitizeColorValue(valuePart);
      if (sanitizedValue) {
        data.meta[normalizedKey] = sanitizedValue;
      } else {
        console.warn(`Invalid color value for ${normalizedKey}: ${valuePart}`);
      }
    } else {
      // For non-color values, limit length and sanitize
      const sanitizedValue = valuePart.length > MAX_VALUE_LENGTH ? valuePart.substring(0, MAX_VALUE_LENGTH) : valuePart;
      data.meta[normalizedKey] = sanitizedValue;
    }
  }

  return data;
}

function hexNormalize(hex) {
  if (!hex) return hex;
  const m = String(hex).trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  return m ? `#${m[1]}` : hex;
}

function withAlpha(hex, a) {
  // Accept hex #rgb, #rrggbb -> return #rrggbbaa (append alpha byte)
  // If already #rrggbbaa, replace alpha
  if (!hex) return hex;
  let h = hexNormalize(hex).toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(h)) return hex;
  if (h.length === 4) {
    // #rgb -> #rrggbb
    const r = h[1], g = h[2], b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (h.length === 9) {
    return `${h.slice(0, 7)}${a.toString(16).padStart(2, '0')}`;
  }
  return `${h}${a.toString(16).padStart(2, '0')}`;
}

function resolveName(inPath, explicitName, meta) {
  if (explicitName) return explicitName;
  if (meta && meta['name']) return meta['name'];
  const base = path.basename(inPath).replace(/\.[^.]+$/, '');
  return `${base} (Dark)`;
}

function roleMap(parsed) {
  const p = parsed.palette;
  // Defaults derived from common terminal palette conventions
  const bg = hexNormalize(parsed.meta['background'] || p[0] || '#1d1d26');
  const fg = hexNormalize(parsed.meta['foreground'] || p[7] || '#cbcbf0');
  const accent = hexNormalize(parsed.meta['accent-color'] || p[1] || fg);
  const dim = hexNormalize(parsed.meta['dim-color'] || p[8] || '#565b62');
  const uiBg = hexNormalize(parsed.meta['ui-bg-color'] || p[0] || bg);
  const uiFg = hexNormalize(parsed.meta['ui-fg-color'] || p[7] || fg);

  return {
    bg, fg, dim, accent, uiBg, uiFg,
    red: hexNormalize(p[1] || '#ff5f5f'),
    green: hexNormalize(p[2] || '#5fff5f'),
    yellow: hexNormalize(p[3] || '#ffff5f'),
    blue: hexNormalize(p[4] || '#5fafff'),
    magenta: hexNormalize(p[5] || '#ff5fff'),
    cyan: hexNormalize(p[6] || '#5fffff'),
    white: hexNormalize(p[7] || '#e0e0e0'),
    brightBlack: hexNormalize(p[8] || '#808080'),
    brightRed: hexNormalize(p[9] || p[1] || '#ff7f7f'),
    brightGreen: hexNormalize(p[10] || p[2] || '#7fff7f'),
    brightYellow: hexNormalize(p[11] || p[3] || '#ffff7f'),
    brightBlue: hexNormalize(p[12] || p[4] || '#7fbfff'),
    brightMagenta: hexNormalize(p[13] || p[5] || '#ff7fff'),
    brightCyan: hexNormalize(p[14] || p[6] || '#7fffff'),
    brightWhite: hexNormalize(p[15] || p[7] || '#ffffff'),
    cursor: hexNormalize(parsed.meta['cursor-color'] || accent || fg),
    cursorText: hexNormalize(parsed.meta['cursor-text'] || bg),
    selBg: hexNormalize(parsed.meta['selection-background'] || withAlpha(accent, ALPHA_VALUES.MEDIUM)),
    selFg: hexNormalize(parsed.meta['selection-foreground'] || bg),
  };
}

function tokenColorsFromRoles(R) {
  const t = [];
  t.push({
    name: 'Comments',
    scope: [
      'comment', 'punctuation.definition.comment', 'comment punctuation',
      'comment.block punctuation', 'comment.line punctuation'
    ],
    settings: { foreground: R.dim, fontStyle: 'italic' },
  });
  t.push({ name: 'Variables', scope: ['variable', 'string constant.other.placeholder'], settings: { foreground: R.fg } });
  t.push({ name: 'Keywords', scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: R.green } });
  t.push({ name: 'Operators and Punctuation', scope: ['keyword.control','punctuation','meta.tag','punctuation.definition.tag','punctuation.section.embedded'], settings: { foreground: R.magenta } });
  t.push({ name: 'Tags', scope: ['entity.name.tag','meta.tag.sgml','markup.deleted.git_gutter'], settings: { foreground: R.yellow } });
  t.push({ name: 'Functions', scope: ['entity.name.function','meta.function-call','variable.function','support.function','keyword.other.special-method'], settings: { foreground: R.blue } });
  t.push({ name: 'Numbers, Constants, Params', scope: ['constant.numeric','constant.language','support.constant','constant.character','constant.escape','variable.parameter','keyword.other.unit'], settings: { foreground: R.brightRed } });
  t.push({ name: 'Strings', scope: ['string','constant.other.symbol','constant.other.key','entity.other.inherited-class','markup.heading','markup.inserted.git_gutter'], settings: { foreground: R.red } });
  t.push({ name: 'Types and Classes', scope: ['entity.name','support.type','support.class','support.other.namespace.use.php','support.type.sys-types'], settings: { foreground: R.magenta } });
  t.push({ name: 'Attributes', scope: ['entity.other.attribute-name'], settings: { foreground: R.green } });
  t.push({ name: 'HTML Attributes', scope: ['text.html.basic entity.other.attribute-name.html','text.html.basic entity.other.attribute-name'], settings: { foreground: R.magenta, fontStyle: 'italic' } });
  t.push({ name: 'Property Names', scope: ['support.type.property-name','meta.property-name','entity.name.tag.yaml'], settings: { foreground: R.blue } });
  // Minimal URL styling
  t.push({ name: 'URL', scope: ['*url*','*link*','*uri*'], settings: { fontStyle: 'underline' } });
  return t;
}

function tinaciousJsonRainbowTokenColors() {
  const colours = ['#00CECA','#00BFFF','#8590EC','#FE3698','#FF7086','#ffb070','#FCCC66','#BBCE65','#59D065'];
  const supportedColours = colours.concat(colours, colours, colours);
  const prefix = 'source.json';
  const structure = 'meta.structure.dictionary.json';
  const value = 'meta.structure.dictionary.value.json';
  const suffix = 'support.type.property-name.json';
  const buildScope = (level) => {
    let repeated = [];
    for (let i = 0; i <= level; i++) {
      if (i === 0) repeated = repeated.concat([structure]);
      else repeated = repeated.concat([value, structure]);
    }
    return [prefix].concat(repeated).concat(suffix).join(' ');
  };
  return supportedColours.map((colour, i) => ({ name: `JSON Key - Level ${i}`, scope: [buildScope(i)], settings: { foreground: colour } }));
}

function buildColors(R) {
  const c = {};
  // Editor core
  c['editor.background'] = R.bg;
  c['editor.foreground'] = R.fg;
  c['editorLineNumber.foreground'] = withAlpha(R.brightBlack, ALPHA_VALUES.MEDIUM_DARK);
  c['editorLineNumber.activeForeground'] = R.fg;
  c['editorCursor.foreground'] = R.cursor;
  c['editorCursor.background'] = R.bg;

  // Selections and highlights
  c['editor.selectionBackground'] = withAlpha(R.accent || R.cursor, ALPHA_VALUES.MEDIUM);
  c['editor.selectionHighlightBackground'] = withAlpha(R.accent || R.cursor, ALPHA_VALUES.MEDIUM_LIGHT);
  c['editor.inactiveSelectionBackground'] = withAlpha(R.accent || R.cursor, ALPHA_VALUES.LIGHT);
  c['editor.lineHighlightBackground'] = withAlpha(R.fg, 0x08);
  c['editor.lineHighlightBorder'] = '#00000000';
  c['editor.wordHighlightBackground'] = withAlpha(R.blue, 0x20);
  c['editor.wordHighlightStrongBackground'] = withAlpha(R.blue, 0x30);
  c['editor.wordHighlightBorder'] = '#00000000';
  c['editor.wordHighlightStrongBorder'] = '#00000000';

  // Find & Search
  c['editor.findMatchBackground'] = withAlpha(R.yellow, 0x40);
  c['editor.findMatchHighlightBackground'] = withAlpha(R.yellow, 0x25);
  c['editor.findRangeHighlightBackground'] = withAlpha(R.yellow, 0x15);
  c['editor.findMatchBorder'] = R.yellow;
  c['editor.findMatchHighlightBorder'] = '#00000000';
  c['editor.rangeHighlightBackground'] = withAlpha(R.yellow, 0x20);
  c['searchEditor.findMatchBackground'] = withAlpha(R.yellow, 0x40);

  // Brackets & Guides
  c['editorBracketMatch.background'] = withAlpha(R.brightBlack, ALPHA_VALUES.MEDIUM);
  c['editorBracketMatch.border'] = withAlpha(R.brightBlack, 0x50);
  c['editorBracketHighlight.foreground1'] = R.cyan;
  c['editorBracketHighlight.foreground2'] = R.magenta;
  c['editorBracketHighlight.foreground3'] = R.yellow;
  c['editorBracketHighlight.foreground4'] = R.blue;
  c['editorBracketHighlight.foreground5'] = R.green;
  c['editorBracketHighlight.foreground6'] = R.brightRed;
  c['editorBracketHighlight.unexpectedBracket.foreground'] = R.red;

  // Indent guides & ruler
  for (let i = 1; i <= 6; i++) {
    c[`editorIndentGuide.background${i}`] = withAlpha(R.brightBlack, 0x15 + i * 0x05);
    c[`editorIndentGuide.activeBackground${i}`] = withAlpha(R.brightBlack, 0x30 + i * 0x05);
  }
  c['editorRuler.foreground'] = withAlpha(R.brightBlack, 0x20);

  // Whitespace
  c['editorWhitespace.foreground'] = withAlpha(R.brightBlack, 0x20);
  c['editorLink.activeForeground'] = R.blue;

  // Editor widgets
  const widgetBg = shade(R.bg, 0x06);
  c['editorWidget.background'] = widgetBg;
  c['editorWidget.foreground'] = R.fg;
  c['editorWidget.border'] = withAlpha(R.brightBlack, 0x40);
  c['editorWidget.resizeBorder'] = withAlpha(R.brightBlack, 0x40);
  c['editorSuggestWidget.background'] = widgetBg;
  c['editorSuggestWidget.border'] = withAlpha(R.brightBlack, 0x40);
  c['editorSuggestWidget.foreground'] = R.fg;
  c['editorSuggestWidget.highlightForeground'] = R.yellow;
  c['editorSuggestWidget.selectedBackground'] = withAlpha(R.accent, 0x20);
  c['editorSuggestWidget.selectedForeground'] = R.fg;
  c['editorSuggestWidget.focusHighlightForeground'] = R.yellow;
  c['editorSuggestWidget.selectedIconForeground'] = R.yellow;
  c['editorHoverWidget.background'] = widgetBg;
  c['editorHoverWidget.border'] = withAlpha(R.brightBlack, 0x40);
  c['editorHoverWidget.foreground'] = R.fg;
  c['editorHoverWidget.statusBarBackground'] = shade(R.bg, 0x09);

  // Markers & decorations
  c['editorError.foreground'] = R.red;
  c['editorError.background'] = withAlpha(R.red, 0x20);
  c['editorError.border'] = '#00000000';
  c['editorWarning.foreground'] = R.yellow;
  c['editorWarning.background'] = withAlpha(R.yellow, 0x20);
  c['editorWarning.border'] = '#00000000';
  c['editorInfo.foreground'] = R.blue;
  c['editorInfo.background'] = withAlpha(R.blue, 0x20);
  c['editorInfo.border'] = '#00000000';
  c['editorHint.foreground'] = R.green;
  c['editorHint.border'] = '#00000000';

  // Gutter
  c['editorGutter.background'] = R.bg;
  c['editorGutter.modifiedBackground'] = R.yellow;
  c['editorGutter.addedBackground'] = R.green;
  c['editorGutter.deletedBackground'] = R.red;
  c['editorGutter.foldingControlForeground'] = withAlpha(R.brightBlack, 0x60);
  c['editorGutter.commentRangeForeground'] = withAlpha(R.brightBlack, 0x60);

  // Diff editor
  c['diffEditor.insertedTextBackground'] = withAlpha(R.green, 0x20);
  c['diffEditor.insertedTextBorder'] = '#00000000';
  c['diffEditor.removedTextBackground'] = withAlpha(R.red, 0x20);
  c['diffEditor.removedTextBorder'] = '#00000000';
  c['diffEditor.border'] = withAlpha(R.brightBlack, 0x40);
  c['diffEditor.diagonalFill'] = withAlpha(R.brightBlack, 0x20);
  c['diffEditor.insertedLineBackground'] = withAlpha(R.green, 0x15);
  c['diffEditor.removedLineBackground'] = withAlpha(R.red, 0x15);

  // Overview ruler
  c['editorOverviewRuler.border'] = '#00000000';
  c['editorOverviewRuler.findMatchForeground'] = withAlpha(R.yellow, 0x80);
  c['editorOverviewRuler.rangeHighlightForeground'] = withAlpha(R.yellow, 0x60);
  c['editorOverviewRuler.selectionHighlightForeground'] = withAlpha(R.accent, 0x60);
  c['editorOverviewRuler.wordHighlightForeground'] = withAlpha(R.blue, 0x60);
  c['editorOverviewRuler.wordHighlightStrongForeground'] = withAlpha(R.blue, 0x80);
  c['editorOverviewRuler.modifiedForeground'] = withAlpha(R.yellow, 0x80);
  c['editorOverviewRuler.addedForeground'] = withAlpha(R.green, 0x80);
  c['editorOverviewRuler.deletedForeground'] = withAlpha(R.red, 0x80);
  c['editorOverviewRuler.errorForeground'] = withAlpha(R.red, 0x80);
  c['editorOverviewRuler.warningForeground'] = withAlpha(R.yellow, 0x80);
  c['editorOverviewRuler.infoForeground'] = withAlpha(R.blue, 0x80);
  c['editorOverviewRuler.bracketMatchForeground'] = withAlpha(R.brightBlack, 0x60);

  // Activity Bar
  c['activityBar.background'] = R.uiBg;
  c['activityBar.foreground'] = mix(R.uiFg, R.fg);
  c['activityBar.inactiveForeground'] = withAlpha(R.brightBlack, 0x80);
  c['activityBar.border'] = '#00000000';
  c['activityBar.activeBorder'] = R.accent;
  c['activityBar.activeBackground'] = withAlpha(R.accent, 0x15);
  c['activityBar.activeFocusBorder'] = R.accent;
  c['activityBar.dropBorder'] = R.accent;
  c['activityBarBadge.background'] = R.accent;
  c['activityBarBadge.foreground'] = R.bg;

  // Sidebar
  c['sideBar.background'] = R.uiBg;
  c['sideBar.foreground'] = mix(R.uiFg, R.fg);
  c['sideBar.border'] = '#00000000';
  c['sideBar.dropBackground'] = withAlpha(R.accent, 0x20);
  c['sideBarTitle.foreground'] = mix(R.uiFg, R.fg);
  c['sideBarSectionHeader.background'] = shade(R.bg, 0x06);
  c['sideBarSectionHeader.foreground'] = mix(R.uiFg, R.fg);
  c['sideBarSectionHeader.border'] = '#00000000';

  // List & Tree
  c['list.activeSelectionBackground'] = withAlpha(R.accent, 0x20);
  c['list.activeSelectionForeground'] = mix(R.uiFg, R.fg);
  c['list.activeSelectionIconForeground'] = R.fg;
  c['list.inactiveSelectionBackground'] = withAlpha(R.accent, 0x15);
  c['list.inactiveSelectionForeground'] = mix(R.uiFg, R.fg);
  c['list.inactiveSelectionIconForeground'] = R.fg;
  c['list.hoverBackground'] = withAlpha(R.brightBlack, 0x20);
  c['list.hoverForeground'] = mix(R.uiFg, R.fg);
  c['list.focusBackground'] = withAlpha(R.accent, 0x20);
  c['list.focusForeground'] = mix(R.uiFg, R.fg);
  c['list.focusHighlightForeground'] = R.yellow;
  c['list.focusOutline'] = withAlpha(R.accent, 0x40);
  c['list.focusAndSelectionOutline'] = withAlpha(R.accent, 0x60);
  c['list.highlightForeground'] = R.yellow;
  c['list.dropBackground'] = withAlpha(R.accent, 0x20);
  c['list.deemphasizedForeground'] = withAlpha(R.brightBlack, 0x80);
  c['list.errorForeground'] = R.red;
  c['list.warningForeground'] = R.yellow;
  c['tree.indentGuidesStroke'] = withAlpha(R.brightBlack, 0x40);
  c['tree.tableColumnsBorder'] = withAlpha(R.brightBlack, 0x20);
  c['tree.tableOddRowsBackground'] = withAlpha(R.brightBlack, 0x08);

  // Tabs & Groups
  c['tab.activeBackground'] = R.bg;
  c['tab.activeForeground'] = mix(R.uiFg, R.fg);
  c['tab.border'] = '#00000000';
  c['tab.activeBorder'] = '#00000000';
  c['tab.activeBorderTop'] = R.accent;
  c['tab.inactiveBackground'] = R.uiBg;
  c['tab.inactiveForeground'] = withAlpha(R.brightBlack, 0x80);
  c['tab.hoverBackground'] = shade(R.bg, 0x06);
  c['tab.hoverForeground'] = mix(R.uiFg, R.fg);
  c['tab.hoverBorder'] = '#00000000';
  c['tab.unfocusedActiveBackground'] = R.bg;
  c['tab.unfocusedActiveForeground'] = withAlpha(R.fg, 0xa0);
  c['tab.unfocusedActiveBorderTop'] = withAlpha(R.accent, 0x60);
  c['tab.unfocusedInactiveBackground'] = R.uiBg;
  c['tab.unfocusedInactiveForeground'] = withAlpha(R.brightBlack, 0x60);
  c['tab.unfocusedHoverBackground'] = shade(R.bg, 0x06);
  c['tab.unfocusedHoverForeground'] = R.fg;
  c['tab.unfocusedHoverBorder'] = '#00000000';
  c['tab.activeModifiedBorder'] = R.yellow;
  c['tab.inactiveModifiedBorder'] = withAlpha(R.yellow, 0x60);
  c['tab.unfocusedActiveModifiedBorder'] = withAlpha(R.yellow, 0x80);
  c['tab.unfocusedInactiveModifiedBorder'] = withAlpha(R.yellow, 0x40);
  c['editorGroupHeader.tabsBackground'] = R.uiBg;
  c['editorGroupHeader.tabsBorder'] = '#00000000';
  c['editorGroupHeader.noTabsBackground'] = R.uiBg;
  c['editorGroupHeader.border'] = '#00000000';
  c['editorGroup.border'] = withAlpha(R.brightBlack, 0x40);
  c['editorGroup.dropBackground'] = withAlpha(R.accent, 0x20);
  c['editorGroup.emptyBackground'] = R.bg;
  c['editorGroup.focusedEmptyBorder'] = R.accent;
  c['editorGroup.dropIntoPromptBackground'] = shade(R.bg, 0x06);
  c['editorGroup.dropIntoPromptForeground'] = R.fg;
  c['editorGroup.dropIntoPromptBorder'] = withAlpha(R.brightBlack, 0x40);

  // Breadcrumbs
  c['breadcrumb.foreground'] = withAlpha(R.brightBlack, 0x80);
  c['breadcrumb.background'] = R.bg;
  c['breadcrumb.focusForeground'] = R.fg;
  c['breadcrumb.activeSelectionForeground'] = R.fg;
  c['breadcrumbPicker.background'] = shade(R.bg, 0x06);

  // Scrollbar
  c['scrollbar.shadow'] = withAlpha('#000000', 0x40);
  c['scrollbarSlider.background'] = withAlpha(R.brightBlack, 0x20);
  c['scrollbarSlider.hoverBackground'] = withAlpha(R.brightBlack, 0x40);
  c['scrollbarSlider.activeBackground'] = withAlpha(R.brightBlack, 0x60);

  // Minimap
  c['minimap.findMatchHighlight'] = withAlpha(R.yellow, 0x60);
  c['minimap.selectionHighlight'] = withAlpha(R.accent, 0x40);
  c['minimap.errorHighlight'] = withAlpha(R.red, 0x80);
  c['minimap.warningHighlight'] = withAlpha(R.yellow, 0x80);
  c['minimap.background'] = R.bg;
  c['minimap.foregroundOpacity'] = '#000000a0';
  c['minimap.selectionOccurrenceHighlight'] = withAlpha(R.accent, 0x60);
  c['minimapSlider.background'] = withAlpha(R.brightBlack, 0x20);
  c['minimapSlider.hoverBackground'] = withAlpha(R.brightBlack, 0x30);
  c['minimapSlider.activeBackground'] = withAlpha(R.brightBlack, 0x40);
  c['minimapGutter.addedBackground'] = R.green;
  c['minimapGutter.modifiedBackground'] = R.yellow;
  c['minimapGutter.deletedBackground'] = R.red;

  // Inputs
  const inputBg = shade(R.bg, 0x09);
  c['input.background'] = inputBg;
  c['input.border'] = withAlpha(R.brightBlack, 0x40);
  c['input.foreground'] = mix(R.uiFg, R.fg);
  c['input.placeholderForeground'] = withAlpha(R.brightBlack, 0x80);
  c['inputOption.activeBackground'] = withAlpha(R.accent, 0x30);
  c['inputOption.activeBorder'] = R.accent;
  c['inputOption.activeForeground'] = R.fg;
  c['inputOption.hoverBackground'] = withAlpha(R.brightBlack, 0x20);
  c['inputValidation.errorBackground'] = inputBg;
  c['inputValidation.errorBorder'] = R.red;
  c['inputValidation.errorForeground'] = R.red;
  c['inputValidation.infoBackground'] = inputBg;
  c['inputValidation.infoBorder'] = R.blue;
  c['inputValidation.infoForeground'] = R.blue;
  c['inputValidation.warningBackground'] = inputBg;
  c['inputValidation.warningBorder'] = R.yellow;
  c['inputValidation.warningForeground'] = R.yellow;

  // Dropdown
  c['dropdown.background'] = inputBg;
  c['dropdown.listBackground'] = shade(R.bg, 0x06);
  c['dropdown.border'] = withAlpha(R.brightBlack, 0x40);
  c['dropdown.foreground'] = mix(R.uiFg, R.fg);

  // Buttons
  c['button.background'] = R.accent;
  c['button.foreground'] = R.bg;
  c['button.hoverBackground'] = R.brightRed;
  c['button.secondaryBackground'] = withAlpha(R.brightBlack, 0x40);
  c['button.secondaryForeground'] = R.fg;
  c['button.secondaryHoverBackground'] = withAlpha(R.brightBlack, 0x60);
  c['button.border'] = '#00000000';
  c['button.separator'] = withAlpha(R.bg, 0x40);

  // Checkbox
  c['checkbox.background'] = inputBg;
  c['checkbox.foreground'] = mix(R.uiFg, R.fg);
  c['checkbox.border'] = withAlpha(R.brightBlack, 0x40);
  c['checkbox.selectBackground'] = R.accent;
  c['checkbox.selectBorder'] = '#00000000';

  // Status Bar
  c['statusBar.background'] = R.uiBg;
  c['statusBar.foreground'] = mix(R.uiFg, R.fg);
  c['statusBar.border'] = '#00000000';
  c['statusBar.debuggingBackground'] = R.accent;
  c['statusBar.debuggingForeground'] = R.bg;
  c['statusBar.debuggingBorder'] = '#00000000';
  c['statusBar.noFolderBackground'] = R.uiBg;
  c['statusBar.noFolderForeground'] = R.fg;
  c['statusBar.noFolderBorder'] = '#00000000';
  c['statusBarItem.activeBackground'] = withAlpha(R.accent, 0x20);
  c['statusBarItem.hoverBackground'] = withAlpha(R.brightBlack, 0x20);
  c['statusBarItem.hoverForeground'] = R.fg;
  c['statusBarItem.prominentForeground'] = R.fg;
  c['statusBarItem.prominentBackground'] = '#00000000';
  c['statusBarItem.prominentHoverBackground'] = withAlpha(R.brightBlack, 0x20);
  c['statusBarItem.prominentHoverForeground'] = R.fg;
  c['statusBarItem.remoteBackground'] = R.blue;
  c['statusBarItem.remoteForeground'] = R.bg;
  c['statusBarItem.remoteHoverBackground'] = R.cyan;
  c['statusBarItem.remoteHoverForeground'] = R.bg;
  c['statusBarItem.errorBackground'] = R.red;
  c['statusBarItem.errorForeground'] = R.bg;
  c['statusBarItem.errorHoverBackground'] = R.brightRed;
  c['statusBarItem.errorHoverForeground'] = R.bg;
  c['statusBarItem.warningBackground'] = R.yellow;
  c['statusBarItem.warningForeground'] = R.bg;
  c['statusBarItem.warningHoverBackground'] = R.brightYellow;
  c['statusBarItem.warningHoverForeground'] = R.bg;
  c['statusBarItem.compactHoverBackground'] = withAlpha(R.brightBlack, 0x20);
  c['statusBarItem.focusBorder'] = R.accent;

  // Title Bar
  c['titleBar.activeBackground'] = R.uiBg;
  c['titleBar.activeForeground'] = mix(R.uiFg, R.fg);
  c['titleBar.inactiveBackground'] = R.uiBg;
  c['titleBar.inactiveForeground'] = withAlpha(R.brightBlack, 0x80);
  c['titleBar.border'] = '#00000000';

  // Menu Bar
  c['menubar.selectionForeground'] = mix(R.uiFg, R.fg);
  c['menubar.selectionBackground'] = withAlpha(R.accent, 0x20);
  c['menubar.selectionBorder'] = '#00000000';
  c['menu.foreground'] = mix(R.uiFg, R.fg);
  c['menu.background'] = shade(R.bg, 0x06);
  c['menu.selectionForeground'] = mix(R.uiFg, R.fg);
  c['menu.selectionBackground'] = withAlpha(R.accent, 0x20);
  c['menu.selectionBorder'] = '#00000000';
  c['menu.separatorBackground'] = withAlpha(R.brightBlack, 0x40);
  c['menu.border'] = withAlpha(R.brightBlack, 0x40);

  // Command Center
  c['commandCenter.foreground'] = mix(R.uiFg, R.fg);
  c['commandCenter.activeForeground'] = mix(R.uiFg, R.fg);
  c['commandCenter.background'] = inputBg;
  c['commandCenter.activeBackground'] = withAlpha(R.brightBlack, 0x20);
  c['commandCenter.border'] = withAlpha(R.brightBlack, 0x40);
  c['commandCenter.inactiveForeground'] = withAlpha(R.brightBlack, 0x80);
  c['commandCenter.inactiveBorder'] = withAlpha(R.brightBlack, 0x20);
  c['commandCenter.activeBorder'] = R.accent;

  // Notifications
  c['notificationCenter.border'] = withAlpha(R.brightBlack, 0x40);
  c['notificationCenterHeader.foreground'] = mix(R.uiFg, R.fg);
  c['notificationCenterHeader.background'] = shade(R.bg, 0x06);
  c['notificationToast.border'] = withAlpha(R.brightBlack, 0x40);
  c['notifications.foreground'] = mix(R.uiFg, R.fg);
  c['notifications.background'] = shade(R.bg, 0x06);
  c['notifications.border'] = withAlpha(R.brightBlack, 0x40);
  c['notificationLink.foreground'] = R.blue;
  c['notificationsErrorIcon.foreground'] = R.red;
  c['notificationsWarningIcon.foreground'] = R.yellow;
  c['notificationsInfoIcon.foreground'] = R.blue;

  // Banner
  c['banner.background'] = shade(R.bg, 0x06);
  c['banner.foreground'] = mix(R.uiFg, R.fg);
  c['banner.iconForeground'] = R.blue;

  // Quick Input
  c['pickerGroup.border'] = withAlpha(R.brightBlack, 0x40);
  c['pickerGroup.foreground'] = R.blue;
  c['quickInput.background'] = shade(R.bg, 0x06);
  c['quickInput.foreground'] = mix(R.uiFg, R.fg);
  c['quickInputList.focusBackground'] = withAlpha(R.accent, 0x20);
  c['quickInputList.focusForeground'] = mix(R.uiFg, R.fg);
  c['quickInputList.focusIconForeground'] = R.fg;
  c['quickInputTitle.background'] = inputBg;

  // Keybinding
  c['keybindingLabel.background'] = withAlpha(R.brightBlack, 0x20);
  c['keybindingLabel.foreground'] = mix(R.uiFg, R.fg);
  c['keybindingLabel.border'] = withAlpha(R.brightBlack, 0x40);
  c['keybindingLabel.bottomBorder'] = withAlpha(R.brightBlack, 0x40);

  // Terminal (map ansi 0..15)
  c['terminal.background'] = R.bg;
  c['terminal.foreground'] = R.fg;
  c['terminal.ansiBlack'] = R.uiBg;
  c['terminal.ansiRed'] = R.red;
  c['terminal.ansiGreen'] = R.green;
  c['terminal.ansiYellow'] = R.yellow;
  c['terminal.ansiBlue'] = R.blue;
  c['terminal.ansiMagenta'] = R.magenta;
  c['terminal.ansiCyan'] = R.cyan;
  c['terminal.ansiWhite'] = R.white;
  c['terminal.ansiBrightBlack'] = R.brightBlack;
  c['terminal.ansiBrightRed'] = R.brightRed;
  c['terminal.ansiBrightGreen'] = R.brightGreen;
  c['terminal.ansiBrightYellow'] = R.brightYellow;
  c['terminal.ansiBrightBlue'] = R.brightBlue;
  c['terminal.ansiBrightMagenta'] = R.brightMagenta;
  c['terminal.ansiBrightCyan'] = R.brightCyan;
  c['terminal.ansiBrightWhite'] = R.brightWhite;
  c['terminal.selectionBackground'] = withAlpha(R.accent, 0x30);
  c['terminal.selectionForeground'] = '#00000000';
  c['terminal.inactiveSelectionBackground'] = withAlpha(R.accent, 0x20);
  c['terminal.findMatchBackground'] = withAlpha(R.yellow, 0x40);
  c['terminal.findMatchHighlightBackground'] = withAlpha(R.yellow, 0x25);
  c['terminal.findMatchBorder'] = R.yellow;
  c['terminal.findMatchHighlightBorder'] = '#00000000';
  c['terminal.dropBackground'] = withAlpha(R.accent, 0x20);
  c['terminal.border'] = withAlpha(R.brightBlack, 0x40);
  c['terminal.hoverHighlightBackground'] = withAlpha(R.brightBlack, 0x20);
  c['terminal.tab.activeBorder'] = R.accent;
  c['terminalCursor.background'] = R.bg;
  c['terminalCursor.foreground'] = R.cursor;
  c['terminalCommandDecoration.defaultBackground'] = withAlpha(R.brightBlack, 0x40);
  c['terminalCommandDecoration.successBackground'] = R.green;
  c['terminalCommandDecoration.errorBackground'] = R.red;
  c['terminalOverviewRuler.cursorForeground'] = withAlpha(R.accent, 0x80);
  c['terminalOverviewRuler.findMatchForeground'] = withAlpha(R.yellow, 0x80);

  // Panel
  c['panel.background'] = R.bg;
  c['panel.border'] = withAlpha(R.brightBlack, 0x40);
  c['panel.dropBorder'] = R.accent;
  c['panelTitle.activeBorder'] = R.accent;
  c['panelTitle.activeForeground'] = mix(R.uiFg, R.fg);
  c['panelTitle.inactiveForeground'] = withAlpha(R.brightBlack, 0x80);
  c['panelInput.border'] = withAlpha(R.brightBlack, 0x40);
  c['panelSection.border'] = withAlpha(R.brightBlack, 0x40);
  c['panelSection.dropBackground'] = withAlpha(R.accent, 0x20);
  c['panelSectionHeader.background'] = shade(R.bg, 0x06);
  c['panelSectionHeader.foreground'] = mix(R.uiFg, R.fg);
  c['panelSectionHeader.border'] = withAlpha(R.brightBlack, 0x40);

  // Badge & Progress
  c['badge.background'] = R.accent;
  c['badge.foreground'] = R.bg;
  c['progressBar.background'] = R.accent;

  // List Filter
  c['listFilterWidget.background'] = shade(R.bg, 0x06);
  c['listFilterWidget.outline'] = R.accent;
  c['listFilterWidget.noMatchesOutline'] = R.red;
  c['listFilterWidget.shadow'] = withAlpha('#000000', 0x40);

  // Inlay Hints
  c['editorInlayHint.background'] = withAlpha(R.brightBlack, 0x20);
  c['editorInlayHint.foreground'] = withAlpha(R.brightBlack, 0x80);
  c['editorInlayHint.typeForeground'] = withAlpha(R.brightBlack, 0x80);
  c['editorInlayHint.typeBackground'] = withAlpha(R.brightBlack, 0x20);
  c['editorInlayHint.parameterForeground'] = withAlpha(R.brightBlack, 0x80);
  c['editorInlayHint.parameterBackground'] = withAlpha(R.brightBlack, 0x20);

  // Sticky Scroll & Ghost Text & Code Lens
  c['editorStickyScroll.background'] = R.uiBg;
  c['editorStickyScrollHover.background'] = shade(R.bg, 0x06);
  c['editorGhostText.background'] = '#00000000';
  c['editorGhostText.foreground'] = withAlpha(R.brightBlack, 0x60);
  c['editorGhostText.border'] = '#00000000';
  c['editorCodeLens.foreground'] = withAlpha(R.brightBlack, 0x60);

  // Light Bulb
  c['editorLightBulb.foreground'] = R.yellow;
  c['editorLightBulbAutoFix.foreground'] = R.blue;

  // Notebook
  c['notebook.cellBorderColor'] = withAlpha(R.brightBlack, 0x40);
  c['notebook.cellHoverBackground'] = withAlpha(R.brightBlack, 0x10);
  c['notebook.cellInsertionIndicator'] = R.accent;
  c['notebook.cellStatusBarItemHoverBackground'] = withAlpha(R.brightBlack, 0x20);
  c['notebook.cellToolbarSeparator'] = withAlpha(R.brightBlack, 0x40);
  c['notebook.cellEditorBackground'] = shade(R.bg, 0x06);
  c['notebook.editorBackground'] = R.bg;
  c['notebook.focusedCellBackground'] = shade(R.bg, 0x06);
  c['notebook.focusedCellBorder'] = R.accent;
  c['notebook.focusedEditorBorder'] = R.accent;
  c['notebook.inactiveFocusedCellBorder'] = withAlpha(R.accent, 0x60);
  c['notebook.inactiveSelectedCellBorder'] = withAlpha(R.brightBlack, 0x40);
  c['notebook.outputContainerBackgroundColor'] = shade(R.bg, 0x06);
  c['notebook.outputContainerBorderColor'] = withAlpha(R.brightBlack, 0x40);
  c['notebook.selectedCellBackground'] = withAlpha(R.accent, 0x10);
  c['notebook.selectedCellBorder'] = withAlpha(R.brightBlack, 0x40);
  c['notebook.symbolHighlightBackground'] = withAlpha(R.yellow, 0x20);
  c['notebookScrollbarSlider.activeBackground'] = withAlpha(R.brightBlack, 0x60);
  c['notebookScrollbarSlider.background'] = withAlpha(R.brightBlack, 0x20);
  c['notebookScrollbarSlider.hoverBackground'] = withAlpha(R.brightBlack, 0x40);
  c['notebookStatusErrorIcon.foreground'] = R.red;
  c['notebookStatusRunningIcon.foreground'] = R.blue;
  c['notebookStatusSuccessIcon.foreground'] = R.green;

  // Charts
  c['charts.foreground'] = R.fg;
  c['charts.lines'] = withAlpha(R.brightBlack, 0x80);
  c['charts.red'] = R.red;
  c['charts.blue'] = R.blue;
  c['charts.yellow'] = R.yellow;
  c['charts.orange'] = R.brightRed;
  c['charts.green'] = R.green;
  c['charts.purple'] = R.magenta;

  // Ports
  c['ports.iconRunningProcessForeground'] = R.green;

  // Action Bar
  c['actionBar.toggledBackground'] = withAlpha(R.accent, 0x20);

  // Simple Find Widget
  c['simpleFindWidget.sashBorder'] = withAlpha(R.brightBlack, 0x40);

  // Profile Badge
  c['profileBadge.background'] = withAlpha(R.brightBlack, 0x40);
  c['profileBadge.foreground'] = mix(R.uiFg, R.fg);

  // Git Decorations
  c['gitDecoration.addedResourceForeground'] = R.green;
  c['gitDecoration.modifiedResourceForeground'] = R.yellow;
  c['gitDecoration.deletedResourceForeground'] = R.red;
  c['gitDecoration.renamedResourceForeground'] = R.blue;
  c['gitDecoration.stageModifiedResourceForeground'] = R.yellow;
  c['gitDecoration.stageDeletedResourceForeground'] = R.red;
  c['gitDecoration.untrackedResourceForeground'] = R.green;
  c['gitDecoration.ignoredResourceForeground'] = withAlpha(R.brightBlack, 0x60);
  c['gitDecoration.conflictingResourceForeground'] = R.magenta;
  c['gitDecoration.submoduleResourceForeground'] = R.blue;

  // Settings
  c['settings.headerForeground'] = mix(R.uiFg, R.fg);
  c['settings.modifiedItemIndicator'] = R.yellow;
  c['settings.dropdownBackground'] = inputBg;
  c['settings.dropdownForeground'] = mix(R.uiFg, R.fg);
  c['settings.dropdownBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.dropdownListBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.textInputBackground'] = inputBg;
  c['settings.textInputForeground'] = mix(R.uiFg, R.fg);
  c['settings.textInputBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.numberInputBackground'] = inputBg;
  c['settings.numberInputForeground'] = mix(R.uiFg, R.fg);
  c['settings.numberInputBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.focusedRowBackground'] = withAlpha(R.brightBlack, 0x10);
  c['settings.focusedRowBorder'] = R.accent;
  c['settings.rowHoverBackground'] = withAlpha(R.brightBlack, 0x10);
  c['settings.checkboxBackground'] = inputBg;
  c['settings.checkboxForeground'] = mix(R.uiFg, R.fg);
  c['settings.checkboxBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.sashBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.headerBorder'] = withAlpha(R.brightBlack, 0x40);
  c['settings.settingsHeaderHoverForeground'] = mix(R.uiFg, R.fg);

  // Peek View
  c['peekView.border'] = R.accent;
  c['peekViewEditor.background'] = shade(R.bg, 0x06);
  c['peekViewEditorGutter.background'] = shade(R.bg, 0x06);
  c['peekViewEditor.matchHighlightBackground'] = withAlpha(R.yellow, 0x40);
  c['peekViewEditor.matchHighlightBorder'] = '#00000000';
  c['peekViewResult.background'] = shade(R.bg, 0x06);
  c['peekViewResult.fileForeground'] = mix(R.uiFg, R.fg);
  c['peekViewResult.lineForeground'] = mix(R.uiFg, R.fg);
  c['peekViewResult.matchHighlightBackground'] = withAlpha(R.yellow, 0x40);
  c['peekViewResult.selectionBackground'] = withAlpha(R.accent, 0x20);
  c['peekViewResult.selectionForeground'] = mix(R.uiFg, R.fg);
  c['peekViewTitle.background'] = inputBg;
  c['peekViewTitleDescription.foreground'] = withAlpha(R.brightBlack, 0x80);
  c['peekViewTitleLabel.foreground'] = mix(R.uiFg, R.fg);

  return c;
}

// Simple helpers for shade/mix without external deps: operate in ARGB hex space approximately
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function hexToRgb(hex) {
  let h = hexNormalize(hex);
  if (!h || !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(h)) return { r: 0, g: 0, b: 0 };
  if (h.length === 9) h = h.slice(0, 7);
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r, g, b };
}
function rgbToHex({ r, g, b }) { return `#${clamp(r,0,255).toString(16).padStart(2,'0')}${clamp(g,0,255).toString(16).padStart(2,'0')}${clamp(b,0,255).toString(16).padStart(2,'0')}`; }
function shade(hex, amount /*0x00..0xff*/) {
  const { r, g, b } = hexToRgb(hex);
  const t = amount / 255;
  // Blend toward black a bit for widget backgrounds
  return rgbToHex({ r: Math.round(r * (1 - t)), g: Math.round(g * (1 - t)), b: Math.round(b * (1 - t)) });
}
function mix(a, b, ratio = 0.5) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex({ r: Math.round(A.r * (1 - ratio) + B.r * ratio), g: Math.round(A.g * (1 - ratio) + B.g * ratio), b: Math.round(A.b * (1 - ratio) + B.b * ratio) });
}

function buildTheme(parsed, inPath, explicitName) {
  const R = roleMap(parsed);
  const name = resolveName(inPath, explicitName, parsed.meta);
  const colors = buildColors(R);
  const tokenColors = tokenColorsFromRoles(R).concat(tinaciousJsonRainbowTokenColors());
  return { name, type: 'dark', colors, tokenColors, semanticHighlighting: true };
}

// File generation will be handled by lib/file-generators.js

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { inPath, outPath, name, fullExtension } = args;
  const parsed = parseTxt(inPath);
  const theme = buildTheme(parsed, inPath, name);
  
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  
  // Write the theme file
  fs.writeFileSync(outPath, JSON.stringify(theme, null, 2) + '\n', 'utf8');
  console.log(`✓ Generated theme: ${outPath}`);
  
  // If full extension requested, generate all supporting files
  if (fullExtension) {
    const extensionRoot = outPath.includes('/themes/') 
      ? path.dirname(path.dirname(outPath))
      : path.dirname(outPath);
    
    const themeName = theme.name;
    
    // Create necessary directories
    const themesPath = path.join(extensionRoot, 'themes');
    fs.mkdirSync(themesPath, { recursive: true });
    
    // If theme wasn't already written to themes folder, move it there atomically
    const themeFileName = path.basename(outPath);
    const finalThemePath = path.join(themesPath, themeFileName);
    if (outPath !== finalThemePath) {
      try {
        // Check if source file exists
        if (fs.existsSync(outPath)) {
          // Read content
          const themeContent = fs.readFileSync(outPath, 'utf8');
          
          // Write to temp file first for atomic operation
          const tempPath = finalThemePath + '.tmp';
          fs.writeFileSync(tempPath, themeContent, { mode: FILE_MODE_READABLE });
          
          // Atomically rename temp file to final name
          fs.renameSync(tempPath, finalThemePath);
          
          // Only remove source if it's in a different directory
          if (path.dirname(outPath) !== themesPath) {
            fs.unlinkSync(outPath);
          }
        }
      } catch (error) {
        console.error('Error moving theme file:', error.message);
        // Clean up temp file if it exists
        const tempPath = finalThemePath + '.tmp';
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw error;
      }
    }
    
    // Use consolidated file generators
    try {
      const results = await generateExtensionFiles(extensionRoot, themeName, args, themeFileName);
      
      results.forEach(result => {
        console.log(`✓ Generated ${result.file}`);
      });
      
      console.log(`\n✅ VS Code extension created successfully in: ${extensionRoot}`);
      console.log(`\nNext steps:`);
      console.log(`1. cd ${extensionRoot}`);
      console.log(`2. code .`);
      console.log(`3. Press F5 to test the theme`);
      console.log(`4. To publish: npm install -g vsce && vsce package`);
    } catch (error) {
      console.error('Failed to generate extension files:', error.message);
      process.exit(1);
    }
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

