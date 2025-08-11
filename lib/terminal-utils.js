import { useState, useEffect, useCallback } from 'react';
import { useStdout } from 'ink';

// Increase max listeners to prevent memory leak warnings from multiple resize hooks
process.stdout.setMaxListeners(15);

// Terminal size breakpoints
export const BREAKPOINTS = {
  WIDTH: {
    xs: 60,    // Extra small terminals (mobile, tmux panels)
    sm: 80,    // Standard terminal width
    lg: 120    // Large terminal width
  },
  HEIGHT: {
    xs: 20,    // Very short terminals
    sm: 30,    // Standard height
    lg: 50     // Large height
  }
};

// Get terminal size classification
export const getTerminalSize = (columns, rows) => {
  let width = 'lg';
  if (columns <= BREAKPOINTS.WIDTH.xs) width = 'xs';
  else if (columns <= BREAKPOINTS.WIDTH.sm) width = 'sm';

  let height = 'lg';
  if (rows <= BREAKPOINTS.HEIGHT.xs) height = 'xs';
  else if (rows <= BREAKPOINTS.HEIGHT.sm) height = 'sm';

  return { width, height, columns, rows };
};

// Hook for terminal size detection with responsive breakpoints
export const useTerminalSize = () => {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => {
    const columns = stdout?.columns || 80;
    const rows = stdout?.rows || 24;
    return getTerminalSize(columns, rows);
  });

  const updateSize = useCallback(() => {
    if (stdout) {
      const newSize = getTerminalSize(stdout.columns, stdout.rows);
      setSize(newSize);
    }
  }, [stdout]);

  useEffect(() => {
    updateSize();
    
    // Listen for resize events with debouncing
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateSize();
      }, 100); // 100ms debounce
    };
    
    process.stdout.on('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimer);
      process.stdout.off('resize', handleResize);
    };
  }, [updateSize]);

  return size;
};

// Hook for terminal capabilities detection
export const useTerminalCapabilities = () => {
  const [capabilities, setCapabilities] = useState(() => ({
    colors: detectColorSupport(),
    unicode: detectUnicodeSupport(),
    platform: process.platform,
    isCI: detectCIEnvironment(),
    supportsInteraction: detectInteractionSupport()
  }));

  return capabilities;
};

// Detect color support level
export const detectColorSupport = () => {
  // Check NO_COLOR environment variable (respected by many CLIs)
  if (process.env.NO_COLOR) {
    return 'none';
  }

  // Check FORCE_COLOR
  if (process.env.FORCE_COLOR) {
    return 'full';
  }

  // Check terminal type and capabilities
  const term = process.env.TERM || '';
  const colorterm = process.env.COLORTERM || '';

  // Full color support
  if (colorterm === 'truecolor' || term.includes('256color') || term.includes('24bit')) {
    return 'full';
  }

  // Basic color support
  if (term.includes('color') || term === 'xterm' || term === 'screen') {
    return 'basic';
  }

  // Check if we're in a known terminal with color support
  const knownColorTerms = ['iterm', 'hyper', 'vscode', 'gnome-terminal', 'konsole'];
  if (knownColorTerms.some(t => term.includes(t))) {
    return 'basic';
  }

  // Default to basic if stdout is a TTY
  return process.stdout.isTTY ? 'basic' : 'none';
};

// Detect Unicode support
export const detectUnicodeSupport = () => {
  // Check locale
  const locale = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '';
  return locale.toLowerCase().includes('utf') || locale.toLowerCase().includes('unicode');
};

// Detect CI environment
export const detectCIEnvironment = () => {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_ACTIONS ||
    process.env.TRAVIS ||
    process.env.CIRCLECI
  );
};

// Detect if terminal supports interaction
export const detectInteractionSupport = () => {
  return process.stdin.isTTY && process.stdout.isTTY && !detectCIEnvironment();
};

