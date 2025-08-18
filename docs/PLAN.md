# VS Code Theme Generation: Implementation Plan

## Executive Summary

Based on analysis of 5 professional themes (Monokai Pro, OneDark-Pro, GitHub Dark Default, Tokyo Night, Material Deepforest), this plan outlines critical improvements needed to transform our theme generator from basic to professional-grade quality.

**Key Discovery**: Pro themes don't directly map terminal colors to editor colors. They extend original palettes through mathematical relationships while preserving authentic character through sophisticated multi-layer visual hierarchies, semantic token mapping, and precise opacity systems.

## 🎯 Core Algorithm Improvements (Phase 1)

### 1. Advanced Multi-Layer Background Hierarchy

**Current Problem**: Simple 2-level system lacks professional depth
**Pro Standard**: 8-level logarithmic progression with semantic purpose

**Implementation**:
```typescript
interface BackgroundHierarchy {
  // Core 8-level system
  void: string;        // Level 0: Deepest shadows, invisible borders
  shadow: string;      // Level 1: Deep borders, separators
  depth: string;       // Level 2: Activity bar, status bar background
  surface: string;     // Level 3: Sidebar, panel backgrounds
  canvas: string;      // Level 4: Main editor background (base)
  overlay: string;     // Level 5: Dropdown menus, tooltips
  interactive: string; // Level 6: Input fields, form controls
  elevated: string;    // Level 7: Hover states, active elements
}

class BackgroundGenerator {
  static createHierarchy(base: string, theme: 'dark' | 'light' = 'dark'): BackgroundHierarchy {
    const factor = theme === 'dark' ? -1 : 1; // Invert for light themes
    const progression = this.calculateProgression(8);
    
    return {
      void: this.adjustLightness(base, factor * progression[0]),      // -15%
      shadow: this.adjustLightness(base, factor * progression[1]),    // -12%
      depth: this.adjustLightness(base, factor * progression[2]),     // -8%
      surface: this.adjustLightness(base, factor * progression[3]),   // -5%
      canvas: base,                                                   // 0% (base)
      overlay: this.adjustLightness(base, -factor * progression[4]),  // +4%
      interactive: this.adjustLightness(base, -factor * progression[5]), // +7%
      elevated: this.adjustLightness(base, -factor * progression[6]), // +11%
    };
  }
  
  // Logarithmic progression for natural visual hierarchy
  private static calculateProgression(levels: number): number[] {
    const progression: number[] = [];
    for (let i = 0; i < levels; i++) {
      // Logarithmic scale: Math.log(i + 2) * baseStep
      const step = Math.log(i + 2) * 0.04;
      progression.push(step);
    }
    return progression;
  }
  
  private static adjustLightness(color: string, adjustment: number): string {
    // HSL adjustment preserving hue and saturation
    const hsl = this.hexToHsl(color);
    hsl.l = Math.max(0, Math.min(1, hsl.l + adjustment));
    return this.hslToHex(hsl);
  }
  
  // Semantic mapping for UI elements
  static mapToUIElements(hierarchy: BackgroundHierarchy) {
    return {
      // Core editor areas
      'editor.background': hierarchy.canvas,
      'editorWidget.background': hierarchy.overlay,
      'editorHoverWidget.background': hierarchy.elevated,
      
      // Sidebar and panels
      'sideBar.background': hierarchy.surface,
      'activityBar.background': hierarchy.depth,
      'panel.background': hierarchy.surface,
      
      // Interactive elements
      'input.background': hierarchy.interactive,
      'dropdown.background': hierarchy.overlay,
      'quickInput.background': hierarchy.overlay,
      
      // Depth indicators
      'editorGroup.border': hierarchy.shadow,
      'panel.border': hierarchy.shadow,
      'widget.shadow': hierarchy.void,
      
      // Hover and active states
      'list.hoverBackground': hierarchy.elevated,
      'list.activeSelectionBackground': hierarchy.elevated,
    };
  }
}
```

**Key Insight**: Pro themes use the terminal background as their canvas (level 4), then build hierarchy around it. Sidebar uses surface (level 3), activity bar uses depth (level 2).

### 2. Pro Opacity System with Mathematical Progression

**Current Problem**: Limited opacity levels and inconsistent application
**Pro Standard**: 16-level mathematical opacity progression with semantic purpose

**Implementation**:
```typescript
const OPACITY_SYSTEM = {
  // Core interaction progression (logarithmic scale)
  levels: {
    invisible: 0.00,    // #ffffff00 - Completely transparent
    ghost: 0.03,        // #ffffff08 - Barely perceptible
    whisper: 0.06,      // #ffffff0f - Very subtle backgrounds
    subtle: 0.08,       // #ffffff14 - Hover states
    light: 0.10,        // #ffffff1a - Light overlays
    soft: 0.13,         // #ffffff21 - Active but not selected
    gentle: 0.16,       // #ffffff29 - Word highlights
    visible: 0.19,      // #ffffff30 - Semantic states (error/warning)
    clear: 0.22,        // #ffffff38 - Find matches
    defined: 0.26,      // #ffffff42 - Selections
    medium: 0.30,       // #ffffff4d - Medium emphasis
    strong: 0.35,       // #ffffff59 - Strong highlights
    prominent: 0.40,    // #ffffff66 - Clear visibility
    solid: 0.50,        // #ffffff80 - Half opacity
    heavy: 0.60,        // #ffffff99 - Strong emphasis
    opaque: 0.75,       // #ffffffbf - Nearly solid
  },
  
  // Purpose-driven semantic mapping
  semantic: {
    hover: 0.08,           // Subtle feedback
    focus: 0.13,           // Active state
    selection: 0.26,       // Clear selection
    highlight: 0.16,       // Word occurrences
    findMatch: 0.22,       // Search results
    lineHighlight: 0.03,   // Current line (barely visible)
    error: 0.19,           // Error backgrounds
    warning: 0.19,         // Warning backgrounds
    info: 0.13,            // Info backgrounds
    success: 0.13,         // Success backgrounds
  }
};

// Enhanced opacity utilities
class OpacitySystem {
  static toHex(opacity: number): string {
    const alpha = Math.round(opacity * 255);
    return alpha.toString(16).padStart(2, '0').toLowerCase();
  }
  
  static getLevel(purpose: keyof typeof OPACITY_SYSTEM.semantic): number {
    return OPACITY_SYSTEM.semantic[purpose];
  }
  
  static blend(foreground: string, background: string, opacity: number): string {
    // Alpha blending for color mixing
    const fgRgb = this.hexToRgb(foreground);
    const bgRgb = this.hexToRgb(background);
    
    return this.rgbToHex(
      Math.round(fgRgb.r * opacity + bgRgb.r * (1 - opacity)),
      Math.round(fgRgb.g * opacity + bgRgb.g * (1 - opacity)),
      Math.round(fgRgb.b * opacity + bgRgb.b * (1 - opacity))
    );
  }
  
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  private static rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }
}
```

### 3. Primary Accent Color System

**Current Problem**: No systematic color application
**Pro Standard**: ONE primary accent applied systematically

**Implementation**:
```typescript
function applyPrimaryAccent(accent: string, theme: ThemeColors) {
  return {
    // Focus indicators
    'focusBorder': accent,
    'editorCursor.foreground': accent,
    
    // Activity indicators  
    'activityBar.activeBorder': accent,
    'tab.activeBorderTop': accent,
    'panelTitle.activeBorder': accent,
    
    // Interactive elements
    'button.background': accent,
    'progressBar.background': accent,
    'badge.background': accent,
    'activityBarBadge.background': accent,
    
    // Selections (with opacity)
    'editor.selectionBackground': `${accent}42`, // 26% opacity
    'list.activeSelectionBackground': `${accent}21`, // 13% opacity
  };
}
```

**Accent Color Selection**: Use `colors.color1` (red) as primary accent for consistency with cursor color.

### 3.5. Dual Accent System with Intensity Variations

**Current Gap**: Single accent color limits visual hierarchy
**Pro Standard**: Primary + secondary accent with intensity variations for different contexts

