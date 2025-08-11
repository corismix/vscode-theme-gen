import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  FileService,
  getFileService,
  resetFileService,
  createFileService,
  FILE_SERVICE_CONFIG,
  ProgressCallback,
  FileOperationOptions,
  FileMetadata,
  DirectoryItem,
  FileValidationResult,
  ThemeParsingResult,
  CopyMoveOptions,
} from '@/services/FileService';
import { SecurityService, resetSecurityService } from '@/services/SecurityService';
import { ValidationError, FileProcessingError, SecurityError } from '@/types';
import { FILE_LIMITS, PERFORMANCE_LIMITS } from '@/config';

// Mock fs promises
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      readdir: vi.fn(),
      copyFile: vi.fn(),
      rmdir: vi.fn(),
      unlink: vi.fn(),
      utimes: vi.fn(),
    },
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
    constants: {
      F_OK: 0,
    }
  };
});

// Mock stream/promises
vi.mock('stream/promises', () => ({
  pipeline: vi.fn(),
}));

// Mock crypto
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mocked-hash'),
  })),
}));

describe('FileService', () => {
  let fileService: FileService;
  let mockProgressCallback: ProgressCallback;

  beforeEach(() => {
    resetFileService();
    resetSecurityService();
    fileService = new FileService();
    mockProgressCallback = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fileService.cleanup();
    resetFileService();
    resetSecurityService();
  });

  describe('constructor', () => {
    it('should create instance with default security service', () => {
      const service = new FileService();
      expect(service).toBeInstanceOf(FileService);
    });

    it('should create instance with custom security service', () => {
      const customSecurityService = new SecurityService();
      const service = new FileService(customSecurityService);
      expect(service).toBeInstanceOf(FileService);
      customSecurityService.cleanup();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await fileService.exists('/test/file.txt');
      
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('/test/file.txt', 0);
    });

    it('should return false for non-existing file', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await fileService.exists('/test/nonexistent.txt');
      
      expect(result).toBe(false);
    });

    it('should handle timeout', async () => {
      vi.mocked(fs.access).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      await expect(
        fileService.exists('/test/file.txt', { timeout: 100 })
      ).rejects.toThrow('File operation timed out after 100ms');
    });

    it('should validate path using security service', async () => {
      await expect(
        fileService.exists('../../../etc/passwd')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getMetadata', () => {
    const mockStats = {
      size: 1024,
      birthtime: new Date('2023-01-01'),
      mtime: new Date('2023-01-02'),
      atime: new Date('2023-01-03'),
      isFile: () => true,
      isDirectory: () => false,
      mode: 0o644,
    };

    it('should return file metadata', async () => {
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('test content'));

      const result = await fileService.getMetadata('/test/file.txt');

      expect(result).toEqual({
        size: 1024,
        birthtime: mockStats.birthtime,
        mtime: mockStats.mtime,
        atime: mockStats.atime,
        isFile: true,
        isDirectory: false,
        mode: 0o644,
        hash: 'mocked-hash',
      });
    });

    it('should handle hash generation failure gracefully', async () => {
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Hash error'));

      const result = await fileService.getMetadata('/test/file.txt');

      expect(result.hash).toBeUndefined();
    });

    it('should skip hash generation for large files', async () => {
      const largeFileStats = {
        ...mockStats,
        size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
      };
      vi.mocked(fs.stat).mockResolvedValue(largeFileStats as any);

      const result = await fileService.getMetadata('/test/large.txt');

      expect(result.hash).toBeUndefined();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      vi.mocked(fs.stat).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      await expect(
        fileService.getMetadata('/test/file.txt', { timeout: 100 })
      ).rejects.toThrow('File operation timed out after 100ms');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const mockStats = { size: 1024, isFile: () => true };
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.readFile).mockResolvedValue('file content');

      const result = await fileService.readFile('/test/file.txt');

      expect(result).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'utf8' });
    });

    it('should call progress callback', async () => {
      const mockStats = { size: 1024, isFile: () => true };
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.readFile).mockResolvedValue('file content');

      await fileService.readFile('/test/file.txt', {
        onProgress: mockProgressCallback,
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        bytesProcessed: 0,
        totalBytes: 1024,
        percentage: 0,
        operation: 'Reading file',
        currentFile: '/test/file.txt',
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        bytesProcessed: 1024,
        totalBytes: 1024,
        percentage: 100,
        operation: 'Reading file completed',
        currentFile: '/test/file.txt',
      });
    });

    it('should reject large files without streaming option', async () => {
      const largeFileStats = {
        size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
        isFile: () => true,
      };
      vi.mocked(fs.stat).mockResolvedValue(largeFileStats as any);

      await expect(
        fileService.readFile('/test/large.txt')
      ).rejects.toThrow('File too large');
    });

    it('should use streaming for large files when enabled', async () => {
      const largeFileStats = {
        size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
        isFile: () => true,
      };
      vi.mocked(fs.stat).mockResolvedValue(largeFileStats as any);

      const mockStream = {
        on: vi.fn(),
      };
      vi.mocked(createReadStream).mockReturnValue(mockStream as any);

      // Mock stream events
      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('chunk1'));
          callback(Buffer.from('chunk2'));
        } else if (event === 'end') {
          callback();
        }
        return mockStream;
      });

      const result = await fileService.readFile('/test/large.txt', {
        useStreaming: true,
      });

      expect(result).toBe('chunk1chunk2');
      expect(createReadStream).toHaveBeenCalledWith('/test/large.txt', {
        encoding: null,
        highWaterMark: FILE_SERVICE_CONFIG.STREAM_CHUNK_SIZE,
      });
    });

    it('should handle streaming errors', async () => {
      const largeFileStats = {
        size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
        isFile: () => true,
      };
      vi.mocked(fs.stat).mockResolvedValue(largeFileStats as any);

      const mockStream = {
        on: vi.fn(),
      };
      vi.mocked(createReadStream).mockReturnValue(mockStream as any);

      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('Stream error'));
        }
        return mockStream;
      });

      await expect(
        fileService.readFile('/test/large.txt', { useStreaming: true })
      ).rejects.toThrow('Stream reading failed');
    });

    it('should handle custom encoding', async () => {
      const mockStats = { size: 1024, isFile: () => true };
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.readFile).mockResolvedValue('file content');

      await fileService.readFile('/test/file.txt', { encoding: 'latin1' });

      expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'latin1' });
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      await fileService.writeFile('/test/file.txt', 'test content');

      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', expect.any(Buffer), {
        mode: FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE,
      });
    });

    it('should create parent directories when requested', async () => {
      await fileService.writeFile('/test/nested/file.txt', 'content', {
        createParents: true,
      });

      expect(fs.mkdir).toHaveBeenCalledWith('/test/nested', {
        recursive: true,
        mode: FILE_SERVICE_CONFIG.DEFAULT_DIR_MODE,
      });
    });

    it('should call progress callback', async () => {
      await fileService.writeFile('/test/file.txt', 'content', {
        onProgress: mockProgressCallback,
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        bytesProcessed: 0,
        totalBytes: 7, // 'content' length in bytes
        percentage: 0,
        operation: 'Writing file',
        currentFile: '/test/file.txt',
      });
    });

    it('should use streaming for large content', async () => {
      const largeContent = 'a'.repeat(FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1);
      const mockStream = {
        write: vi.fn((chunk, callback) => callback()),
        end: vi.fn(),
        on: vi.fn(),
      };
      vi.mocked(createWriteStream).mockReturnValue(mockStream as any);

      // Mock stream events
      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
        return mockStream;
      });

      await fileService.writeFile('/test/large.txt', largeContent, {
        useStreaming: true,
      });

      expect(createWriteStream).toHaveBeenCalledWith('/test/large.txt', {
        mode: FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE,
        highWaterMark: FILE_SERVICE_CONFIG.STREAM_CHUNK_SIZE,
      });
    });

    it('should handle streaming write errors', async () => {
      const mockStream = {
        write: vi.fn((chunk, callback) => callback(new Error('Write error'))),
        destroy: vi.fn(),
        on: vi.fn(),
        end: vi.fn(),
      };
      vi.mocked(createWriteStream).mockReturnValue(mockStream as any);

      await expect(
        fileService.writeFile('/test/file.txt', 'content', { useStreaming: true })
      ).rejects.toThrow('Streaming write failed');
    });

    it('should handle custom encoding', async () => {
      await fileService.writeFile('/test/file.txt', 'content', {
        encoding: 'latin1',
      });

      const expectedBuffer = Buffer.from('content', 'latin1');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', expectedBuffer, {
        mode: FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE,
      });
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory', async () => {
      await fileService.ensureDirectoryExists('/test/dir');

      expect(fs.mkdir).toHaveBeenCalledWith('/test/dir', {
        recursive: true,
        mode: FILE_SERVICE_CONFIG.DEFAULT_DIR_MODE,
      });
    });

    it('should call progress callback', async () => {
      await fileService.ensureDirectoryExists('/test/dir', {
        onProgress: mockProgressCallback,
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        bytesProcessed: 1,
        totalBytes: 1,
        percentage: 100,
        operation: 'Directory created',
        currentFile: '/test/dir',
      });
    });

    it('should use custom mode', async () => {
      await fileService.ensureDirectoryExists('/test/dir', {
        mode: 0o755,
      });

      expect(fs.mkdir).toHaveBeenCalledWith('/test/dir', {
        recursive: true,
        mode: 0o755,
      });
    });
  });

  describe('listDirectory', () => {
    const mockDirEntries = ['file1.txt', 'file2.js', '.hidden', 'subdir'];
    const mockStats = {
      file1: { size: 100, isFile: () => true, isDirectory: () => false },
      file2: { size: 200, isFile: () => true, isDirectory: () => false },
      hidden: { size: 50, isFile: () => true, isDirectory: () => false },
      subdir: { size: 0, isFile: () => false, isDirectory: () => true },
    };

    beforeEach(() => {
      vi.mocked(fs.readdir).mockResolvedValue(mockDirEntries as any);
      vi.mocked(fs.stat)
        .mockResolvedValueOnce(mockStats.file1 as any)
        .mockResolvedValueOnce(mockStats.file2 as any)
        .mockResolvedValueOnce(mockStats.hidden as any)
        .mockResolvedValueOnce(mockStats.subdir as any);
    });

    it('should list directory contents', async () => {
      const result = await fileService.listDirectory('/test/dir');

      expect(result).toHaveLength(3); // Excludes hidden file by default
      expect(result[0]).toMatchObject({
        name: 'file1.txt',
        path: '/test/dir/file1.txt',
        size: 100,
        isFile: true,
        isDirectory: false,
        extension: '.txt',
      });
    });

    it('should include hidden files when requested', async () => {
      const result = await fileService.listDirectory('/test/dir', {
        includeHidden: true,
      });

      expect(result).toHaveLength(4);
      expect(result.some(item => item.name === '.hidden')).toBe(true);
    });

    it('should apply custom filter', async () => {
      const filter = (item: DirectoryItem) => item.name.endsWith('.txt');
      const result = await fileService.listDirectory('/test/dir', { filter });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file1.txt');
    });

    it('should handle recursive listing', async () => {
      // Mock additional readdir call for subdirectory
      vi.mocked(fs.readdir).mockResolvedValueOnce(['subfile.txt'] as any);
      vi.mocked(fs.stat).mockResolvedValueOnce({
        size: 150,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await fileService.listDirectory('/test/dir', {
        recursive: true,
      });

      expect(result.length).toBeGreaterThan(3);
      expect(result.some(item => item.path.includes('subfile.txt'))).toBe(true);
    });

    it('should call progress callback', async () => {
      await fileService.listDirectory('/test/dir', {
        onProgress: mockProgressCallback,
      });

      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should skip inaccessible items', async () => {
      vi.mocked(fs.stat)
        .mockResolvedValueOnce(mockStats.file1 as any)
        .mockRejectedValueOnce(new Error('Access denied'))
        .mockResolvedValueOnce(mockStats.subdir as any);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await fileService.listDirectory('/test/dir');

      expect(result).toHaveLength(2); // One file skipped
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping inaccessible item'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('copy', () => {
    const mockStats = {
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      atime: new Date(),
      mtime: new Date(),
    };

    it('should copy file', async () => {
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));

      await fileService.copy('/src/file.txt', '/dest/file.txt');

      expect(fs.copyFile).toHaveBeenCalledWith('/src/file.txt', '/dest/file.txt');
    });

    it('should reject copying to existing file without overwrite', async () => {
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.access).mockResolvedValue(undefined); // File exists

      await expect(
        fileService.copy('/src/file.txt', '/dest/file.txt')
      ).rejects.toThrow('Destination file exists and overwrite is not enabled');
    });

    it('should overwrite existing file when enabled', async () => {
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.access).mockResolvedValue(undefined); // File exists

      await fileService.copy('/src/file.txt', '/dest/file.txt', {
        overwrite: true,
      });

      expect(fs.copyFile).toHaveBeenCalled();
    });

    it('should preserve timestamps when requested', async () => {
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));

      await fileService.copy('/src/file.txt', '/dest/file.txt', {
        preserveTimestamps: true,
      });

      expect(fs.utimes).toHaveBeenCalledWith(
        '/dest/file.txt',
        mockStats.atime,
        mockStats.mtime
      );
    });

    it('should use streaming for large files', async () => {
      const largeFileStats = {
        ...mockStats,
        size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
      };
      vi.mocked(fs.stat).mockResolvedValue(largeFileStats as any);
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      
      const mockReadStream = { on: vi.fn() };
      const mockWriteStream = { on: vi.fn() };
      vi.mocked(createReadStream).mockReturnValue(mockReadStream as any);
      vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any);
      vi.mocked(pipeline).mockResolvedValue();

      await fileService.copy('/src/large.txt', '/dest/large.txt');

      expect(createReadStream).toHaveBeenCalledWith('/src/large.txt');
      expect(createWriteStream).toHaveBeenCalledWith('/dest/large.txt', {
        mode: FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE,
      });
      expect(pipeline).toHaveBeenCalledWith(mockReadStream, mockWriteStream);
    });

    it('should handle directory copying', async () => {
      const dirStats = {
        ...mockStats,
        isFile: () => false,
        isDirectory: () => true,
      };
      vi.mocked(fs.stat).mockResolvedValue(dirStats as any);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      await fileService.copy('/src/dir', '/dest/dir');

      expect(fs.mkdir).toHaveBeenCalledWith('/dest/dir', {
        recursive: true,
        mode: FILE_SERVICE_CONFIG.DEFAULT_DIR_MODE,
      });
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      const fileStats = { isDirectory: () => false };
      vi.mocked(fs.stat).mockResolvedValue(fileStats as any);

      await fileService.delete('/test/file.txt');

      expect(fs.unlink).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should delete directory', async () => {
      const dirStats = { isDirectory: () => true };
      vi.mocked(fs.stat).mockResolvedValue(dirStats as any);

      await fileService.delete('/test/dir');

      expect(fs.rmdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
    });

    it('should call progress callback', async () => {
      const fileStats = { isDirectory: () => false };
      vi.mocked(fs.stat).mockResolvedValue(fileStats as any);

      await fileService.delete('/test/file.txt', {
        onProgress: mockProgressCallback,
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        bytesProcessed: 0,
        totalBytes: 1,
        percentage: 0,
        operation: 'Deleting file',
        currentFile: '/test/file.txt',
      });
    });
  });

  describe('validateGhosttyThemeFile', () => {
    it('should validate valid theme file', async () => {
      const themeContent = `
background=#000000
foreground=#ffffff
color0=#123456
color1=#654321
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.validateGhosttyThemeFile('/test/theme.txt');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file with invalid extension', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: 100,
        isFile: () => true,
      } as any);

      const result = await fileService.validateGhosttyThemeFile('/test/theme.exe');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject file that is too large', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
        isFile: () => true,
      } as any);

      const result = await fileService.validateGhosttyThemeFile('/test/theme.txt');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject file with no color definitions', async () => {
      const themeContent = `
# This is a comment
// Another comment
some_setting=value
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.validateGhosttyThemeFile('/test/theme.txt');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No valid color definitions found');
    });

    it('should reject file with too many invalid colors', async () => {
      const themeContent = `
background=#invalid
foreground=#alsoinvalid
color0=#notvalid
color1=#123456
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.validateGhosttyThemeFile('/test/theme.txt');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too many invalid color values found');
    });

    it('should warn about some invalid colors', async () => {
      const themeContent = `
background=#000000
foreground=#ffffff
color0=#invalid
color1=#123456
color2=#654321
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.validateGhosttyThemeFile('/test/theme.txt');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('1 invalid color value(s) found');
    });

    it('should handle non-existent file', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await fileService.validateGhosttyThemeFile('/test/nonexistent.txt');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File does not exist');
    });
  });

  describe('parseGhosttyThemeFile', () => {
    it('should parse valid theme file', async () => {
      const themeContent = `
# Theme comment
background=#000000
foreground = #ffffff
color0:#123456
palette = 1=#654321
// Another comment
cursor=#ff0000
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.parseGhosttyThemeFile('/test/theme.txt');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        background: '#000000',
        foreground: '#ffffff',
        color0: '#123456',
        color1: '#654321',
        cursor: '#ff0000',
      });
      expect(result.colorCount).toBe(5);
    });

    it('should handle invalid color values', async () => {
      const themeContent = `
background=#000000
color0=#invalid
color1=#123456
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.parseGhosttyThemeFile('/test/theme.txt');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        background: '#000000',
        color1: '#123456',
      });
      expect(result.invalidLines).toContain('Line 2: Invalid color format "#invalid"');
      expect(result.warnings).toContain('Invalid color on line 2: #invalid');
    });

    it('should handle palette format', async () => {
      const themeContent = `
palette = 0=#000000
palette = 15=#ffffff
      `.trim();

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({
        size: themeContent.length,
        isFile: () => true,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(themeContent);

      const result = await fileService.parseGhosttyThemeFile('/test/theme.txt');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        color0: '#000000',
        color15: '#ffffff',
      });
    });

    it('should return error for validation failure', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await fileService.parseGhosttyThemeFile('/test/nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('generateExtensionFiles', () => {
    const mockThemeData = {
      background: '#000000',
      foreground: '#ffffff',
      color0: '#123456',
    };

    const mockConfig = {
      themeName: 'Test Theme',
      description: 'A test theme',
      version: '1.0.0',
      publisher: 'test-publisher',
    };

    it('should generate all extension files', async () => {
      await fileService.generateExtensionFiles('/output', mockThemeData, mockConfig, {
        onProgress: mockProgressCallback,
      });

      // Should create directories
      expect(fs.mkdir).toHaveBeenCalledWith('/output', expect.any(Object));
      expect(fs.mkdir).toHaveBeenCalledWith('/output/themes', expect.any(Object));

      // Should write files
      expect(fs.writeFile).toHaveBeenCalledTimes(5); // package.json, theme, README, CHANGELOG, LICENSE

      // Should call progress callback for each step
      expect(mockProgressCallback).toHaveBeenCalledWith({
        bytesProcessed: 5,
        totalBytes: 5,
        percentage: 100,
        operation: 'Extension generation completed',
      });
    });

    it('should validate theme configuration', async () => {
      const invalidConfig = {
        themeName: 'Theme<script>alert("xss")</script>',
        description: 'Valid description',
        version: '1.0.0',
        publisher: 'test-publisher',
      };

      await fileService.generateExtensionFiles('/output', mockThemeData, invalidConfig);

      // SecurityService should have sanitized the theme name
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('Operation Management', () => {
    it('should track active operations', async () => {
      expect(fileService.getActiveOperationsCount()).toBe(0);

      const readPromise = fileService.exists('/test/file.txt');
      expect(fileService.getActiveOperationsCount()).toBe(1);

      vi.mocked(fs.access).mockResolvedValue(undefined);
      await readPromise;
      expect(fileService.getActiveOperationsCount()).toBe(0);
    });

    it('should cancel all operations', async () => {
      vi.mocked(fs.access).mockImplementation(() => new Promise(() => {})); // Never resolves

      const promise1 = fileService.exists('/test/file1.txt');
      const promise2 = fileService.exists('/test/file2.txt');

      expect(fileService.getActiveOperationsCount()).toBe(2);

      fileService.cancelAllOperations();
      expect(fileService.getActiveOperationsCount()).toBe(0);

      // Promises should be rejected due to cancellation
      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
    });

    it('should cancel specific operation', async () => {
      // This is a simplified test as we can't easily access operation IDs
      vi.mocked(fs.access).mockImplementation(() => new Promise(() => {})); // Never resolves

      const promise = fileService.exists('/test/file.txt');
      expect(fileService.getActiveOperationsCount()).toBe(1);

      fileService.cancelAllOperations(); // Cancel all as we can't get specific ID
      expect(fileService.getActiveOperationsCount()).toBe(0);

      await expect(promise).rejects.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      expect(() => fileService.cleanup()).not.toThrow();
      expect(fileService.getActiveOperationsCount()).toBe(0);
    });
  });
});

describe('Global File Service', () => {
  afterEach(() => {
    resetFileService();
  });

  describe('getFileService', () => {
    it('should return singleton instance', () => {
      const service1 = getFileService();
      const service2 = getFileService();
      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getFileService();
      resetFileService();
      const service2 = getFileService();
      expect(service1).not.toBe(service2);
    });
  });

  describe('resetFileService', () => {
    it('should clean up existing service', () => {
      const service = getFileService();
      const cleanupSpy = vi.spyOn(service, 'cleanup');

      resetFileService();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle multiple resets gracefully', () => {
      resetFileService();
      resetFileService();
      resetFileService();

      expect(() => getFileService()).not.toThrow();
    });
  });
});

describe('createFileService', () => {
  it('should create new file service instance', async () => {
    const service = await createFileService();
    expect(service).toBeInstanceOf(FileService);
    service.cleanup();
  });
});

describe('FILE_SERVICE_CONFIG', () => {
  it('should have expected configuration values', () => {
    expect(FILE_SERVICE_CONFIG.MAX_FILE_SIZE).toBeGreaterThan(0);
    expect(FILE_SERVICE_CONFIG.STREAM_CHUNK_SIZE).toBeGreaterThan(0);
    expect(FILE_SERVICE_CONFIG.PROGRESS_INTERVAL).toBeGreaterThan(0);
    expect(FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE).toBe(0o644);
    expect(FILE_SERVICE_CONFIG.DEFAULT_DIR_MODE).toBe(0o755);
  });
});

describe('Error Handling and Edge Cases', () => {
  let fileService: FileService;

  beforeEach(() => {
    resetFileService();
    resetSecurityService();
    fileService = new FileService();
  });

  afterEach(() => {
    fileService.cleanup();
    resetFileService();
    resetSecurityService();
  });

  it('should handle rapid operation cancellation', async () => {
    vi.mocked(fs.access).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const promises = Array(10).fill(0).map((_, i) => 
      fileService.exists(`/test/file${i}.txt`)
    );

    expect(fileService.getActiveOperationsCount()).toBe(10);

    fileService.cancelAllOperations();
    expect(fileService.getActiveOperationsCount()).toBe(0);

    // All promises should be rejected
    for (const promise of promises) {
      await expect(promise).rejects.toThrow();
    }
  });

  it('should handle operation timeout edge cases', async () => {
    vi.mocked(fs.access).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 50))
    );

    // Very short timeout should fail
    await expect(
      fileService.exists('/test/file.txt', { timeout: 1 })
    ).rejects.toThrow('timed out');

    // Long timeout should succeed
    await expect(
      fileService.exists('/test/file.txt', { timeout: 100 })
    ).resolves.toBe(true);
  });

  it('should maintain operation isolation', async () => {
    vi.mocked(fs.access)
      .mockImplementationOnce(() => Promise.resolve()) // First call succeeds
      .mockImplementationOnce(() => Promise.reject(new Error('Fail'))); // Second call fails

    const [result1, result2] = await Promise.allSettled([
      fileService.exists('/test/success.txt'),
      fileService.exists('/test/failure.txt')
    ]);

    expect(result1.status).toBe('fulfilled');
    expect((result1 as PromiseFulfilledResult<boolean>).value).toBe(true);
    
    expect(result2.status).toBe('fulfilled');
    expect((result2 as PromiseFulfilledResult<boolean>).value).toBe(false);
  });

  it('should handle stream processing edge cases', async () => {
    const largeFileStats = {
      size: FILE_SERVICE_CONFIG.MAX_FILE_SIZE + 1,
      isFile: () => true,
    };
    vi.mocked(fs.stat).mockResolvedValue(largeFileStats as any);

    const mockStream = {
      on: vi.fn(),
    };
    vi.mocked(createReadStream).mockReturnValue(mockStream as any);

    // Test empty stream
    mockStream.on.mockImplementation((event, callback) => {
      if (event === 'end') {
        callback();
      }
      return mockStream;
    });

    const result = await fileService.readFile('/test/empty.txt', {
      useStreaming: true,
    });

    expect(result).toBe('');
  });

  it('should handle memory-intensive operations gracefully', async () => {
    const hugeContent = 'x'.repeat(1000000); // 1MB string
    
    await expect(
      fileService.writeFile('/test/huge.txt', hugeContent)
    ).resolves.not.toThrow();

    expect(fs.writeFile).toHaveBeenCalled();
  });
});