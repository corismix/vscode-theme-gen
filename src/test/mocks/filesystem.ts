import { vi } from 'vitest';

export const mockFileSystem = () => {
  const mockFiles: Record<string, string> = {
    '/test/theme.txt': `background=#1a1a1a
foreground=#e0e0e0
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
cursor=#ff0000
selection_background=#404040
selection_foreground=#ffffff`,
    '/test/recent.json': JSON.stringify([
      { path: '/test/theme.txt', name: 'test theme', lastUsed: Date.now() }
    ]),
    '/test/output/package.json': '{"name": "test-theme"}',
    '/test/output/themes/theme.json': '{"name": "Test Theme", "type": "dark"}',
  };

  const mockDirs: Set<string> = new Set([
    '/test',
    '/test/output',
    '/test/output/themes',
    '/Users/test/Desktop',
  ]);

  // Mock fs/promises
  vi.mock('fs/promises', () => ({
    readFile: vi.fn((path: string) => {
      const content = mockFiles[path];
      if (content !== undefined) {
        return Promise.resolve(content);
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, open '${path}'`));
    }),
    
    writeFile: vi.fn((path: string, content: string) => {
      mockFiles[path] = content;
      return Promise.resolve();
    }),
    
    mkdir: vi.fn((path: string, options?: any) => {
      mockDirs.add(path);
      return Promise.resolve(path);
    }),
    
    access: vi.fn((path: string, mode?: number) => {
      if (mockFiles[path] !== undefined || mockDirs.has(path)) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, access '${path}'`));
    }),
    
    readdir: vi.fn((path: string) => {
      if (path === '/test') {
        return Promise.resolve([
          { name: 'theme.txt', isFile: () => true, isDirectory: () => false },
          { name: 'recent.json', isFile: () => true, isDirectory: () => false },
        ]);
      }
      return Promise.resolve([]);
    }),
    
    stat: vi.fn((path: string) => {
      if (mockFiles[path] !== undefined) {
        return Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
          size: mockFiles[path].length,
          mtime: new Date(),
        });
      }
      if (mockDirs.has(path)) {
        return Promise.resolve({
          isFile: () => false,
          isDirectory: () => true,
          size: 0,
          mtime: new Date(),
        });
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, stat '${path}'`));
    }),
  }));

  // Mock path functions
  vi.mock('path', () => ({
    join: vi.fn((...paths: string[]) => paths.join('/')),
    resolve: vi.fn((...paths: string[]) => '/' + paths.filter(p => p !== '').join('/')),
    dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/') || '/'),
    basename: vi.fn((path: string) => path.split('/').pop() || ''),
    extname: vi.fn((path: string) => {
      const name = path.split('/').pop() || '';
      const dotIndex = name.lastIndexOf('.');
      return dotIndex >= 0 ? name.slice(dotIndex) : '';
    }),
  }));

  // Mock os
  vi.mock('os', () => ({
    homedir: vi.fn(() => '/Users/test'),
    tmpdir: vi.fn(() => '/tmp'),
  }));

  return {
    addMockFile: (path: string, content: string) => {
      mockFiles[path] = content;
    },
    addMockDir: (path: string) => {
      mockDirs.add(path);
    },
    getMockFile: (path: string) => mockFiles[path],
    getMockFiles: () => ({ ...mockFiles }),
    clearMockFiles: () => {
      Object.keys(mockFiles).forEach(key => delete mockFiles[key]);
    },
  };
};