**Implementation**:
```typescript
interface AccentSystem {
  primary: {
    base: string;
    light: string;
    dark: string;
    muted: string;
  };
  secondary?: {
    base: string;
    light: string;
    dark: string;
    muted: string;
  };
}

class AccentGenerator {
  static createAccentSystem(palette: GhosttyColors): AccentSystem {
    // Primary accent - most saturated color (usually red or blue)
    const primaryBase = this.selectPrimaryAccent(palette);
    
    // Secondary accent - complementary or analogous color
    const secondaryBase = this.selectSecondaryAccent(palette, primaryBase);
    
    return {
      primary: {
        base: primaryBase,
        light: this.lighten(primaryBase, 0.15),
        dark: this.darken(primaryBase, 0.15),  
        muted: this.desaturate(primaryBase, 0.3),
      },
      secondary: secondaryBase ? {
        base: secondaryBase,
        light: this.lighten(secondaryBase, 0.12),
        dark: this.darken(secondaryBase, 0.12),
        muted: this.desaturate(secondaryBase, 0.25),
      } : undefined
    };
  }
  
  // Intelligent accent selection based on color properties
  private static selectPrimaryAccent(palette: GhosttyColors): string {
    const candidates = [
      { color: palette.color1, saturation: this.getSaturation(palette.color1) },
      { color: palette.color4, saturation: this.getSaturation(palette.color4) },
      { color: palette.color5, saturation: this.getSaturation(palette.color5) },
    ];
    
    // Select most saturated color as primary accent
    return candidates.reduce((max, curr) => 
      curr.saturation > max.saturation ? curr : max
    ).color;
  }
  
  private static selectSecondaryAccent(palette: GhosttyColors, primary: string): string | null {
    // Find complementary or analogous color
    const primaryHue = this.getHue(primary);
    const candidates = [palette.color2, palette.color3, palette.color6];
    
    // Select color with complementary hue (opposite side of color wheel)
    for (const candidate of candidates) {
      const candidateHue = this.getHue(candidate);
      const hueDiff = Math.abs(primaryHue - candidateHue);
      
      if (hueDiff > 120 && hueDiff < 240) { // Complementary range
        return candidate;
      }
    }
    
    return null; // Single accent system if no good complement found
  }
  
  // Apply accent system throughout theme
  static applyAccentSystem(accents: AccentSystem, theme: VSCodeThemeColors): VSCodeThemeColors {
    return {
      ...theme,
      
      // Primary accent applications
      'focusBorder': accents.primary.base,
      'editorCursor.foreground': accents.primary.base,
      'button.background': accents.primary.base,
      'progressBar.background': accents.primary.base,
      'badge.background': accents.primary.muted,
      
      // Selection states with primary
      'editor.selectionBackground': `${accents.primary.base}${OpacitySystem.toHex(0.26)}`,
      'list.activeSelectionBackground': `${accents.primary.muted}${OpacitySystem.toHex(0.22)}`,
      
      // Secondary accent applications (if available)
      ...(accents.secondary && {
        'tab.activeBorderTop': accents.secondary.base,
        'activityBar.activeBorder': accents.secondary.base,
        'panelTitle.activeBorder': accents.secondary.base,
        'statusBar.border': accents.secondary.dark,
        'textLink.activeForeground': accents.secondary.light,
      }),
      
      // Intensity variations for different contexts
      'button.hoverBackground': accents.primary.light,
      'button.secondaryBackground': accents.primary.muted,
      'textLink.foreground': accents.primary.light,
      'editorLink.activeForeground': accents.primary.dark,
    };
  }
}
```

**Accent Philosophy**: Primary accent provides focus and interaction feedback. Secondary accent (when available) adds visual interest and creates hierarchical borders. Intensity variations ensure appropriate contrast in different contexts.

### 4. Extended Color Palette with Preserved Authenticity

**Current Problem**: Limited color derivations
**Pro Standard**: Mathematical extensions while preserving original character

**Implementation**:
```typescript
function extendColorPalette(ghosttyColors: GhosttyColors): ExtendedPalette {
  return {
    // Original colors preserved exactly
    primary: {
      red: ghosttyColors.color1,        // Authentic red
      green: ghosttyColors.color2,      // Authentic green  
      blue: ghosttyColors.color4,       // Authentic blue
      yellow: ghosttyColors.color3,     // Authentic yellow
      purple: ghosttyColors.color5,     // Authentic purple
      cyan: ghosttyColors.color6,       // Authentic cyan
    },
    
    // Extended variations for UI needs
    derived: {
      // Lightness variations (same hue/saturation)
      redLight: lighten(ghosttyColors.color1, 0.15),
      redDark: darken(ghosttyColors.color1, 0.15),
      
      // Opacity variations for UI states
      selectionRed: withOpacity(ghosttyColors.color1, 0.26),
      hoverRed: withOpacity(ghosttyColors.color1, 0.08),
      
      // Background hierarchy from original background
      backgrounds: createBackgroundHierarchy(ghosttyColors.background),
    }
  };
}
```

## 🔧 Token Color Enhancements (Phase 2)

### 5. Advanced Font Style System with Semantic Purpose

**Current Problem**: No typographic hierarchy or semantic font styling
**Pro Standard**: 25+ strategic font style applications creating visual meaning

**Implementation**:
```typescript
interface FontStyleRule {
  scopes: string[];
  fontStyle: 'italic' | 'bold' | 'underline' | 'italic bold' | 'normal';
  reasoning: string;
}

class FontStyleGenerator {
  static generateFontStyles(): FontStyleRule[] {
    return [
      // ITALIC CATEGORY: De-emphasis and semantic distinction
      {
        scopes: [
          'comment',
          'comment.line',
          'comment.block',
          'punctuation.definition.comment',
        ],
        fontStyle: 'italic',
        reasoning: 'Comments should be visually de-emphasized through italic styling'
      },
      
      {
        scopes: [
          'variable.parameter',
          'variable.parameter.function',
          'meta.function.parameters variable',
        ],
        fontStyle: 'italic',
        reasoning: 'Parameters are inputs, italics suggest flow and variability'
      },
      
      {
        scopes: [
          'keyword.control.flow',
          'keyword.control.conditional',
          'keyword.control.loop',
          'keyword.control.return',
          'keyword.control.export',
          'keyword.control.import',
        ],
        fontStyle: 'italic',
        reasoning: 'Control flow keywords direct program execution, italics suggest movement'
      },
      
      {
        scopes: [
          'storage.modifier.access',
          'storage.modifier.static',
          'storage.modifier.abstract',
          'storage.modifier.final',
          'storage.modifier.async',
        ],
        fontStyle: 'italic',
        reasoning: 'Modifiers change behavior, italics indicate modification'
      },
      
      {
        scopes: [
          'variable.language.this',
          'variable.language.self',
          'variable.language.super',
          'variable.language.arguments',
        ],
        fontStyle: 'italic',
        reasoning: 'Language built-in variables are special, italics show meta-nature'
      },
      
      {
        scopes: [
          'entity.other.inherited-class',
          'entity.other.attribute-name',
          'entity.name.tag.custom',
        ],
        fontStyle: 'italic',
        reasoning: 'Inherited/derived elements shown through italic styling'
      },
      
      {
        scopes: [
          'string.quoted.docstring',
          'string.quoted.docstring.multi.python',
          'comment.block.documentation',
        ],
        fontStyle: 'italic',
        reasoning: 'Documentation strings are narrative, italics suggest prose'
      },
      
      // BOLD CATEGORY: Strong emphasis and importance
      {
        scopes: [
          'markup.bold',
          'markup.heading',
          'entity.name.section.markdown',
        ],
        fontStyle: 'bold',
        reasoning: 'Markdown bold and headings need visual weight'
      },
      
      {
        scopes: [
          'invalid',
          'invalid.illegal',
          'invalid.broken',
        ],
        fontStyle: 'bold',
        reasoning: 'Errors need maximum visual attention'
      },
      
      {
        scopes: [
          'constant.language.boolean.true',
          'constant.language.boolean.false',
          'constant.language.null',
          'constant.language.undefined',
        ],
        fontStyle: 'bold',
        reasoning: 'Core language constants deserve emphasis'
      },
      
      // UNDERLINE CATEGORY: Links and interactive elements
      {
        scopes: [
          'markup.underline.link',
          'string.other.link',
        ],
        fontStyle: 'underline',
        reasoning: 'Links should be visually distinct through underlines'
      },
      
      // COMBINED STYLES: Compound emphasis
      {
        scopes: [
          'markup.bold markup.italic',
          'markup.italic markup.bold',
        ],
        fontStyle: 'italic bold',
        reasoning: 'Nested markdown formatting preserved'
      },
      
      // NORMAL OVERRIDES: Remove inherited styles where inappropriate  
      {
        scopes: [
          'keyword.control.flow.block-scalar.literal.yaml',
          'keyword.control.flow.python', // Python 'and', 'or', 'not' should not be italic
          'comment.line.number-sign.yaml', // YAML comments can be normal
        ],
        fontStyle: 'normal',
        reasoning: 'Context-specific overrides for better readability'
      }
    ];
  }
  
  // Apply font styles to token color rules
  static applyFontStyles(tokenRules: TokenColor[]): TokenColor[] {
    const fontStyles = this.generateFontStyles();
    
    return tokenRules.map(rule => {
      // Find matching font style rule
      const fontStyleRule = fontStyles.find(fs => 
        fs.scopes.some(scope => 
          Array.isArray(rule.scope) 
            ? rule.scope.some(s => this.scopeMatches(s, scope))
            : this.scopeMatches(rule.scope, scope)
        )
      );
      
      if (fontStyleRule && fontStyleRule.fontStyle !== 'normal') {
        return {
          ...rule,
          settings: {
            ...rule.settings,
            fontStyle: fontStyleRule.fontStyle
          }
        };
      }
      
      return rule;
    });
  }
  
  private static scopeMatches(tokenScope: string, styleScope: string): boolean {
    // Support prefix matching for flexible scope application
    return tokenScope.includes(styleScope) || styleScope.includes(tokenScope);
  }
}
```