// Hook for responsive behavior based on terminal constraints
export const useResponsiveLayout = () => {
  const size = useTerminalSize();
  const capabilities = useTerminalCapabilities();

  const layout = {
    // Content constraints
    maxContentWidth: Math.min(size.columns - 4, 120), // Leave padding
    maxContentHeight: Math.max(size.rows - 6, 10), // Leave space for navigation
    
    // Layout decisions
    shouldStack: size.width === 'xs' || size.columns < 100,
    showCompact: size.height === 'xs' || size.rows < 25,
    showFullFeatures: size.width === 'lg' && size.height === 'lg',
    
    // Content limits
    maxRecentFiles: size.height === 'xs' ? 2 : (size.height === 'sm' ? 3 : 5),
    maxSteps: size.height === 'xs' ? 3 : (size.height === 'sm' ? 5 : 7),
    maxFeatureItems: size.height === 'xs' ? 2 : 4,
    
    // UI preferences
    useBigText: size.height !== 'xs' && size.columns >= 60,
    showIcons: capabilities.unicode && capabilities.colors !== 'none',
    useColors: capabilities.colors !== 'none',
    showBorders: size.width !== 'xs',
    
    // Size info
    ...size,
    ...capabilities
  };

  return layout;
};

// Hook for responsive content chunking
export const useContentChunking = (content, maxItems = null) => {
  const layout = useResponsiveLayout();
  
  const chunkSize = maxItems || (
    layout.showCompact ? Math.floor(layout.maxContentHeight / 3) : 
    Math.floor(layout.maxContentHeight / 2)
  );

  const [currentChunk, setCurrentChunk] = useState(0);
  
  const chunks = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }

  const hasMultipleChunks = chunks.length > 1;
  
  const nextChunk = useCallback(() => {
    setCurrentChunk(prev => (prev + 1) % chunks.length);
  }, [chunks.length]);

  const prevChunk = useCallback(() => {
    setCurrentChunk(prev => (prev - 1 + chunks.length) % chunks.length);
  }, [chunks.length]);

  return {
    currentItems: chunks[currentChunk] || [],
    hasMultipleChunks,
    currentChunk,
    totalChunks: chunks.length,
    nextChunk,
    prevChunk,
    chunkSize
  };
};

// Hook for managing progressive disclosure
export const useProgressiveDisclosure = (initialShow = false, delay = 500) => {
  const [isVisible, setIsVisible] = useState(initialShow);
  const layout = useResponsiveLayout();

  useEffect(() => {
    if (!initialShow && !layout.showCompact) {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    } else if (layout.showCompact) {
      // In compact mode, show immediately
      setIsVisible(true);
    }
  }, [initialShow, delay, layout.showCompact]);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  return {
    isVisible,
    show,
    hide,
    toggle
  };
};

// Platform-specific adaptations
export const usePlatformAdaptation = () => {
  const capabilities = useTerminalCapabilities();
  
  const adaptations = {
    // Key combinations
    keyBindings: {
      exit: capabilities.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+C',
      back: capabilities.platform === 'darwin' ? 'Cmd+←' : 'Escape',
      forward: capabilities.platform === 'darwin' ? 'Cmd+→' : 'Tab',
      help: capabilities.platform === 'win32' ? 'F1' : 'h'
    },
    
    // Path separators and conventions
    pathSeparator: capabilities.platform === 'win32' ? '\\' : '/',
    
    // Text conventions
    textConventions: {
      ellipsis: capabilities.unicode ? '…' : '...',
      bullet: capabilities.unicode ? '•' : '*',
      arrow: capabilities.unicode ? '→' : '->'
    },
    
    ...capabilities
  };

  return adaptations;
};

// Utility function to adapt colors based on terminal capabilities
export const adaptColor = (color, capabilities) => {
  if (!capabilities) {
    capabilities = {
      colors: detectColorSupport()
    };
  }

  if (capabilities.colors === 'none') {
    return undefined; // Let Ink handle no-color mode
  }

  return color;
};

// Utility function to adapt text based on terminal capabilities
export const adaptText = (text, fallback, capabilities) => {
  if (!capabilities) {
    capabilities = {
      unicode: detectUnicodeSupport()
    };
  }

  return capabilities.unicode ? text : fallback;
};

// High contrast mode detection and support
export const useHighContrastMode = () => {
  const capabilities = useTerminalCapabilities();
  
  // Check for high contrast preference
  const preferHighContrast = !!(
    process.env.FORCE_HIGH_CONTRAST ||
    process.env.HIGH_CONTRAST ||
    capabilities.colors === 'none'
  );

  return {
    preferHighContrast,
    getColor: (normalColor, highContrastColor) => 
      preferHighContrast ? (highContrastColor || normalColor) : normalColor
  };
};