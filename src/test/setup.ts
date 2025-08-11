import { vi } from 'vitest';
import { mockFileSystem } from './mocks/filesystem.js';
import { mockInkComponents } from './mocks/ink.js';

// Setup global mocks
mockFileSystem();
mockInkComponents();

// Mock process.exit to prevent tests from actually exiting
vi.mock('process', () => ({
  exit: vi.fn(),
  platform: 'darwin',
  cwd: vi.fn(() => '/test/cwd'),
  env: {
    NODE_ENV: 'test',
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((command, callback) => {
    // Mock successful commands
    if (command.includes('code --version')) {
      callback(null, { stdout: '1.85.0', stderr: '' });
    } else if (command.includes('vsce --version')) {
      callback(null, { stdout: '2.15.0', stderr: '' });
    } else {
      callback(null, { stdout: 'mocked output', stderr: '' });
    }
  }),
  spawn: vi.fn(),
}));

// Set test timeout
vi.setConfig({
  testTimeout: 10000,
});