**Font Style Philosophy**: Italics create visual flow and indicate semantic concepts (parameters, control flow, modifications). Bold creates emphasis for importance or errors. Underline indicates interactivity. Normal weight is used for overrides where inherited styles are inappropriate.

### 6. Advanced Rainbow Coloring for Structured Data

**Current Problem**: Flat coloring in nested data structures makes navigation difficult
**Pro Standard**: 9-level color cycling with support for JSON, YAML, XML, and other structured formats

**Implementation**:
```typescript
interface RainbowColorSet {
  name: string;
  colors: string[];
  maxDepth: number;
}

class StructuredDataColorizer {
  // Generate rainbow colors from terminal palette using mathematical distribution
  static createRainbowSet(palette: ExtendedPalette, philosophy: 'vibrant' | 'subtle' | 'pastel'): RainbowColorSet {
    const baseColors = [
      palette.primary.red,      // Level 0: Root level
      palette.primary.green,    // Level 1: Primary children
      palette.primary.blue,     // Level 2: Secondary children
      palette.primary.yellow,   // Level 3: Tertiary children
      palette.primary.purple,   // Level 4: Deep nesting
      palette.primary.cyan,     // Level 5: Very deep
      palette.derived.redLight, // Level 6: Cycle with variations
      palette.derived.greenLight, // Level 7
      palette.derived.blueLight,  // Level 8: Maximum depth
    ];
    
    // Apply philosophy-based transformations
    const transformedColors = baseColors.map(color => {
      switch (philosophy) {
        case 'vibrant':
          return this.increaseSaturation(color, 0.15);
        case 'subtle':  
          return this.decreaseSaturation(color, 0.25);
        case 'pastel':
          return this.increaseLightness(color, 0.20);
        default:
          return color;
      }
    });
    
    return {
      name: `Rainbow-${philosophy}`,
      colors: transformedColors,
      maxDepth: transformedColors.length
    };
  }
  
  // JSON rainbow with precise scope targeting
  static generateJSONRainbow(rainbowSet: RainbowColorSet): TokenColor[] {
    return rainbowSet.colors.map((color, level) => ({
      name: `JSON Property Key - Nesting Level ${level}`,
      scope: [
        'source.json ' + 
        'meta.structure.dictionary.json '.repeat(level + 1) +
        'support.type.property-name.json',
        // Alternative JSON scopes for different parsers
        'source.json ' +
        'meta.structure.dictionary.json '.repeat(level + 1) +
        'string.quoted.double.json'
      ],
      settings: { foreground: color }
    }));
  }
  
  // YAML rainbow for nested structures  
  static generateYAMLRainbow(rainbowSet: RainbowColorSet): TokenColor[] {
    return rainbowSet.colors.map((color, level) => ({
      name: `YAML Key - Nesting Level ${level}`,
      scope: [
        'source.yaml ' +
        'meta.block-mapping.yaml '.repeat(level + 1) +
        'entity.name.tag.yaml'
      ],
      settings: { foreground: color }
    }));
  }
  
  // XML rainbow for nested elements
  static generateXMLRainbow(rainbowSet: RainbowColorSet): TokenColor[] {
    return rainbowSet.colors.map((color, level) => ({
      name: `XML Tag - Nesting Level ${level}`,
      scope: [
        'text.xml ' +
        'meta.tag.xml '.repeat(level + 1) +
        'entity.name.tag.xml'
      ],
      settings: { foreground: color }
    }));
  }
  
  // CSS selector rainbow for nested rules
  static generateCSSRainbow(rainbowSet: RainbowColorSet): TokenColor[] {
    return rainbowSet.colors.slice(0, 6).map((color, level) => ({
      name: `CSS Selector - Nesting Level ${level}`,
      scope: [
        'source.css ' +
        'meta.selector.css '.repeat(level + 1) +
        'entity.name.tag.css'
      ],
      settings: { foreground: color }
    }));
  }
  
  // Unified rainbow generator for all structured formats
  static generateAllRainbows(palette: ExtendedPalette, philosophy: 'vibrant' | 'subtle' | 'pastel' = 'vibrant'): TokenColor[] {
    const rainbowSet = this.createRainbowSet(palette, philosophy);
    
    return [
      ...this.generateJSONRainbow(rainbowSet),
      ...this.generateYAMLRainbow(rainbowSet),  
      ...this.generateXMLRainbow(rainbowSet),
      ...this.generateCSSRainbow(rainbowSet),
    ];
  }
  
  // Color cycling for infinite nesting
  static getCyclicColor(rainbowSet: RainbowColorSet, depth: number): string {
    return rainbowSet.colors[depth % rainbowSet.maxDepth];
  }
  
  // Dynamic rainbow adjustment based on file complexity
  static adjustForComplexity(rainbowSet: RainbowColorSet, maxDetectedDepth: number): RainbowColorSet {
    if (maxDetectedDepth <= 3) {
      // Simple files use first 4 colors
      return { ...rainbowSet, colors: rainbowSet.colors.slice(0, 4) };
    } else if (maxDetectedDepth <= 6) {
      // Medium complexity uses first 6 colors  
      return { ...rainbowSet, colors: rainbowSet.colors.slice(0, 6) };
    }
    
    // Complex files use full rainbow
    return rainbowSet;
  }
  
  private static increaseSaturation(color: string, amount: number): string {
    const hsl = this.hexToHsl(color);
    hsl.s = Math.min(1, hsl.s + amount);
    return this.hslToHex(hsl);
  }
  
  private static decreaseSaturation(color: string, amount: number): string {
    const hsl = this.hexToHsl(color);
    hsl.s = Math.max(0, hsl.s - amount);
    return this.hslToHex(hsl);
  }
  
  private static increaseLightness(color: string, amount: number): string {
    const hsl = this.hexToHsl(color);
    hsl.l = Math.min(1, hsl.l + amount);
    return this.hslToHex(hsl);
  }
}
```

**Rainbow Philosophy**: Colors create visual landmarks for navigation in deeply nested structures. Primary colors handle common depths (0-5), while derived variations extend support for extreme nesting. Color cycling ensures infinite depth support while maintaining visual consistency.

### 6.5. Language & Framework-Specific Token Generators

**Current Gap**: Generic token rules don't account for language-specific semantics
**Pro Standard**: Tailored rules for Python, JavaScript, TypeScript, Rust, and major frameworks

