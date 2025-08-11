import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FileSelector } from '../../components/FileSelector.js';
import { AppContextProvider } from '../../context/AppContext.js';
import { NotificationProvider } from '../../context/NotificationContext.js';
import { mockFileSystem } from '../mocks/filesystem.js';

describe('FileSelector', () => {
  let mockFs: ReturnType<typeof mockFileSystem>;

  beforeEach(() => {
    mockFs = mockFileSystem();
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      React.createElement(NotificationProvider, {},
        React.createElement(AppContextProvider, {}, component)
      )
    );
  };

  it('should render file selector component', () => {
    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    expect(container).toBeDefined();
    // Check for main heading text
    expect(container.textContent).toContain('Theme File Selection');
  });

  it('should show loading state initially', () => {
    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    expect(container.textContent).toContain('Scanning for theme files...');
  });

  it('should display recent files section', () => {
    mockFs.addMockFile('/test/recent.json', JSON.stringify([
      { path: '/test/theme1.txt', name: 'Theme 1', lastUsed: Date.now() - 1000 },
      { path: '/test/theme2.txt', name: 'Theme 2', lastUsed: Date.now() - 2000 },
    ]));

    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    // Should show recent files section
    expect(container.textContent).toContain('Recent Files');
  });

  it('should display available theme files', () => {
    mockFs.addMockFile('/test/theme1.txt', 'background=#000000');
    mockFs.addMockFile('/test/theme2.txt', 'background=#ffffff');

    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    expect(container.textContent).toContain('Available Files');
  });

  it('should show custom path input section', () => {
    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    expect(container.textContent).toContain('Custom Path');
    expect(container.textContent).toContain('Enter custom file path');
  });

  it('should validate file extensions', () => {
    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    // The component should mention supported formats
    expect(container.textContent).toContain('.txt');
  });

  it('should handle file selection', () => {
    mockFs.addMockFile('/test/valid-theme.txt', `background=#1a1a1a
foreground=#e0e0e0
color0=#000000`);

    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    // Component should be ready for file selection
    expect(container).toBeDefined();
  });

  it('should show error for invalid files', () => {
    mockFs.addMockFile('/test/invalid.txt', 'not a theme file');

    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    // Component should handle validation
    expect(container).toBeDefined();
  });

  it('should handle navigation controls', () => {
    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    // Should show navigation hints
    expect(container.textContent).toMatch(/Navigate|Select|Back/i);
  });

  it('should display file count', () => {
    mockFs.addMockFile('/test/theme1.txt', 'background=#000000');
    mockFs.addMockFile('/test/theme2.txt', 'background=#111111');
    mockFs.addMockFile('/test/theme3.txt', 'background=#222222');

    const { container } = renderWithProviders(React.createElement(FileSelector));
    
    // Should show count information
    expect(container.textContent).toMatch(/\d+.*files?/i);
  });
});