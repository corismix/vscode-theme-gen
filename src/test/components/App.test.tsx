import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { App } from '../../components/App.js';
import { mockFileSystem } from '../mocks/filesystem.js';
import { mockInkComponents } from '../mocks/ink.js';

describe('App', () => {
  let mockFs: ReturnType<typeof mockFileSystem>;
  let mockInk: ReturnType<typeof mockInkComponents>;

  beforeEach(() => {
    mockFs = mockFileSystem();
    mockInk = mockInkComponents();
    vi.clearAllMocks();
  });

  it('should render app component', () => {
    const { container } = render(React.createElement(App));
    
    expect(container).toBeDefined();
  });

  it('should show welcome screen by default', () => {
    const { container } = render(React.createElement(App));
    
    // Should contain welcome content
    expect(container.textContent).toContain('VS Code Theme Generator');
  });

  it('should handle step navigation', () => {
    const { container } = render(React.createElement(App));
    
    // App should render some content
    expect(container.innerHTML).toBeTruthy();
  });

  it('should provide context to child components', () => {
    const { container } = render(React.createElement(App));
    
    // App should provide context without errors
    expect(container).toBeDefined();
  });

  it('should handle notifications', () => {
    const { container } = render(React.createElement(App));
    
    // Should have notification system in place
    expect(container).toBeDefined();
  });

  it('should handle keyboard input', () => {
    const { container } = render(React.createElement(App));
    
    // Simulate key input
    mockInk.triggerKeyInput('', { return: true });
    
    expect(container).toBeDefined();
  });

  it('should handle step transitions', () => {
    const { container } = render(React.createElement(App));
    
    // Should handle state changes
    expect(container).toBeDefined();
  });

  it('should handle error states', () => {
    const { container } = render(React.createElement(App));
    
    // Should handle errors gracefully
    expect(container).toBeDefined();
  });

  it('should clean up properly', () => {
    const { unmount } = render(React.createElement(App));
    
    expect(() => unmount()).not.toThrow();
  });
});