**Implementation**:
```typescript
interface LanguageTokenGenerator {
  language: string;
  generateRules(palette: ExtendedPalette): TokenColor[];
}

class PythonTokenGenerator implements LanguageTokenGenerator {
  language = 'python';
  
  generateRules(palette: ExtendedPalette): TokenColor[] {
    return [
      // Python-specific decorators
      {
        name: 'Python Decorator',
        scope: ['meta.function.decorator.python', 'entity.name.function.decorator.python'],
        settings: { foreground: palette.primary.purple, fontStyle: 'italic' }
      },
      
      // Python self parameter special handling
      {
        name: 'Python Self Parameter',
        scope: ['variable.parameter.function.language.special.self.python'],
        settings: { foreground: palette.derived.selfAccent, fontStyle: 'italic' }
      },
      
      // Python dunder methods
      {
        name: 'Python Magic Methods',
        scope: ['support.function.magic.python'],
        settings: { foreground: palette.derived.magicMethod }
      },
      
      // Python f-string expressions
      {
        name: 'Python F-String Expression',
        scope: ['meta.fstring.python', 'constant.character.format.placeholder.other.python'],
        settings: { foreground: palette.primary.cyan }
      }
    ];
  }
}

class TypeScriptTokenGenerator implements LanguageTokenGenerator {
  language = 'typescript';
  
  generateRules(palette: ExtendedPalette): TokenColor[] {
    return [
      // TypeScript type annotations
      {
        name: 'TypeScript Type Annotation',
        scope: ['meta.type.annotation.ts', 'entity.name.type.ts'],
        settings: { foreground: palette.derived.typeAnnotation }
      },
      
      // TypeScript interfaces
      {
        name: 'TypeScript Interface',
        scope: ['entity.name.type.interface.ts'],
        settings: { foreground: palette.primary.cyan, fontStyle: 'italic' }
      },
      
      // TypeScript generics
      {
        name: 'TypeScript Generic',
        scope: ['entity.name.type.parameter.ts'],
        settings: { foreground: palette.derived.genericType }
      },
      
      // TypeScript utility types
      {
        name: 'TypeScript Utility Types',
        scope: ['support.type.builtin.ts', 'support.type.primitive.ts'],
        settings: { foreground: palette.derived.builtinType }
      }
    ];
  }
}

class JavaScriptTokenGenerator implements LanguageTokenGenerator {
  language = 'javascript';
  
  generateRules(palette: ExtendedPalette): TokenColor[] {
    return [
      // JavaScript template literals
      {
        name: 'JavaScript Template Literal',
        scope: ['string.template.js', 'punctuation.definition.string.template.begin.js'],
        settings: { foreground: palette.primary.green }
      },
      
      // JavaScript async/await
      {
        name: 'JavaScript Async/Await',
        scope: ['storage.modifier.async.js', 'keyword.control.flow.js'],
        settings: { foreground: palette.primary.purple, fontStyle: 'italic' }
      },
      
      // JavaScript destructuring
      {
        name: 'JavaScript Destructuring',
        scope: ['meta.object-binding-pattern-variable.js'],
        settings: { foreground: palette.derived.destructured }
      }
    ];
  }
}

class RustTokenGenerator implements LanguageTokenGenerator {
  language = 'rust';
  
  generateRules(palette: ExtendedPalette): TokenColor[] {
    return [
      // Rust lifetime parameters
      {
        name: 'Rust Lifetime Parameter',
        scope: ['entity.name.type.lifetime.rust', 'punctuation.definition.lifetime.rust'],
        settings: { foreground: palette.derived.lifetime, fontStyle: 'italic' }
      },
      
      // Rust macros
      {
        name: 'Rust Macro',
        scope: ['entity.name.function.macro.rust', 'meta.macro.rust'],
        settings: { foreground: palette.primary.purple }
      },
      
      // Rust attributes
      {
        name: 'Rust Attribute',
        scope: ['meta.attribute.rust', 'entity.name.function.attribute.rust'],
        settings: { foreground: palette.derived.attribute, fontStyle: 'italic' }
      }
    ];
  }
}

class ReactTokenGenerator implements LanguageTokenGenerator {
  language = 'react';
  
  generateRules(palette: ExtendedPalette): TokenColor[] {
    return [
      // JSX component names
      {
        name: 'React Component Name',
        scope: ['entity.name.tag.jsx', 'support.class.component.jsx'],
        settings: { foreground: palette.derived.componentName }
      },
      
      // JSX attributes
      {
        name: 'React JSX Attribute',
        scope: ['entity.other.attribute-name.jsx'],
        settings: { foreground: palette.primary.cyan }
      },
      
      // React hooks
      {
        name: 'React Hooks',
        scope: ['meta.function-call.jsx variable.function', 'support.function.hooks.react'],
        settings: { foreground: palette.derived.hookFunction }
      }
    ];
  }
}

class LanguageTokenManager {
  private generators: LanguageTokenGenerator[] = [
    new PythonTokenGenerator(),
    new TypeScriptTokenGenerator(),
    new JavaScriptTokenGenerator(),  
    new RustTokenGenerator(),
    new ReactTokenGenerator(),
  ];
  
  generateAllLanguageRules(palette: ExtendedPalette): TokenColor[] {
    return this.generators.flatMap(gen => gen.generateRules(palette));
  }
  
  generateForLanguage(language: string, palette: ExtendedPalette): TokenColor[] {
    const generator = this.generators.find(gen => gen.language === language);
    return generator ? generator.generateRules(palette) : [];
  }
}
```

**Language-Specific Strategy**: Each language gets tailored rules that understand its unique syntax patterns. Framework-specific generators handle JSX, Vue templates, and other specialized syntax. Rules are additive - they enhance base token colors rather than replace them.

## 📋 Missing UI Properties (Phase 3)

### 7. Comprehensive Symbol Icon Color System

**Current Gap**: No semantic symbol icon coloring for outline and explorer views
**Pro Standard**: 35+ symbol types with meaningful color categorization

**Implementation Strategy**:
```typescript
class SymbolIconColorGenerator {
  static generateSymbolColors(palette: ExtendedPalette): Record<string, string> {
    return {
      // Structural types (warm colors - orange/yellow family)
      'symbolIcon.arrayForeground': palette.primary.yellow,
      'symbolIcon.classForeground': palette.derived.orangeWarm,
      'symbolIcon.enumForeground': palette.primary.yellow,
      'symbolIcon.interfaceForeground': palette.derived.yellowBright,
      'symbolIcon.structForeground': palette.derived.orangeWarm,
      'symbolIcon.objectForeground': palette.derived.orangeWarm,
      'symbolIcon.packageForeground': palette.derived.orangeWarm,
      
      // Functional types (cool colors - blue/cyan family)
      'symbolIcon.functionForeground': palette.primary.cyan,
      'symbolIcon.methodForeground': palette.primary.cyan,
      'symbolIcon.constructorForeground': palette.derived.cyanBright,
      'symbolIcon.operatorForeground': palette.primary.blue,
      
      // Data types (accent colors - red/purple family)
      'symbolIcon.variableForeground': palette.primary.red,
      'symbolIcon.constantForeground': palette.derived.redBright,
      'symbolIcon.fieldForeground': palette.primary.red,
      'symbolIcon.propertyForeground': palette.derived.redLight,
      
      // Language constructs (purple/magenta family)
      'symbolIcon.keywordForeground': palette.primary.purple,
      'symbolIcon.namespaceForeground': palette.derived.purpleBright,
      'symbolIcon.moduleForeground': palette.primary.purple,
      
      // Primitive types (green family)
      'symbolIcon.booleanForeground': palette.primary.green,
      'symbolIcon.numberForeground': palette.derived.greenBright,
      'symbolIcon.stringForeground': palette.primary.green,
      'symbolIcon.nullForeground': palette.derived.greenDark,
      
      // Type system (cyan variations)
      'symbolIcon.typeParameterForeground': palette.derived.cyanLight,
      'symbolIcon.keyForeground': palette.primary.cyan,
      'symbolIcon.referenceForeground': palette.derived.cyanDark,
      
      // File system (muted tones)
      'symbolIcon.fileForeground': palette.derived.mutedYellow,
      'symbolIcon.folderForeground': palette.derived.mutedYellow,
      
      // Special cases
      'symbolIcon.colorForeground': palette.derived.rainbowPrimary,
      'symbolIcon.snippetForeground': palette.derived.snippetAccent,
      'symbolIcon.textForeground': palette.foreground,
      'symbolIcon.unitForeground': palette.derived.mutedCyan,
      
      // Language-specific symbols
      'symbolIcon.enumeratorForeground': palette.derived.orangeLight,
      'symbolIcon.enumeratorMemberForeground': palette.derived.orangeDark,
      'symbolIcon.eventForeground': palette.derived.eventAccent,
    };
  }
  
  // Semantic color assignment based on symbol purpose
  static categorizeSymbol(symbolType: string): 'structural' | 'functional' | 'data' | 'primitive' | 'meta' {
    const categories = {
      structural: ['array', 'class', 'enum', 'interface', 'struct', 'object', 'package'],
      functional: ['function', 'method', 'constructor', 'operator'],
      data: ['variable', 'constant', 'field', 'property'],
      primitive: ['boolean', 'number', 'string', 'null'],
      meta: ['keyword', 'namespace', 'module', 'typeParameter', 'reference']
    };
    
    for (const [category, types] of Object.entries(categories)) {
      if (types.some(type => symbolType.toLowerCase().includes(type))) {
        return category as any;
      }
    }
    return 'meta';
  }
  
  // Dynamic color assignment based on theme palette
  static assignSemanticColor(category: string, palette: ExtendedPalette): string {
    const colorMapping = {
      structural: palette.primary.yellow,    // Warm, container-like
      functional: palette.primary.cyan,      // Cool, action-oriented  
      data: palette.primary.red,            // Accent, value-focused
      primitive: palette.primary.green,     // Natural, basic types
      meta: palette.primary.purple         // Abstract, system-level
    };
    
    return colorMapping[category as keyof typeof colorMapping] || palette.foreground;
  }
}
```

**Color Philosophy**: Symbols are grouped by semantic purpose rather than alphabetically, creating visual consistency where related concepts share color families.

### 8. Essential Missing UI Elements (100+ Properties)

**Current Gap**: ~50 UI properties vs professional standard of 200+
**Target**: Complete UI coverage

**Priority Properties**:
- Breadcrumb navigation (5 properties)
- Minimap highlights (6 properties)  
- Menu and notifications (15 properties)
- Quick input and extensions (10 properties)
- Testing and debug colors (12 properties)
- Welcome page and settings (8 properties)

### 9. Pro Border Strategy with Selective Visibility

**Current Problem**: Inconsistent border usage creating visual clutter
**Pro Standard**: Transparent by default, visible only for structural clarity and focus states

