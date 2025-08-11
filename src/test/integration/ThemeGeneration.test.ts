import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { FileService } from '@/services/FileService';
import { SecurityService } from '@/services/SecurityService';
import { ProcessService } from '@/services/ProcessService';
import { parseThemeFile } from '@/lib/theme-generator';
import { generateExtensionFiles } from '@/lib/file-generators';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  },
}));

// Mock crypto for hash generation
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash'),
  })),
}));

describe('End-to-End Theme Generation Flow', () => {
  let fileService: FileService;
  let securityService: SecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    fileService = new FileService();
    securityService = new SecurityService();
  });

  afterEach(() => {
    fileService.cleanup();
    securityService.cleanup();
  });

  describe('Complete Theme Generation Workflow', () => {
    const mockThemeContent = `
# Ghostty theme configuration
background=#1e1e1e
foreground=#d4d4d4
cursor=#ffffff
selection_background=#264f78
selection_foreground=#ffffff
color0=#000000
color1=#cd3131
color2=#0dbc79
color3=#e5e510
color4=#2472c8
color5=#bc3fbc
color6=#11a8cd
color7=#e5e5e5
color8=#666666
color9=#f14c4c
color10=#23d18b
color11=#f5f543
color12=#3b8eea
color13=#d670d6
color14=#29b8db
color15=#e5e5e5
    `.trim();

    const mockThemeConfig = {
      themeName: 'Dark Professional',
      description: 'A professional dark theme for developers',
      version: '1.0.0',
      publisher: 'theme-creator',
    };

    it('should complete full theme generation from file to extension', async () => {
      // Mock file system operations
      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: mockThemeContent.length,
        isFile: () => true,
        isDirectory: () => false,
        birthtime: new Date(),
        mtime: new Date(),
        atime: new Date(),
        mode: 0o644,
      } as any);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Step 1: Validate theme file
      const validationResult = await fileService.validateGhosttyThemeFile('/test/theme.txt');
      expect(validationResult.isValid).toBe(true);

      // Step 2: Parse theme file
      const parsingResult = await fileService.parseGhosttyThemeFile('/test/theme.txt');
      expect(parsingResult.success).toBe(true);
      expect(parsingResult.data).toHaveProperty('background', '#1e1e1e');
      expect(parsingResult.data).toHaveProperty('foreground', '#d4d4d4');
      expect(parsingResult.colorCount).toBe(20);

      // Step 3: Validate theme configuration
      const validatedConfig = securityService.validateThemeInput(mockThemeConfig);
      expect(validatedConfig.name).toBe(mockThemeConfig.themeName);
      expect(validatedConfig.description).toBe(mockThemeConfig.description);

      // Step 4: Generate extension files
      await fileService.generateExtensionFiles(
        '/output/extension',
        parsingResult.data!,
        mockThemeConfig
      );

      // Verify file creation calls
      expect(fs.mkdir).toHaveBeenCalledWith('/output/extension', expect.any(Object));
      expect(fs.mkdir).toHaveBeenCalledWith('/output/extension/themes', expect.any(Object));
      expect(fs.writeFile).toHaveBeenCalledTimes(5); // package.json, theme, README, CHANGELOG, LICENSE

      // Verify package.json generation
      const packageJsonCall = vi.mocked(fs.writeFile).mock.calls.find(call => 
        call[0].toString().includes('package.json')
      );
      expect(packageJsonCall).toBeTruthy();
      
      const packageJson = JSON.parse(packageJsonCall![1] as string);
      expect(packageJson.name).toBe('dark-professional');
      expect(packageJson.displayName).toBe('Dark Professional');
      expect(packageJson.contributes.themes).toHaveLength(1);

      // Verify theme file generation
      const themeFileCall = vi.mocked(fs.writeFile).mock.calls.find(call => 
        call[0].toString().includes('color-theme.json')
      );
      expect(themeFileCall).toBeTruthy();
      
      const themeJson = JSON.parse(themeFileCall![1] as string);
      expect(themeJson.name).toBe('Dark Professional');
      expect(themeJson.colors).toHaveProperty('editor.background', '#1e1e1e');
      expect(themeJson.colors).toHaveProperty('terminal.ansiRed', '#cd3131');
    });

    it('should handle validation errors in the workflow', async () => {
      // Mock invalid theme file
      const invalidThemeContent = 'invalid theme content';
      vi.mocked(fs.readFile).mockResolvedValue(invalidThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: invalidThemeContent.length,
        isFile: () => true,
      } as any);

      const validationResult = await fileService.validateGhosttyThemeFile('/test/invalid.txt');
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toContain('No valid color definitions found');
      expect(validationResult.suggestions).toContain('Add color definitions (e.g., background=#000000)');
    });

    it('should handle security validation in the workflow', async () => {
      const maliciousConfig = {
        themeName: 'Theme<script>alert("xss")</script>',
        description: 'Description with\nnewlines\tand\ttabs',
        version: '1.0.0',
        publisher: 'publisher@invalid',
      };

      const validatedConfig = securityService.validateThemeInput(maliciousConfig);

      // SecurityService should sanitize the input
      expect(validatedConfig.name).not.toContain('<script>');
      expect(validatedConfig.name).not.toContain('alert');
      expect(validatedConfig.description).not.toContain('\n');
      expect(validatedConfig.description).not.toContain('\t');
    });

    it('should handle file system errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const validationResult = await fileService.validateGhosttyThemeFile('/nonexistent/theme.txt');
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('File does not exist');
      expect(validationResult.suggestions).toContain('Check the file path');
    });

    it('should handle theme parsing edge cases', async () => {
      const edgeCaseTheme = `
# Theme with various formats
background=#000000
foreground = #ffffff  
color0:#123456
palette = 1=#654321
invalid_line_without_equals
color_with_rgb = rgb(255, 0, 0)
color_with_short_hex = #fff
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(edgeCaseTheme);
      vi.mocked(fs.stat).mockResolvedValue({
        size: edgeCaseTheme.length,
        isFile: () => true,
      } as any);

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/edge-case.txt');

      expect(parsingResult.success).toBe(true);
      expect(parsingResult.data).toHaveProperty('background', '#000000');
      expect(parsingResult.data).toHaveProperty('foreground', '#ffffff');
      expect(parsingResult.data).toHaveProperty('color0', '#123456');
      expect(parsingResult.data).toHaveProperty('color1', '#654321');
      expect(parsingResult.invalidLines).toBeDefined();
      expect(parsingResult.warnings).toBeDefined();
    });

    it('should validate complete extension structure', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: mockThemeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/theme.txt');
      await fileService.generateExtensionFiles(
        '/output/extension',
        parsingResult.data!,
        mockThemeConfig
      );

      // Verify all required files are generated
      const writeCalls = vi.mocked(fs.writeFile).mock.calls;
      const fileNames = writeCalls.map(call => call[0].toString());

      expect(fileNames.some(name => name.includes('package.json'))).toBe(true);
      expect(fileNames.some(name => name.includes('color-theme.json'))).toBe(true);
      expect(fileNames.some(name => name.includes('README.md'))).toBe(true);
      expect(fileNames.some(name => name.includes('CHANGELOG.md'))).toBe(true);
      expect(fileNames.some(name => name.includes('LICENSE'))).toBe(true);

      // Verify directory structure
      const mkdirCalls = vi.mocked(fs.mkdir).mock.calls;
      expect(mkdirCalls.some(call => call[0].includes('/themes'))).toBe(true);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large theme files efficiently', async () => {
      // Generate a large theme file
      const largeThemeContent = [
        'background=#000000',
        'foreground=#ffffff',
        ...Array.from({ length: 1000 }, (_, i) => `color${i}=#${i.toString(16).padStart(6, '0')}`),
      ].join('\n');

      vi.mocked(fs.readFile).mockResolvedValue(largeThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: largeThemeContent.length,
        isFile: () => true,
      } as any);

      const startTime = performance.now();
      const parsingResult = await fileService.parseGhosttyThemeFile('/test/large-theme.txt');
      const endTime = performance.now();

      expect(parsingResult.success).toBe(true);
      expect(parsingResult.colorCount).toBe(1002); // 2 base colors + 1000 generated
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should respect resource limits', async () => {
      // Mock resource exhaustion scenario
      const fileService = new FileService();
      
      // Simulate multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        fileService.exists(`/test/file${i}.txt`)
      );

      vi.mocked(fs.access).mockResolvedValue(undefined);
      
      const results = await Promise.all(operations);
      
      // All operations should complete successfully
      expect(results.every(result => result === true)).toBe(true);
      expect(fileService.getActiveOperationsCount()).toBe(0);

      fileService.cleanup();
    });

    it('should handle operation cancellation', async () => {
      const fileService = new FileService();
      
      // Mock long-running operation
      vi.mocked(fs.readFile).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );
      vi.mocked(fs.stat).mockResolvedValue({
        size: 1000,
        isFile: () => true,
      } as any);

      const operationPromise = fileService.parseGhosttyThemeFile('/test/slow-theme.txt');
      
      expect(fileService.getActiveOperationsCount()).toBe(1);
      
      // Cancel all operations
      fileService.cancelAllOperations();
      
      expect(fileService.getActiveOperationsCount()).toBe(0);
      
      // Operation should be rejected
      await expect(operationPromise).rejects.toThrow();

      fileService.cleanup();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from partial failures', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: mockThemeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      
      // Mock writeFile to fail on first file but succeed on others
      let writeCallCount = 0;
      vi.mocked(fs.writeFile).mockImplementation(() => {
        writeCallCount++;
        if (writeCallCount === 1) {
          return Promise.reject(new Error('Disk full'));
        }
        return Promise.resolve();
      });

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/theme.txt');
      
      // Extension generation should fail on first file
      await expect(
        fileService.generateExtensionFiles(
          '/output/extension',
          parsingResult.data!,
          mockThemeConfig
        )
      ).rejects.toThrow('Disk full');

      // But parsing should have succeeded
      expect(parsingResult.success).toBe(true);
    });

    it('should handle corrupted theme files', async () => {
      const corruptedTheme = `
background=#000000
foreground=#ffffff
color0=#invalid_hex
color1=not_a_color
color2=#12345G
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(corruptedTheme);
      vi.mocked(fs.stat).mockResolvedValue({
        size: corruptedTheme.length,
        isFile: () => true,
      } as any);

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/corrupted.txt');

      expect(parsingResult.success).toBe(true);
      expect(parsingResult.warnings).toBeDefined();
      expect(parsingResult.invalidLines).toBeDefined();
      expect(parsingResult.data).toHaveProperty('background', '#000000');
      expect(parsingResult.data).toHaveProperty('foreground', '#ffffff');
      // Invalid colors should not be included
      expect(parsingResult.data).not.toHaveProperty('color0');
    });

    it('should handle permission errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('EACCES: permission denied'));

      const validationResult = await fileService.validateGhosttyThemeFile('/restricted/theme.txt');

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toContain('Validation failed');
      expect(validationResult.suggestions).toContain('Check file permissions');
    });
  });

  describe('Cross-Service Integration', () => {
    it('should integrate FileService with SecurityService correctly', async () => {
      const fileService = new FileService();
      const securityService = new SecurityService();

      const dangerousPath = '../../../etc/passwd';
      
      await expect(
        fileService.validateGhosttyThemeFile(dangerousPath)
      ).rejects.toThrow();

      fileService.cleanup();
      securityService.cleanup();
    });

    it('should maintain data integrity across service calls', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: mockThemeContent.length,
        isFile: () => true,
      } as any);

      // Parse theme
      const parsingResult = await fileService.parseGhosttyThemeFile('/test/theme.txt');
      
      // Validate config
      const config = securityService.validateThemeInput(mockThemeConfig);
      
      // Both should maintain consistent data
      expect(parsingResult.success).toBe(true);
      expect(config.name).toBe(mockThemeConfig.themeName);
      
      // Colors should be preserved correctly
      expect(parsingResult.data).toHaveProperty('background', '#1e1e1e');
      expect(Object.keys(parsingResult.data!)).toContain('color0');
      expect(Object.keys(parsingResult.data!)).toContain('color15');
    });

    it('should handle service cleanup correctly', async () => {
      const fileService = new FileService();
      const securityService = new SecurityService();

      // Start some operations
      vi.mocked(fs.access).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const operation = fileService.exists('/test/file.txt');
      
      expect(fileService.getActiveOperationsCount()).toBe(1);
      
      // Clean up services
      fileService.cleanup();
      securityService.cleanup();
      
      expect(fileService.getActiveOperationsCount()).toBe(0);
      
      // Operations should be cancelled
      await expect(operation).rejects.toThrow();
    });
  });

  describe('Real-world Theme Examples', () => {
    it('should handle popular terminal themes correctly', async () => {
      const draculaTheme = `
# Dracula theme
background=#282a36
foreground=#f8f8f2
cursor=#f8f8f2
selection_background=#44475a
color0=#000000
color1=#ff5555
color2=#50fa7b
color3=#f1fa8c
color4=#bd93f9
color5=#ff79c6
color6=#8be9fd
color7=#bfbfbf
color8=#4d4d4d
color9=#ff6e6e
color10=#69ff94
color11=#ffffa5
color12=#d6acff
color13=#ff92df
color14=#a4ffff
color15=#e6e6e6
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(draculaTheme);
      vi.mocked(fs.stat).mockResolvedValue({
        size: draculaTheme.length,
        isFile: () => true,
      } as any);

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/dracula.txt');

      expect(parsingResult.success).toBe(true);
      expect(parsingResult.data).toHaveProperty('background', '#282a36');
      expect(parsingResult.data).toHaveProperty('foreground', '#f8f8f2');
      expect(parsingResult.colorCount).toBe(20);
    });

    it('should handle minimal themes correctly', async () => {
      const minimalTheme = `
background=#ffffff
foreground=#000000
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(minimalTheme);
      vi.mocked(fs.stat).mockResolvedValue({
        size: minimalTheme.length,
        isFile: () => true,
      } as any);

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/minimal.txt');

      expect(parsingResult.success).toBe(true);
      expect(parsingResult.data).toHaveProperty('background', '#ffffff');
      expect(parsingResult.data).toHaveProperty('foreground', '#000000');
      expect(parsingResult.colorCount).toBe(2);
    });

    it('should generate valid VS Code themes from terminal themes', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(mockThemeContent);
      vi.mocked(fs.stat).mockResolvedValue({
        size: mockThemeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const parsingResult = await fileService.parseGhosttyThemeFile('/test/theme.txt');
      await fileService.generateExtensionFiles(
        '/output/extension',
        parsingResult.data!,
        mockThemeConfig
      );

      // Find the theme file content
      const themeFileCall = vi.mocked(fs.writeFile).mock.calls.find(call => 
        call[0].toString().includes('color-theme.json')
      );
      
      const themeJson = JSON.parse(themeFileCall![1] as string);

      // Verify VS Code theme structure
      expect(themeJson).toHaveProperty('name');
      expect(themeJson).toHaveProperty('type', 'dark');
      expect(themeJson).toHaveProperty('colors');
      expect(themeJson).toHaveProperty('tokenColors');

      // Verify color mappings
      expect(themeJson.colors).toHaveProperty('editor.background');
      expect(themeJson.colors).toHaveProperty('terminal.ansiBlack');
      expect(themeJson.colors).toHaveProperty('terminal.ansiRed');
      expect(themeJson.colors).toHaveProperty('terminal.ansiGreen');

      // Verify token colors
      expect(themeJson.tokenColors).toBeInstanceOf(Array);
      expect(themeJson.tokenColors.length).toBeGreaterThan(0);
    });
  });
});