**Implementation**:
```typescript
interface BorderStrategy {
  transparent: string[];   // Always transparent
  structural: string[];    // Visible for layout structure
  interactive: string[];   // Visible for focus/hover states
  accent: string[];       // Use accent color for emphasis
}

class BorderManager {
  private static readonly TRANSPARENT_COLOR = '#00000000';
  
  static generateBorderStrategy(hierarchy: BackgroundHierarchy, accents: AccentSystem): Record<string, string> {
    return {
      // TRANSPARENT BORDERS: Remove visual noise (50+ properties)
      'editor.lineHighlightBorder': this.TRANSPARENT_COLOR,
      'editor.wordHighlightBorder': this.TRANSPARENT_COLOR,
      'editor.wordHighlightStrongBorder': this.TRANSPARENT_COLOR,
      'editor.findMatchBorder': this.TRANSPARENT_COLOR,
      'editor.findMatchHighlightBorder': this.TRANSPARENT_COLOR,
      'editor.rangeHighlightBorder': this.TRANSPARENT_COLOR,
      'editor.symbolHighlightBorder': this.TRANSPARENT_COLOR,
      'editorError.border': this.TRANSPARENT_COLOR,
      'editorWarning.border': this.TRANSPARENT_COLOR,
      'editorInfo.border': this.TRANSPARENT_COLOR,
      'editorHint.border': this.TRANSPARENT_COLOR,
      'editorGutter.border': this.TRANSPARENT_COLOR,
      'editorRuler.foreground': this.TRANSPARENT_COLOR,
      
      // Tab system borders
      'tab.border': this.TRANSPARENT_COLOR,
      'tab.activeBorder': this.TRANSPARENT_COLOR,
      'tab.hoverBorder': this.TRANSPARENT_COLOR,
      'tab.unfocusedActiveBorder': this.TRANSPARENT_COLOR,
      'tab.unfocusedHoverBorder': this.TRANSPARENT_COLOR,
      'editorGroupHeader.border': this.TRANSPARENT_COLOR,
      'editorGroupHeader.tabsBorder': this.TRANSPARENT_COLOR,
      
      // Sidebar and panel borders
      'activityBar.border': this.TRANSPARENT_COLOR,
      'sideBar.border': this.TRANSPARENT_COLOR,
      'panel.border': this.TRANSPARENT_COLOR,
      'statusBar.border': this.TRANSPARENT_COLOR,
      'titleBar.border': this.TRANSPARENT_COLOR,
      
      // Widget borders
      'editorWidget.border': this.TRANSPARENT_COLOR,
      'editorHoverWidget.border': this.TRANSPARENT_COLOR,
      'editorSuggestWidget.border': this.TRANSPARENT_COLOR,
      'peekView.border': this.TRANSPARENT_COLOR,
      'peekViewEditor.border': this.TRANSPARENT_COLOR,
      'peekViewTitle.border': this.TRANSPARENT_COLOR,
      'peekViewResult.border': this.TRANSPARENT_COLOR,
      
      // List and tree borders
      'list.focusOutline': this.TRANSPARENT_COLOR,
      'list.inactiveSelectionBackground': this.TRANSPARENT_COLOR,
      'tree.indentGuidesStroke': this.TRANSPARENT_COLOR,
      
      // Notification borders
      'notificationCenter.border': this.TRANSPARENT_COLOR,
      'notifications.border': this.TRANSPARENT_COLOR,
      
      // Terminal borders
      'terminal.border': this.TRANSPARENT_COLOR,
      'terminalCursor.background': this.TRANSPARENT_COLOR,
      
      // STRUCTURAL BORDERS: Provide necessary separation
      'editorGroup.border': hierarchy.shadow,              // Subtle group separation
      'editorPane.background': hierarchy.void,             // Deep structural divide
      'contrastBorder': hierarchy.shadow,                  // High contrast mode support
      'contrastActiveBorder': accents.primary.muted,       // High contrast active elements
      
      // INTERACTIVE BORDERS: Focus and state indicators
      'focusBorder': accents.primary.base,                 // Universal focus indicator
      'input.border': hierarchy.shadow,                    // Input field boundaries
      'inputOption.activeBorder': accents.primary.base,    // Active input options
      'dropdown.border': hierarchy.shadow,                 // Dropdown boundaries
      'button.border': this.TRANSPARENT_COLOR,             // Buttons use background
      'checkbox.border': hierarchy.shadow,                 // Checkbox boundaries
      'quickInput.border': hierarchy.shadow,               // Quick input boundaries
      
      // ACCENT BORDERS: Special emphasis
      'tab.activeBorderTop': accents.secondary?.base || accents.primary.light,
      'activityBar.activeBorder': accents.secondary?.base || accents.primary.base,
      'panelTitle.activeBorder': accents.secondary?.base || accents.primary.light,
      'breadcrumb.activeSelectionForeground': accents.primary.base,
      
      // EXCEPTION CASES: Specific visibility for functionality
      'editorBracketMatch.border': accents.primary.muted,  // Bracket matching needs visibility
      'merge.border': hierarchy.shadow,                    // Merge conflicts need structure
      'editorOverviewRuler.border': hierarchy.shadow,     // Overview ruler structure
      'minimap.border': this.TRANSPARENT_COLOR,           // Minimap integrated
      'scrollbar.shadow': hierarchy.void,                 // Scroll shadow for depth
      'widget.shadow': `${hierarchy.void}66`,             // Widget shadows with opacity
    };
  }
  
  // Border classification for different purposes
  static classifyBorder(property: string): 'transparent' | 'structural' | 'interactive' | 'accent' {
    if (property.includes('focus') || property.includes('active')) {
      return property.includes('Border') ? 'accent' : 'interactive';
    }
    
    if (property.includes('group') || property.includes('panel') || property.includes('container')) {
      return 'structural';
    }
    
    if (property.includes('input') || property.includes('dropdown') || property.includes('quickInput')) {
      return 'interactive';
    }
    
    return 'transparent'; // Default to transparent
  }
  
  // Apply borders based on theme requirements
  static applyBorderPhilosophy(borders: Record<string, string>, philosophy: 'minimal' | 'structured' | 'outlined'): Record<string, string> {
    switch (philosophy) {
      case 'minimal':
        // Even fewer borders - only focus states
        return Object.fromEntries(
          Object.entries(borders).map(([key, value]) => [
            key,
            key.includes('focus') ? value : this.TRANSPARENT_COLOR
          ])
        );
        
      case 'structured':
        // Standard professional approach (default)
        return borders;
        
      case 'outlined':
        // More borders for clear separation
        return Object.fromEntries(
          Object.entries(borders).map(([key, value]) => [
            key,
            value === this.TRANSPARENT_COLOR && this.classifyBorder(key) === 'structural' 
              ? '#ffffff10' // Very subtle outline
              : value
          ])
        );
        
      default:
        return borders;
    }
  }
}
```

**Border Philosophy**: Borders should guide attention, not compete with content. Transparent by default eliminates noise. Structural borders provide necessary layout clarity. Interactive borders respond to user focus. Accent borders create hierarchical emphasis.

### 10. Semantic Token Colors Support

**Current Gap**: No modern VS Code semantic highlighting
**Target**: Language-aware semantic coloring

**Implementation**:
```typescript
const SEMANTIC_TOKEN_COLORS = {
  'parameter.declaration': { foreground: palette.yellow },
  'parameter': { foreground: palette.brightWhite },
  'property.declaration': { foreground: palette.brightCyan },
  'variable.declaration': { foreground: palette.magenta },
  '*.defaultLibrary': { foreground: palette.brightBlue },
};
```

## 🚀 Implementation Strategy

### Phase 1: Core Algorithm (Week 1)
1. Implement `createBackgroundHierarchy()` with 6 levels
2. Add `withOpacity()` with hex suffix support  
3. Create `extendColorPalette()` for mathematical derivations
4. Add `applyPrimaryAccent()` for systematic accent application
5. Update `buildVSCodeColors()` with new system

### Phase 2: Token Enhancement (Week 2)  
1. Add font style support to `buildTokenColors()`
2. Implement JSON rainbow generation
3. Add semantic token colors
4. Expand token rules from ~20 to 150+

### Phase 3: Completeness (Week 3)
1. Add all missing UI properties (200+ total)
2. Implement symbol icon colors  
3. Add breadcrumb and minimap support
4. Complete notification and menu colors
5. Apply transparent border strategy

## 📊 Success Metrics

### Quantitative Targets
- **Background Levels**: 6 distinct levels (vs current 2)
- **UI Properties**: 200+ properties (vs current ~100) 
- **Token Rules**: 150+ rules (vs current ~20)
- **Opacity Usage**: Hex suffixes throughout
- **Symbol Icons**: 30+ symbol type definitions

### Qualitative Targets
- **Pro Appearance**: Match quality of top marketplace themes
- **Authentic Character**: Preserve original terminal theme personality
- **Semantic Consistency**: Logical color role assignments
- **Modern Features**: Full VS Code feature support

## 🎨 Core Design Principle

**Preserve the authentic terminal colors while adding professional structure through mathematical relationships, NOT arbitrary color choices.**

This approach ensures each generated theme maintains its unique character while gaining the sophisticated visual hierarchy and comprehensive feature support that defines professional VS Code themes.

## 🧪 Comprehensive Testing Strategy

### Core Algorithm Tests
```typescript
describe('Pro Theme Generation', () => {
  describe('Background Hierarchy System', () => {
    it('should generate 8 distinct background levels', () => {
      const hierarchy = BackgroundGenerator.createHierarchy('#1a1b26');
      const levels = Object.values(hierarchy);
      
      // All levels should be unique
      expect(new Set(levels).size).toBe(8);
      
      // Should follow luminance progression
      const luminances = levels.map(getLuminance);
      for (let i = 1; i < luminances.length; i++) {
        expect(luminances[i]).toBeGreaterThan(luminances[i - 1]);
      }
    });
    
    it('should adapt for light themes', () => {
      const dark = BackgroundGenerator.createHierarchy('#1a1b26', 'dark');
      const light = BackgroundGenerator.createHierarchy('#ffffff', 'light');
      
      expect(getLuminance(light.void)).toBeGreaterThan(getLuminance(light.canvas));
      expect(getLuminance(dark.void)).toBeLessThan(getLuminance(dark.canvas));
    });
    
    it('should provide semantic UI mapping', () => {
      const hierarchy = BackgroundGenerator.createHierarchy('#1a1b26');
      const mapping = BackgroundGenerator.mapToUIElements(hierarchy);
      
      expect(mapping['editor.background']).toBe(hierarchy.canvas);
      expect(mapping['sideBar.background']).toBe(hierarchy.surface);
      expect(mapping['activityBar.background']).toBe(hierarchy.depth);
    });
  });
  
  describe('Opacity System', () => {
    it('should convert decimal opacity to correct hex values', () => {
      expect(OpacitySystem.toHex(0.10)).toBe('1a');
      expect(OpacitySystem.toHex(0.25)).toBe('40');
      expect(OpacitySystem.toHex(0.50)).toBe('80');
      expect(OpacitySystem.toHex(0.75)).toBe('bf');
      expect(OpacitySystem.toHex(1.00)).toBe('ff');
    });
    
    it('should provide semantic opacity levels', () => {
      expect(OpacitySystem.getLevel('hover')).toBe(0.08);
      expect(OpacitySystem.getLevel('selection')).toBe(0.26);
      expect(OpacitySystem.getLevel('focus')).toBe(0.13);
    });
    
    it('should perform proper color blending', () => {
      const fg = '#ff0000';
      const bg = '#000000';
      const blended = OpacitySystem.blend(fg, bg, 0.5);
      expect(blended).toBe('#800000'); // 50% red on black
    });
  });
  
  describe('Accent System', () => {
    it('should select primary accent intelligently', () => {
      const mockPalette = {
        color1: '#ff6b6b', // High saturation red
        color4: '#4ecdc4', // Medium saturation cyan
        color5: '#45b7d1', // Low saturation blue
      } as GhosttyColors;
      
      const accents = AccentGenerator.createAccentSystem(mockPalette);
      expect(accents.primary.base).toBe('#ff6b6b'); // Should select highest saturation
    });
    
    it('should create intensity variations', () => {
      const mockPalette = { color1: '#ff0000' } as GhosttyColors;
      const accents = AccentGenerator.createAccentSystem(mockPalette);
      
      expect(accents.primary.light).not.toBe(accents.primary.base);
      expect(accents.primary.dark).not.toBe(accents.primary.base);
      expect(accents.primary.muted).not.toBe(accents.primary.base);
    });
  });
  
  describe('Symbol Icon Colors', () => {
    it('should generate complete symbol color set', () => {
      const mockPalette = createMockExtendedPalette();
      const symbols = SymbolIconColorGenerator.generateSymbolColors(mockPalette);
      
      const symbolKeys = Object.keys(symbols);
      expect(symbolKeys.length).toBeGreaterThanOrEqual(30);
      expect(symbolKeys).toContain('symbolIcon.functionForeground');
      expect(symbolKeys).toContain('symbolIcon.classForeground');
    });
    
    it('should categorize symbols semantically', () => {
      expect(SymbolIconColorGenerator.categorizeSymbol('function')).toBe('functional');
      expect(SymbolIconColorGenerator.categorizeSymbol('class')).toBe('structural');
      expect(SymbolIconColorGenerator.categorizeSymbol('variable')).toBe('data');
      expect(SymbolIconColorGenerator.categorizeSymbol('boolean')).toBe('primitive');
    });
  });
  
  describe('Border Strategy', () => {
    it('should default most borders to transparent', () => {
      const hierarchy = BackgroundGenerator.createHierarchy('#1a1b26');
      const accents = AccentGenerator.createAccentSystem({} as GhosttyColors);
      const borders = BorderManager.generateBorderStrategy(hierarchy, accents);
      
      const transparentBorders = Object.entries(borders)
        .filter(([_, value]) => value === '#00000000');
      
      expect(transparentBorders.length).toBeGreaterThan(40);
    });
    
    it('should classify borders correctly', () => {
      expect(BorderManager.classifyBorder('focusBorder')).toBe('accent');
      expect(BorderManager.classifyBorder('input.border')).toBe('interactive');
      expect(BorderManager.classifyBorder('editorGroup.border')).toBe('structural');
      expect(BorderManager.classifyBorder('tab.border')).toBe('transparent');
    });
  });
  
  describe('Font Style System', () => {
    it('should apply semantic font styles', () => {
      const rules = FontStyleGenerator.generateFontStyles();
      const commentRule = rules.find(r => r.scopes.includes('comment'));
      const paramRule = rules.find(r => r.scopes.includes('variable.parameter'));
      
      expect(commentRule?.fontStyle).toBe('italic');
      expect(paramRule?.fontStyle).toBe('italic');
    });
    
    it('should handle style overrides', () => {
      const mockTokens = [
        { scope: 'comment', settings: { foreground: '#888888' } }
      ] as TokenColor[];
      
      const styled = FontStyleGenerator.applyFontStyles(mockTokens);
      expect(styled[0].settings.fontStyle).toBe('italic');
    });
  });
  
  describe('Language-Specific Token Generation', () => {
    it('should generate Python-specific rules', () => {
      const generator = new PythonTokenGenerator();
      const mockPalette = createMockExtendedPalette();
      const rules = generator.generateRules(mockPalette);
      
      expect(rules.some(r => r.name.includes('Decorator'))).toBe(true);
      expect(rules.some(r => r.name.includes('Magic Method'))).toBe(true);
    });
    
    it('should generate TypeScript-specific rules', () => {
      const generator = new TypeScriptTokenGenerator();
      const mockPalette = createMockExtendedPalette();
      const rules = generator.generateRules(mockPalette);
      
      expect(rules.some(r => r.name.includes('Interface'))).toBe(true);
      expect(rules.some(r => r.name.includes('Generic'))).toBe(true);
    });
  });
  
  describe('Rainbow Coloring', () => {
    it('should generate rainbow sets with correct depth', () => {
      const mockPalette = createMockExtendedPalette();
      const rainbowSet = StructuredDataColorizer.createRainbowSet(mockPalette, 'vibrant');
      
      expect(rainbowSet.colors.length).toBe(9);
      expect(rainbowSet.maxDepth).toBe(9);
    });
    
    it('should cycle colors for infinite depth', () => {
      const mockPalette = createMockExtendedPalette();
      const rainbowSet = StructuredDataColorizer.createRainbowSet(mockPalette, 'vibrant');
      
      expect(StructuredDataColorizer.getCyclicColor(rainbowSet, 0)).toBe(rainbowSet.colors[0]);
      expect(StructuredDataColorizer.getCyclicColor(rainbowSet, 9)).toBe(rainbowSet.colors[0]);
      expect(StructuredDataColorizer.getCyclicColor(rainbowSet, 10)).toBe(rainbowSet.colors[1]);
    });
    
    it('should adapt to file complexity', () => {
      const mockPalette = createMockExtendedPalette();
      const fullRainbow = StructuredDataColorizer.createRainbowSet(mockPalette, 'vibrant');
      const simpleRainbow = StructuredDataColorizer.adjustForComplexity(fullRainbow, 2);
      
      expect(simpleRainbow.colors.length).toBe(4);
    });
  });
});

describe('Integration Tests', () => {
  it('should generate complete professional theme', () => {
    const mockGhosttyColors = createMockGhosttyColors();
    const theme = generateProTheme(mockGhosttyColors);
    
    // Verify all major sections are present
    expect(theme.colors).toBeDefined();
    expect(theme.tokenColors).toBeDefined();
    expect(theme.semanticTokenColors).toBeDefined();
    
    // Verify property counts match professional standards
    expect(Object.keys(theme.colors).length).toBeGreaterThan(200);
    expect(theme.tokenColors.length).toBeGreaterThan(150);
  });
  
  it('should preserve authentic terminal colors', () => {
    const ghosttyColors = createMockGhosttyColors();
    const theme = generateProTheme(ghosttyColors);
    
    // Core terminal colors should be used directly in appropriate contexts
    const stringTokens = theme.tokenColors.filter(t => 
      Array.isArray(t.scope) ? 
        t.scope.some(s => s.includes('string')) :
        t.scope.includes('string')
    );
    
    expect(stringTokens.some(t => t.settings.foreground === ghosttyColors.color2)).toBe(true);
  });
});

// Test utilities
function createMockGhosttyColors(): GhosttyColors {
  return {
    background: '#1a1b26',
    foreground: '#c0caf5', 
    color1: '#f7768e',
    color2: '#9ece6a',
    color3: '#e0af68',
    color4: '#7aa2f7',
    color5: '#bb9af7',
    color6: '#7dcfff',
    // ... other colors
  } as GhosttyColors;
}

function createMockExtendedPalette(): ExtendedPalette {
  return {
    primary: {
      red: '#f7768e',
      green: '#9ece6a',
      blue: '#7aa2f7',
      yellow: '#e0af68',
      purple: '#bb9af7',
      cyan: '#7dcfff',
    },
    derived: {
      redLight: '#ff9db4',
      greenLight: '#b9f27c',
      // ... other derived colors
    }
  } as ExtendedPalette;
}
```

### Accessibility & Compliance Tests
```typescript
describe('Accessibility Validation', () => {
  it('should meet WCAG contrast requirements', () => {
    const theme = generateProTheme(createMockGhosttyColors());
    
    // Test critical contrast ratios
    const editorBg = theme.colors['editor.background'];
    const editorFg = theme.colors['editor.foreground'];
    
    expect(calculateContrastRatio(editorFg, editorBg)).toBeGreaterThan(4.5);
  });
  
  it('should support high contrast mode', () => {
    const theme = generateProTheme(createMockGhosttyColors());
    expect(theme.colors['contrastBorder']).toBeDefined();
    expect(theme.colors['contrastActiveBorder']).toBeDefined();
  });
});
```

**Testing Philosophy**: Comprehensive testing ensures professional quality. Unit tests verify individual algorithms. Integration tests confirm system cohesion. Accessibility tests ensure inclusive design. Real-world tests validate practical usage.

---

## 📝 Implementation Notes

### File Modifications Required
- `src/lib/theme-generator.ts`: Major refactor of core functions
- `src/types/index.ts`: Add new interface definitions
- `test/lib/theme-generator.test.ts`: Comprehensive test updates

### Dependencies
- No new dependencies required
- Uses existing color manipulation functions
- Leverages current VS Code theme structure

This plan transforms our basic theme generator into a professional-grade tool that produces themes matching the sophistication of the best themes in the VS Code marketplace while preserving the authentic personality of each terminal theme.

---

## 📚 Implementation Patterns Appendix

### Complete Interface Definitions
```typescript
// Core extended palette interface
interface ExtendedPalette {
  primary: {
    red: string;
    green: string;
    blue: string;
    yellow: string;
    purple: string;
    cyan: string;
  };
  derived: {
    // Lightness variations
    redLight: string;
    redDark: string;
    greenLight: string;
    greenDark: string;
    blueLight: string;
    blueDark: string;
    yellowLight: string;
    yellowDark: string;
    purpleLight: string;
    purpleDark: string;
    cyanLight: string;
    cyanDark: string;
    
    // Saturation variations
    redMuted: string;
    greenMuted: string;
    blueMuted: string;
    yellowMuted: string;
    purpleMuted: string;
    cyanMuted: string;
    
    // Special purpose colors
    orangeWarm: string;
    orangeLight: string;
    orangeDark: string;
    mutedYellow: string;
    mutedCyan: string;
    rainbowPrimary: string;
    snippetAccent: string;
    eventAccent: string;
    selfAccent: string;
    magicMethod: string;
    typeAnnotation: string;
    genericType: string;
    builtinType: string;
    destructured: string;
    lifetime: string;
    attribute: string;
    componentName: string;
    hookFunction: string;
  };
  foreground: string;
}

// Pro theme structure
interface ProTheme {
  name: string;
  type: 'dark' | 'light';
  colors: VSCodeThemeColors;
  tokenColors: TokenColor[];
  semanticTokenColors: Record<string, SemanticTokenStyle>;
  semanticHighlighting: boolean;
}

interface SemanticTokenStyle {
  foreground?: string;
  background?: string;
  fontStyle?: 'italic' | 'bold' | 'underline' | 'italic bold';
}
```

### Master Theme Generator Implementation
```typescript
class ProThemeGenerator {
  static generateTheme(ghosttyColors: GhosttyColors, options: ThemeOptions = {}): ProTheme {
    // Phase 1: Create extended palette preserving authenticity
    const extendedPalette = this.extendColorPalette(ghosttyColors);
    
    // Phase 2: Generate background hierarchy 
    const backgrounds = BackgroundGenerator.createHierarchy(
      ghosttyColors.background, 
      options.type || 'dark'
    );
    
    // Phase 3: Create accent system
    const accents = AccentGenerator.createAccentSystem(ghosttyColors);
    
    // Phase 4: Generate comprehensive UI colors
    const uiColors = this.generateUIColors(backgrounds, accents, extendedPalette);
    
    // Phase 5: Create token colors with language support
    const tokenColors = this.generateTokenColors(extendedPalette, options);
    
    // Phase 6: Add semantic tokens
    const semanticTokens = this.generateSemanticTokens(extendedPalette);
    
    // Phase 7: Apply border strategy
    const borders = BorderManager.generateBorderStrategy(backgrounds, accents);
    
    return {
      name: options.name || 'Pro Generated Theme',
      type: options.type || 'dark',
      colors: { ...uiColors, ...borders },
      tokenColors,
      semanticTokenColors: semanticTokens,
      semanticHighlighting: true,
    };
  }
  
  private static extendColorPalette(ghosttyColors: GhosttyColors): ExtendedPalette {
    return {
      primary: {
        red: ghosttyColors.color1,
        green: ghosttyColors.color2,
        blue: ghosttyColors.color4,
        yellow: ghosttyColors.color3,
        purple: ghosttyColors.color5,
        cyan: ghosttyColors.color6,
      },
      derived: {
        // Mathematical derivations preserving hue/saturation
        redLight: this.adjustLightness(ghosttyColors.color1, 0.15),
        redDark: this.adjustLightness(ghosttyColors.color1, -0.15),
        redMuted: this.adjustSaturation(ghosttyColors.color1, -0.3),
        
        greenLight: this.adjustLightness(ghosttyColors.color2, 0.15),
        greenDark: this.adjustLightness(ghosttyColors.color2, -0.15),
        greenMuted: this.adjustSaturation(ghosttyColors.color2, -0.3),
        
        // Continue for all colors...
        
        // Special purpose colors derived from palette
        orangeWarm: this.blendColors(ghosttyColors.color1, ghosttyColors.color3, 0.6),
        orangeLight: this.adjustLightness(this.blendColors(ghosttyColors.color1, ghosttyColors.color3, 0.6), 0.1),
        
        // Context-specific derivations
        typeAnnotation: this.adjustSaturation(ghosttyColors.color4, -0.2),
        selfAccent: this.adjustHue(ghosttyColors.color1, 15),
        magicMethod: this.adjustLightness(ghosttyColors.color5, 0.1),
        
        // Rainbow and special effects
        rainbowPrimary: this.increaseSaturation(ghosttyColors.color1, 0.2),
        snippetAccent: this.blendColors(ghosttyColors.color6, ghosttyColors.color5, 0.7),
      },
      foreground: ghosttyColors.foreground,
    };
  }
  
  private static generateUIColors(
    backgrounds: BackgroundHierarchy,
    accents: AccentSystem,
    palette: ExtendedPalette
  ): Partial<VSCodeThemeColors> {
    const baseMapping = BackgroundGenerator.mapToUIElements(backgrounds);
    const accentMapping = AccentGenerator.applyAccentSystem(accents, {} as VSCodeThemeColors);
    const symbolColors = SymbolIconColorGenerator.generateSymbolColors(palette);
    
    return {
      ...baseMapping,
      ...accentMapping,
      ...symbolColors,
      
      // Additional comprehensive UI colors (200+ properties)
      // Breadcrumb system
      'breadcrumb.foreground': palette.foreground,
      'breadcrumb.focusForeground': accents.primary.light,
      'breadcrumb.activeSelectionForeground': accents.primary.base,
      'breadcrumbPicker.background': backgrounds.overlay,
      
      // Minimap system
      'minimap.findMatchHighlight': `${accents.primary.base}${OpacitySystem.toHex(0.8)}`,
      'minimap.selectionHighlight': `${accents.primary.base}${OpacitySystem.toHex(0.6)}`,
      'minimap.errorHighlight': `${palette.primary.red}${OpacitySystem.toHex(0.8)}`,
      'minimap.warningHighlight': `${palette.primary.yellow}${OpacitySystem.toHex(0.8)}`,
      'minimap.background': backgrounds.canvas,
      
      // Notification system
      'notificationCenter.border': backgrounds.shadow,
      'notificationCenterHeader.foreground': palette.foreground,
      'notificationCenterHeader.background': backgrounds.surface,
      'notifications.background': backgrounds.overlay,
      'notifications.border': backgrounds.shadow,
      'notifications.foreground': palette.foreground,
      'notificationsErrorIcon.foreground': palette.primary.red,
      'notificationsWarningIcon.foreground': palette.primary.yellow,
      'notificationsInfoIcon.foreground': palette.primary.blue,
      
      // Menu system
      'menu.background': backgrounds.overlay,
      'menu.border': backgrounds.shadow,
      'menu.foreground': palette.foreground,
      'menu.selectionBackground': `${accents.primary.base}${OpacitySystem.toHex(0.13)}`,
      'menu.selectionForeground': accents.primary.light,
      'menu.separatorBackground': backgrounds.shadow,
      'menubar.selectionBackground': `${accents.primary.base}${OpacitySystem.toHex(0.13)}`,
      'menubar.selectionForeground': accents.primary.light,
      
      // Quick input system
      'quickInput.background': backgrounds.overlay,
      'quickInput.foreground': palette.foreground,
      'quickInputList.focusBackground': `${accents.primary.base}${OpacitySystem.toHex(0.13)}`,
      'quickInputList.focusForeground': accents.primary.light,
      'quickInputTitle.background': backgrounds.surface,
      
      // Extensions system
      'extensionButton.prominentBackground': accents.primary.base,
      'extensionButton.prominentForeground': backgrounds.canvas,
      'extensionButton.prominentHoverBackground': accents.primary.light,
      'extensionBadge.remoteBackground': accents.secondary?.base || accents.primary.muted,
      'extensionBadge.remoteForeground': backgrounds.canvas,
      'extensionIcon.starForeground': palette.primary.yellow,
      'extensionIcon.verifiedForeground': palette.primary.green,
      'extensionIcon.preReleaseForeground': palette.primary.yellow,
      'extensionIcon.sponsorForeground': palette.primary.red,
      
      // Testing system
      'testing.iconFailed': palette.primary.red,
      'testing.iconErrored': palette.derived.redDark,
      'testing.iconPassed': palette.primary.green,
      'testing.runAction': accents.primary.base,
      'testing.iconQueued': palette.primary.yellow,
      'testing.iconUnset': palette.derived.mutedCyan,
      'testing.iconSkipped': palette.derived.mutedYellow,
      'testing.peekBorder': accents.primary.base,
      'testing.peekHeaderBackground': `${accents.primary.base}${OpacitySystem.toHex(0.1)}`,
      'testing.message.error.decorationForeground': palette.primary.red,
      'testing.message.error.lineBackground': `${palette.primary.red}${OpacitySystem.toHex(0.1)}`,
      'testing.message.info.decorationForeground': palette.primary.blue,
      'testing.message.info.lineBackground': `${palette.primary.blue}${OpacitySystem.toHex(0.1)}`,
      
      // Debug system  
      'debugToolBar.background': backgrounds.overlay,
      'debugToolBar.border': backgrounds.shadow,
      'debugIcon.breakpointForeground': palette.primary.red,
      'debugIcon.breakpointDisabledForeground': palette.derived.redMuted,
      'debugIcon.breakpointUnverifiedForeground': palette.derived.mutedYellow,
      'debugIcon.continueForeground': palette.primary.green,
      'debugIcon.disconnectForeground': palette.primary.red,
      'debugIcon.pauseForeground': palette.primary.yellow,
      'debugIcon.restartForeground': palette.primary.blue,
      'debugIcon.startForeground': palette.primary.green,
      'debugIcon.stepBackForeground': palette.primary.cyan,
      'debugIcon.stepIntoForeground': palette.primary.cyan,
      'debugIcon.stepOutForeground': palette.primary.cyan,
      'debugIcon.stepOverForeground': palette.primary.cyan,
      'debugIcon.stopForeground': palette.primary.red,
      'debugConsole.errorForeground': palette.primary.red,
      'debugConsole.infoForeground': palette.primary.blue,
      'debugConsole.sourceForeground': palette.foreground,
      'debugConsole.warningForeground': palette.primary.yellow,
      'debugConsoleInputIcon.foreground': palette.foreground,
      
      // Welcome page
      'welcomePage.background': backgrounds.canvas,
      'welcomePage.buttonBackground': `${accents.primary.base}${OpacitySystem.toHex(0.1)}`,
      'welcomePage.buttonHoverBackground': `${accents.primary.base}${OpacitySystem.toHex(0.2)}`,
      'welcomePage.tileBackground': backgrounds.surface,
      'welcomePage.tileHoverBackground': backgrounds.overlay,
      'welcomePage.tileShadow': `${backgrounds.void}${OpacitySystem.toHex(0.3)}`,
      
      // Settings system
      'settings.headerForeground': palette.foreground,
      'settings.modifiedItemIndicator': accents.primary.base,
      'settings.dropdownBackground': backgrounds.interactive,
      'settings.dropdownForeground': palette.foreground,
      'settings.dropdownBorder': backgrounds.shadow,
      'settings.dropdownListBorder': backgrounds.shadow,
      'settings.checkboxBackground': backgrounds.interactive,
      'settings.checkboxForeground': palette.foreground,
      'settings.checkboxBorder': backgrounds.shadow,
      'settings.textInputBackground': backgrounds.interactive,
      'settings.textInputForeground': palette.foreground,
      'settings.textInputBorder': backgrounds.shadow,
      'settings.numberInputBackground': backgrounds.interactive,
      'settings.numberInputForeground': palette.foreground,
      'settings.numberInputBorder': backgrounds.shadow,
      'settings.focusedRowBackground': `${accents.primary.base}${OpacitySystem.toHex(0.08)}`,
      'settings.rowHoverBackground': `${accents.primary.base}${OpacitySystem.toHex(0.05)}`,
      'settings.focusedRowBorder': accents.primary.base,
    };
  }
  
  private static generateTokenColors(palette: ExtendedPalette, options: ThemeOptions): TokenColor[] {
    // Base semantic tokens
    const baseTokens = this.generateBaseTokens(palette);
    
    // Language-specific tokens
    const languageManager = new LanguageTokenManager();
    const languageTokens = languageManager.generateAllLanguageRules(palette);
    
    // Rainbow tokens for structured data
    const rainbowTokens = StructuredDataColorizer.generateAllRainbows(palette, 'vibrant');
    
    // Apply font styles
    const allTokens = [...baseTokens, ...languageTokens, ...rainbowTokens];
    return FontStyleGenerator.applyFontStyles(allTokens);
  }
  
  private static generateSemanticTokens(palette: ExtendedPalette): Record<string, SemanticTokenStyle> {
    return {
      // Variable semantics
      'variable': { foreground: palette.foreground },
      'variable.declaration': { foreground: palette.derived.redLight },
      'variable.defaultLibrary': { foreground: palette.derived.builtinType },
      'variable.readonly': { foreground: palette.derived.redMuted },
      
      // Function semantics  
      'function': { foreground: palette.primary.cyan },
      'function.declaration': { foreground: palette.derived.cyanLight },
      'function.defaultLibrary': { foreground: palette.derived.builtinType },
      'method': { foreground: palette.primary.cyan },
      'method.declaration': { foreground: palette.derived.cyanLight },
      
      // Parameter semantics
      'parameter': { foreground: palette.foreground, fontStyle: 'italic' },
      'parameter.declaration': { foreground: palette.primary.yellow, fontStyle: 'italic' },
      
      // Property semantics
      'property': { foreground: palette.derived.redLight },
      'property.declaration': { foreground: palette.primary.red },
      'property.defaultLibrary': { foreground: palette.derived.builtinType },
      'property.readonly': { foreground: palette.derived.redMuted },
      
      // Type semantics
      'type': { foreground: palette.primary.blue },
      'type.declaration': { foreground: palette.derived.blueLight },
      'type.defaultLibrary': { foreground: palette.derived.builtinType },
      'interface': { foreground: palette.primary.cyan, fontStyle: 'italic' },
      'typeParameter': { foreground: palette.derived.genericType },
      'enum': { foreground: palette.primary.yellow },
      'enumMember': { foreground: palette.derived.yellowLight },
      
      // Class semantics
      'class': { foreground: palette.primary.purple },
      'class.declaration': { foreground: palette.derived.purpleLight },
      'class.defaultLibrary': { foreground: palette.derived.builtinType },
      
      // Language construct semantics
      'keyword': { foreground: palette.primary.purple, fontStyle: 'italic' },
      'modifier': { foreground: palette.derived.purpleMuted, fontStyle: 'italic' },
      'namespace': { foreground: palette.derived.purpleLight },
      
      // Special semantics
      '*.defaultLibrary': { foreground: palette.derived.builtinType },
      '*.deprecated': { fontStyle: 'italic' },
      '*.async': { fontStyle: 'italic' },
    };
  }
}
```

### Usage Examples
```typescript
// Basic usage
const theme = ProThemeGenerator.generateTheme(ghosttyColors);

// Advanced usage with options
const theme = ProThemeGenerator.generateTheme(ghosttyColors, {
  name: 'My Pro Theme',
  type: 'dark',
  borderPhilosophy: 'minimal',
  rainbowIntensity: 'subtle',
  fontStyleStrategy: 'conservative'
});

// Export theme for VS Code
const themeJSON = {
  $schema: 'vscode://schemas/color-theme',
  ...theme
};
```

This comprehensive implementation provides a complete professional theme generation system that transforms basic terminal colors into sophisticated VS Code themes while preserving their authentic character.