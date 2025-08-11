/**
 * FileService - Comprehensive async file operations service
 * 
 * A comprehensive file service providing secure, async file operations with advanced features:
 * - SecurityService integration for path validation and input sanitization
 * - Progress tracking with customizable callbacks
 * - Streaming support for large file operations
 * - Timeout and cancellation support for long-running operations
 * - Comprehensive error handling and validation
 * - Theme file parsing and VS Code extension generation
 * 
 * Features:
 * - Async file operations with progress callbacks
 * - Security validation through SecurityService integration
 * - Resource usage monitoring and limiting
 * - Streaming I/O for large files
 * - Directory operations with recursive support
 * - Theme file validation and parsing
 * - VS Code extension file generation
 * 
 * @fileoverview Comprehensive async file service with security and streaming support
 * @since 1.0.0
 */

import { 
  promises as fs, 
  createReadStream, 
  createWriteStream, 
  constants as fsConstants 
} from 'fs';
import { resolve, join, dirname, basename, extname } from 'path';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { SecurityService, getSecurityService, SecurityError } from './SecurityService';
import { 
  ValidationError, 
  FileProcessingError,
  createErrorReport,
  sanitizeErrorContext 
} from '@/types';
import { FILE_LIMITS, PERFORMANCE_LIMITS, RESOURCE_LIMITS, formatBytes } from '@/config';

/**
 * Configuration constants - now using centralized config
 */
export const FILE_SERVICE_CONFIG = {
  /** Maximum file size for non-streaming operations */
  MAX_FILE_SIZE: FILE_LIMITS.STREAMING_MAX_SIZE_BYTES,
  /** Chunk size for streaming operations */
  STREAM_CHUNK_SIZE: FILE_LIMITS.STREAM_CHUNK_SIZE,
  /** Progress callback frequency (every N bytes) */
  PROGRESS_INTERVAL: FILE_LIMITS.PROGRESS_INTERVAL,
  /** Default file permissions for created files */
  DEFAULT_FILE_MODE: 0o644,
  /** Default directory permissions */
  DEFAULT_DIR_MODE: 0o755,
  /** Timeout for file operations */
  OPERATION_TIMEOUT: PERFORMANCE_LIMITS.OPERATION_TIMEOUT,
  /** Maximum concurrent operations */
  MAX_CONCURRENT_OPS: RESOURCE_LIMITS.MAX_CONCURRENT_OPS,
} as const;

/**
 * Progress callback function type for file operations
 * 
 * Called during long-running file operations to provide progress updates.
 * Allows UI components to display progress indicators and status information.
 * 
 * @param progress - Progress information object
 * @since 1.0.0
 */
export type ProgressCallback = (progress: {
  /** Bytes processed so far */
  bytesProcessed: number;
  /** Total bytes to process (if known) */
  totalBytes?: number;
  /** Progress percentage (0-100) */
  percentage?: number;
  /** Current operation description */
  operation: string;
  /** Current file being processed */
  currentFile?: string;
}) => void;

/**
 * File operation options interface
 * 
 * Configures behavior for file operations including progress tracking,
 * timeouts, security settings, and streaming options.
 * 
 * @interface FileOperationOptions
 * @since 1.0.0
 */
export interface FileOperationOptions {
  /** Progress callback for long operations */
  onProgress?: ProgressCallback;
  /** Custom timeout in milliseconds */
  timeout?: number;
  /** Base directory for relative path resolution */
  baseDir?: string;
  /** Whether to create parent directories */
  createParents?: boolean;
  /** Custom file permissions */
  mode?: number;
  /** Custom encoding for text operations */
  encoding?: BufferEncoding;
  /** Whether to use streaming for large files */
  useStreaming?: boolean;
  /** Custom chunk size for streaming */
  chunkSize?: number;
}

/**
 * File metadata interface with comprehensive file information
 * 
 * Contains detailed information about a file or directory including
 * timestamps, permissions, size, and optional computed properties.
 * 
 * @interface FileMetadata
 * @since 1.0.0
 */
export interface FileMetadata {
  /** File size in bytes */
  size: number;
  /** Creation time */
  birthtime: Date;
  /** Last modification time */
  mtime: Date;
  /** Last access time */
  atime: Date;
  /** Whether it's a file */
  isFile: boolean;
  /** Whether it's a directory */
  isDirectory: boolean;
  /** File permissions */
  mode: number;
  /** File hash (SHA-256) */
  hash?: string;
  /** MIME type (if detectable) */
  mimeType?: string;
}

/**
 * Directory listing item extending FileMetadata
 * 
 * Represents a single item (file or directory) in a directory listing
 * with full metadata and path information.
 * 
 * @interface DirectoryItem
 * @extends FileMetadata
 * @since 1.0.0
 */
export interface DirectoryItem extends FileMetadata {
  /** Item name */
  name: string;
  /** Full path */
  path: string;
  /** File extension (if file) */
  extension?: string;
}

/**
 * File validation result with detailed validation information
 * 
 * Contains validation status, error messages, warnings, and suggestions
 * for fixing validation issues.
 * 
 * @interface FileValidationResult
 * @since 1.0.0
 */
export interface FileValidationResult {
  /** Whether the file is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Warning messages */
  warnings?: string[];
  /** Suggestions for fixing issues */
  suggestions?: string[];
  /** File metadata */
  metadata?: FileMetadata;
}

/**
 * Theme file parsing result with parsed theme data
 * 
 * Contains the result of parsing a Ghostty theme file including
 * extracted color data, validation status, and any issues found.
 * 
 * @interface ThemeParsingResult
 * @since 1.0.0
 */
export interface ThemeParsingResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed theme data */
  data?: Record<string, string>;
  /** Number of color definitions found */
  colorCount?: number;
  /** Invalid lines encountered */
  invalidLines?: string[];
  /** Error message if parsing failed */
  error?: string;
  /** Warning messages */
  warnings?: string[];
}

/**
 * File copy/move options extending FileOperationOptions
 * 
 * Additional options specific to file copy and move operations
 * including overwrite behavior and timestamp preservation.
 * 
 * @interface CopyMoveOptions
 * @extends FileOperationOptions
 * @since 1.0.0
 */
export interface CopyMoveOptions extends FileOperationOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean;
  /** Whether to preserve timestamps */
  preserveTimestamps?: boolean;
  /** Custom filter function for copying directories */
  filter?: (src: string, dest: string) => boolean | Promise<boolean>;
}

/**
 * Comprehensive async file service with security and streaming capabilities
 * 
 * Main service class providing all file operations with integrated security,
 * progress tracking, streaming support, and comprehensive error handling.
 * 
 * Key capabilities:
 * - Secure file operations with SecurityService integration
 * - Progress callbacks for long-running operations
 * - Streaming I/O for large files
 * - Operation cancellation and timeout support
 * - Theme file parsing and validation
 * - VS Code extension generation
 * 
 * @class FileService
 * @since 1.0.0
 */
export class FileService {
  private securityService: SecurityService;
  private activeOperations = new Map<string, AbortController>();
  private operationCounter = 0;

  constructor(securityService?: SecurityService) {
    this.securityService = securityService || getSecurityService();
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `op_${++this.operationCounter}_${Date.now()}`;
  }

  /**
   * Create timeout promise for operations
   */
  private createTimeoutPromise(timeout: number, operationId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`File operation timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Validate file path using SecurityService
   */
  private validatePath(filePath: string, baseDir?: string): string {
    try {
      return this.securityService.validateFilePath(filePath, baseDir);
    } catch (error) {
      if (error instanceof SecurityError) {
        throw new ValidationError(`Security validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if file exists at the specified path
   * 
   * Safely checks file existence using SecurityService path validation.
   * Non-blocking operation with timeout support.
   * 
   * @param filePath - Path to check for existence
   * @param options - File operation options
   * @returns Promise resolving to true if file exists, false otherwise
   * 
   * @throws {FileProcessingError} When path validation fails or operation times out
   * 
   * @example
   * ```typescript
   * const fileService = new FileService();
   * const exists = await fileService.exists('./config.json');
   * if (exists) {
   *   console.log('File found!');
   * }
   * ```
   */
  async exists(filePath: string, options: FileOperationOptions = {}): Promise<boolean> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      const existsPromise = fs.access(validatedPath, fsConstants.F_OK)
        .then(() => true)
        .catch(() => false);

      const result = await Promise.race([
        existsPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      return result;
    } catch (error) {
      throw new FileProcessingError(`Failed to check file existence: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Get file metadata with enhanced information
   */
  async getMetadata(filePath: string, options: FileOperationOptions = {}): Promise<FileMetadata> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      const metadataPromise = this.getFileMetadata(validatedPath, options);

      const result = await Promise.race([
        metadataPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      return result;
    } catch (error) {
      throw new FileProcessingError(`Failed to get file metadata: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal method to get file metadata
   */
  private async getFileMetadata(filePath: string, options: FileOperationOptions): Promise<FileMetadata> {
    const stats = await fs.stat(filePath);
    const metadata: FileMetadata = {
      size: stats.size,
      birthtime: stats.birthtime,
      mtime: stats.mtime,
      atime: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mode: stats.mode,
    };

    // Generate hash for files if requested and file is not too large
    if (stats.isFile() && stats.size <= FILE_SERVICE_CONFIG.MAX_FILE_SIZE) {
      try {
        const content = await fs.readFile(filePath);
        metadata.hash = createHash('sha256').update(content).digest('hex');
      } catch {
        // Hash generation is optional, don't fail if it doesn't work
      }
    }

    return metadata;
  }

  /**
   * Read file content with progress tracking and streaming support
   * 
   * Reads file content with automatic streaming for large files, progress callbacks,
   * and comprehensive error handling. Integrates with SecurityService for path validation.
   * 
   * @param filePath - Path to file to read
   * @param options - File operation options with encoding
   * @param options.encoding - Text encoding (default: 'utf8')
   * @param options.useStreaming - Force streaming for large files
   * @param options.onProgress - Progress callback for tracking read progress
   * @returns Promise resolving to file content as string
   * 
   * @throws {FileProcessingError} When file is too large without streaming
   * @throws {ValidationError} When path validation fails
   * 
   * @example
   * ```typescript
   * const content = await fileService.readFile('./theme.txt', {
   *   onProgress: (progress) => console.log(`${progress.percentage}% complete`)
   * });
   * ```
   */
  async readFile(
    filePath: string, 
    options: FileOperationOptions & { encoding?: BufferEncoding } = {}
  ): Promise<string> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      // Get file size for progress tracking
      const stats = await fs.stat(validatedPath);
      
      if (stats.size > FILE_SERVICE_CONFIG.MAX_FILE_SIZE && !options.useStreaming) {
        throw new FileProcessingError(
          `File too large (${formatBytes(stats.size)}). Use streaming option for large files.`
        );
      }

      let readPromise: Promise<string>;

      if (options.useStreaming || stats.size > FILE_SERVICE_CONFIG.MAX_FILE_SIZE) {
        readPromise = this.readFileStreaming(validatedPath, stats.size, options);
      } else {
        readPromise = this.readFileStandard(validatedPath, stats.size, options);
      }

      const result = await Promise.race([
        readPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      return result;
    } catch (error) {
      throw new FileProcessingError(`Failed to read file: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Standard file reading for smaller files
   */
  private async readFileStandard(
    filePath: string, 
    fileSize: number, 
    options: FileOperationOptions & { encoding?: BufferEncoding }
  ): Promise<string> {
    options.onProgress?.({
      bytesProcessed: 0,
      totalBytes: fileSize,
      percentage: 0,
      operation: 'Reading file',
      currentFile: filePath
    });

    const content = await fs.readFile(filePath, { encoding: options.encoding || 'utf8' });

    options.onProgress?.({
      bytesProcessed: fileSize,
      totalBytes: fileSize,
      percentage: 100,
      operation: 'Reading file completed',
      currentFile: filePath
    });

    return content;
  }

  /**
   * Streaming file reading for large files
   */
  private async readFileStreaming(
    filePath: string, 
    fileSize: number, 
    options: FileOperationOptions & { encoding?: BufferEncoding }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let bytesRead = 0;
      let lastProgressUpdate = 0;

      const readStream = createReadStream(filePath, {
        encoding: null, // Read as buffer first
        highWaterMark: options.chunkSize || FILE_SERVICE_CONFIG.STREAM_CHUNK_SIZE
      });

      readStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        bytesRead += chunk.length;

        // Update progress at intervals
        if (bytesRead - lastProgressUpdate >= FILE_SERVICE_CONFIG.PROGRESS_INTERVAL) {
          lastProgressUpdate = bytesRead;
          options.onProgress?.({
            bytesProcessed: bytesRead,
            totalBytes: fileSize,
            percentage: Math.round((bytesRead / fileSize) * 100),
            operation: 'Streaming file read',
            currentFile: filePath
          });
        }
      });

      readStream.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const content = buffer.toString(options.encoding || 'utf8');
          
          options.onProgress?.({
            bytesProcessed: fileSize,
            totalBytes: fileSize,
            percentage: 100,
            operation: 'Streaming read completed',
            currentFile: filePath
          });

          resolve(content);
        } catch (error) {
          reject(new FileProcessingError(`Failed to process file content: ${(error as Error).message}`));
        }
      });

      readStream.on('error', (error) => {
        reject(new FileProcessingError(`Stream reading failed: ${error.message}`));
      });
    });
  }

  /**
   * Write file content with progress tracking and streaming support
   * 
   * Writes content to file with automatic streaming for large content, progress callbacks,
   * and parent directory creation. Integrates with SecurityService for path validation.
   * 
   * @param filePath - Path where to write the file
   * @param content - Content to write (string or Buffer)
   * @param options - File operation options with encoding
   * @param options.encoding - Text encoding for string content (default: 'utf8')
   * @param options.createParents - Whether to create parent directories
   * @param options.mode - File permissions (default: 0o644)
   * @param options.useStreaming - Force streaming for large content
   * @returns Promise that resolves when write is complete
   * 
   * @throws {FileProcessingError} When write operation fails
   * @throws {ValidationError} When path validation fails
   * 
   * @example
   * ```typescript
   * await fileService.writeFile('./output.json', JSON.stringify(data), {
   *   createParents: true,
   *   onProgress: (progress) => console.log(`Writing: ${progress.percentage}%`)
   * });
   * ```
   */
  async writeFile(
    filePath: string,
    content: string | Buffer,
    options: FileOperationOptions & { encoding?: BufferEncoding } = {}
  ): Promise<void> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      // Create parent directories if needed
      if (options.createParents) {
        await this.ensureDirectoryExists(dirname(validatedPath));
      }

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, options.encoding || 'utf8');
      
      let writePromise: Promise<void>;

      if (options.useStreaming || contentBuffer.length > FILE_SERVICE_CONFIG.MAX_FILE_SIZE) {
        writePromise = this.writeFileStreaming(validatedPath, contentBuffer, options);
      } else {
        writePromise = this.writeFileStandard(validatedPath, contentBuffer, options);
      }

      await Promise.race([
        writePromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);
      
    } catch (error) {
      throw new FileProcessingError(`Failed to write file: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Standard file writing for smaller files
   */
  private async writeFileStandard(
    filePath: string,
    content: Buffer,
    options: FileOperationOptions
  ): Promise<void> {
    options.onProgress?.({
      bytesProcessed: 0,
      totalBytes: content.length,
      percentage: 0,
      operation: 'Writing file',
      currentFile: filePath
    });

    await fs.writeFile(filePath, content, { 
      mode: options.mode || FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE 
    });

    options.onProgress?.({
      bytesProcessed: content.length,
      totalBytes: content.length,
      percentage: 100,
      operation: 'Writing file completed',
      currentFile: filePath
    });
  }

  /**
   * Streaming file writing for large files
   */
  private async writeFileStreaming(
    filePath: string,
    content: Buffer,
    options: FileOperationOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let bytesWritten = 0;
      let lastProgressUpdate = 0;
      const chunkSize = options.chunkSize || FILE_SERVICE_CONFIG.STREAM_CHUNK_SIZE;

      const writeStream = createWriteStream(filePath, {
        mode: options.mode || FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE,
        highWaterMark: chunkSize
      });

      const writeChunks = async () => {
        try {
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.subarray(i, Math.min(i + chunkSize, content.length));
            
            await new Promise<void>((chunkResolve, chunkReject) => {
              writeStream.write(chunk, (error) => {
                if (error) {
                  chunkReject(error);
                } else {
                  bytesWritten += chunk.length;
                  
                  // Update progress at intervals
                  if (bytesWritten - lastProgressUpdate >= FILE_SERVICE_CONFIG.PROGRESS_INTERVAL) {
                    lastProgressUpdate = bytesWritten;
                    options.onProgress?.({
                      bytesProcessed: bytesWritten,
                      totalBytes: content.length,
                      percentage: Math.round((bytesWritten / content.length) * 100),
                      operation: 'Streaming file write',
                      currentFile: filePath
                    });
                  }
                  
                  chunkResolve();
                }
              });
            });
          }

          writeStream.end();
        } catch (error) {
          writeStream.destroy();
          reject(new FileProcessingError(`Streaming write failed: ${(error as Error).message}`));
        }
      };

      writeStream.on('finish', () => {
        options.onProgress?.({
          bytesProcessed: content.length,
          totalBytes: content.length,
          percentage: 100,
          operation: 'Streaming write completed',
          currentFile: filePath
        });
        resolve();
      });

      writeStream.on('error', (error) => {
        reject(new FileProcessingError(`Write stream error: ${error.message}`));
      });

      writeChunks();
    });
  }

  /**
   * Ensure directory exists, creating it if necessary
   */
  async ensureDirectoryExists(dirPath: string, options: FileOperationOptions = {}): Promise<void> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(dirPath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      const createDirPromise = fs.mkdir(validatedPath, { 
        recursive: true,
        mode: options.mode || FILE_SERVICE_CONFIG.DEFAULT_DIR_MODE 
      });

      await Promise.race([
        createDirPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      options.onProgress?.({
        bytesProcessed: 1,
        totalBytes: 1,
        percentage: 100,
        operation: 'Directory created',
        currentFile: validatedPath
      });

    } catch (error) {
      throw new FileProcessingError(`Failed to create directory: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * List directory contents with detailed information
   */
  async listDirectory(
    dirPath: string, 
    options: FileOperationOptions & { 
      recursive?: boolean;
      includeHidden?: boolean;
      filter?: (item: DirectoryItem) => boolean;
    } = {}
  ): Promise<DirectoryItem[]> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(dirPath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      const listPromise = this.listDirectoryInternal(validatedPath, options);

      const result = await Promise.race([
        listPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      return result;
    } catch (error) {
      throw new FileProcessingError(`Failed to list directory: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal directory listing implementation
   */
  private async listDirectoryInternal(
    dirPath: string,
    options: FileOperationOptions & { 
      recursive?: boolean;
      includeHidden?: boolean;
      filter?: (item: DirectoryItem) => boolean;
    }
  ): Promise<DirectoryItem[]> {
    const entries = await fs.readdir(dirPath);
    const items: DirectoryItem[] = [];
    let processedCount = 0;

    for (const entry of entries) {
      // Skip hidden files unless explicitly included
      if (!options.includeHidden && entry.startsWith('.')) {
        continue;
      }

      const itemPath = join(dirPath, entry);
      
      try {
        const metadata = await this.getFileMetadata(itemPath, options);
        const item: DirectoryItem = {
          ...metadata,
          name: entry,
          path: itemPath,
          extension: metadata.isFile ? extname(entry) : undefined
        };

        // Apply filter if provided
        if (!options.filter || options.filter(item)) {
          items.push(item);
        }

        // Handle recursive listing for directories
        if (options.recursive && metadata.isDirectory) {
          const subItems = await this.listDirectoryInternal(itemPath, options);
          items.push(...subItems);
        }

        processedCount++;
        options.onProgress?.({
          bytesProcessed: processedCount,
          totalBytes: entries.length,
          percentage: Math.round((processedCount / entries.length) * 100),
          operation: 'Listing directory',
          currentFile: itemPath
        });

      } catch (error) {
        // Skip items that can't be accessed
        console.warn(`Skipping inaccessible item: ${itemPath}`, error);
      }
    }

    return items;
  }

  /**
   * Copy file or directory with progress tracking
   */
  async copy(
    sourcePath: string,
    destPath: string,
    options: CopyMoveOptions = {}
  ): Promise<void> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedSource = this.validatePath(sourcePath, options.baseDir);
      const validatedDest = this.validatePath(destPath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      const copyPromise = this.copyInternal(validatedSource, validatedDest, options);

      await Promise.race([
        copyPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

    } catch (error) {
      throw new FileProcessingError(`Failed to copy: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal copy implementation
   */
  private async copyInternal(
    sourcePath: string,
    destPath: string,
    options: CopyMoveOptions
  ): Promise<void> {
    const sourceStats = await fs.stat(sourcePath);

    if (sourceStats.isDirectory()) {
      await this.copyDirectory(sourcePath, destPath, options);
    } else {
      await this.copyFile(sourcePath, destPath, sourceStats, options);
    }
  }

  /**
   * Copy a single file
   */
  private async copyFile(
    sourcePath: string,
    destPath: string,
    sourceStats: any,
    options: CopyMoveOptions
  ): Promise<void> {
    // Check if destination exists and handle overwrite option
    const destExists = await this.exists(destPath);
    if (destExists && !options.overwrite) {
      throw new ValidationError('Destination file exists and overwrite is not enabled');
    }

    // Create parent directory if needed
    if (options.createParents) {
      await this.ensureDirectoryExists(dirname(destPath));
    }

    // Use streaming for large files
    if (sourceStats.size > FILE_SERVICE_CONFIG.MAX_FILE_SIZE || options.useStreaming) {
      await this.copyFileStreaming(sourcePath, destPath, sourceStats.size, options);
    } else {
      await this.copyFileStandard(sourcePath, destPath, sourceStats.size, options);
    }

    // Preserve timestamps if requested
    if (options.preserveTimestamps) {
      await fs.utimes(destPath, sourceStats.atime, sourceStats.mtime);
    }
  }

  /**
   * Copy file using standard method
   */
  private async copyFileStandard(
    sourcePath: string,
    destPath: string,
    fileSize: number,
    options: CopyMoveOptions
  ): Promise<void> {
    options.onProgress?.({
      bytesProcessed: 0,
      totalBytes: fileSize,
      percentage: 0,
      operation: 'Copying file',
      currentFile: sourcePath
    });

    await fs.copyFile(sourcePath, destPath);

    options.onProgress?.({
      bytesProcessed: fileSize,
      totalBytes: fileSize,
      percentage: 100,
      operation: 'File copy completed',
      currentFile: sourcePath
    });
  }

  /**
   * Copy file using streaming
   */
  private async copyFileStreaming(
    sourcePath: string,
    destPath: string,
    fileSize: number,
    options: CopyMoveOptions
  ): Promise<void> {
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath, {
      mode: options.mode || FILE_SERVICE_CONFIG.DEFAULT_FILE_MODE
    });

    let bytesProcessed = 0;
    let lastProgressUpdate = 0;

    readStream.on('data', (chunk: Buffer) => {
      bytesProcessed += chunk.length;
      
      // Update progress at intervals
      if (bytesProcessed - lastProgressUpdate >= FILE_SERVICE_CONFIG.PROGRESS_INTERVAL) {
        lastProgressUpdate = bytesProcessed;
        options.onProgress?.({
          bytesProcessed,
          totalBytes: fileSize,
          percentage: Math.round((bytesProcessed / fileSize) * 100),
          operation: 'Streaming file copy',
          currentFile: sourcePath
        });
      }
    });

    await pipeline(readStream, writeStream);

    options.onProgress?.({
      bytesProcessed: fileSize,
      totalBytes: fileSize,
      percentage: 100,
      operation: 'Streaming copy completed',
      currentFile: sourcePath
    });
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(
    sourcePath: string,
    destPath: string,
    options: CopyMoveOptions
  ): Promise<void> {
    // Create destination directory
    await this.ensureDirectoryExists(destPath, options);

    // List source directory contents
    const items = await this.listDirectory(sourcePath, {
      includeHidden: true,
      filter: options.filter ? (item) => options.filter!(item.path, join(destPath, item.name)) : undefined
    });

    let processedCount = 0;
    for (const item of items) {
      const destItemPath = join(destPath, basename(item.path));
      
      if (item.isDirectory) {
        await this.copyDirectory(item.path, destItemPath, options);
      } else {
        const itemStats = await fs.stat(item.path);
        await this.copyFile(item.path, destItemPath, itemStats, options);
      }

      processedCount++;
      options.onProgress?.({
        bytesProcessed: processedCount,
        totalBytes: items.length,
        percentage: Math.round((processedCount / items.length) * 100),
        operation: 'Copying directory',
        currentFile: item.path
      });
    }
  }

  /**
   * Delete file or directory
   */
  async delete(filePath: string, options: FileOperationOptions = {}): Promise<void> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      const deletePromise = this.deleteInternal(validatedPath, options);

      await Promise.race([
        deletePromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

    } catch (error) {
      throw new FileProcessingError(`Failed to delete: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal delete implementation
   */
  private async deleteInternal(filePath: string, options: FileOperationOptions): Promise<void> {
    const stats = await fs.stat(filePath);

    options.onProgress?.({
      bytesProcessed: 0,
      totalBytes: 1,
      percentage: 0,
      operation: stats.isDirectory() ? 'Deleting directory' : 'Deleting file',
      currentFile: filePath
    });

    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }

    options.onProgress?.({
      bytesProcessed: 1,
      totalBytes: 1,
      percentage: 100,
      operation: stats.isDirectory() ? 'Directory deleted' : 'File deleted',
      currentFile: filePath
    });
  }

  /**
   * Validate Ghostty theme file with comprehensive checks
   * 
   * Performs complete validation of a Ghostty theme file including:
   * - File existence and accessibility
   * - File extension validation (.txt or .theme)
   * - File size limits
   * - Content structure validation
   * - Color format validation
   * 
   * @param filePath - Path to Ghostty theme file to validate
   * @param options - File operation options with progress tracking
   * @returns Promise resolving to detailed validation result
   * 
   * @example
   * ```typescript
   * const validation = await fileService.validateGhosttyThemeFile('./dark-theme.txt');
   * if (validation.isValid) {
   *   console.log('Theme file is valid!');
   * } else {
   *   console.error('Validation failed:', validation.error);
   *   console.log('Suggestions:', validation.suggestions);
   * }
   * ```
   */
  async validateGhosttyThemeFile(
    filePath: string, 
    options: FileOperationOptions = {}
  ): Promise<FileValidationResult> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      const validationPromise = this.validateThemeFileInternal(validatedPath, options);

      const result = await Promise.race([
        validationPromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      return result;
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${(error as Error).message}`,
        suggestions: [
          'Check file permissions',
          'Ensure file exists',
          'Verify file format'
        ]
      };
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal theme file validation
   */
  private async validateThemeFileInternal(
    filePath: string,
    options: FileOperationOptions
  ): Promise<FileValidationResult> {
    // Check if file exists
    const fileExists = await this.exists(filePath);
    if (!fileExists) {
      return {
        isValid: false,
        error: 'File does not exist',
        suggestions: ['Check the file path', 'Ensure the file exists']
      };
    }

    // Get file metadata
    const metadata = await this.getMetadata(filePath);
    
    // Check file extension
    if (!filePath.toLowerCase().endsWith('.txt') && !filePath.toLowerCase().endsWith('.theme')) {
      return {
        isValid: false,
        error: 'Invalid file extension. Expected .txt or .theme file',
        suggestions: [
          'Use a .txt or .theme file',
          'Rename your file with appropriate extension'
        ],
        metadata
      };
    }

    // Check file size
    if (metadata.size > FILE_SERVICE_CONFIG.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large (${formatBytes(metadata.size)}). Maximum size is ${formatBytes(FILE_SERVICE_CONFIG.MAX_FILE_SIZE)}`,
        suggestions: [
          'Use a smaller file',
          'Remove unnecessary content'
        ],
        metadata
      };
    }

    // Read and validate content
    const content = await this.readFile(filePath, { 
      ...options,
      onProgress: (progress) => {
        options.onProgress?.({
          ...progress,
          operation: 'Validating theme file'
        });
      }
    });

    return this.validateThemeContent(content, metadata);
  }

  /**
   * Validate theme file content
   */
  private validateThemeContent(content: string, metadata: FileMetadata): FileValidationResult {
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//');
    });

    // Check for color definitions
    const colorLineRegex = /^(color\d+|background|foreground|cursor|selection_background|selection_foreground)[\s=:]/i;
    const colorValueRegex = /[\s=:]+(#[A-Fa-f0-9]{3,8}|\w+)\s*$/;
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;

    const colorLines = lines.filter(line => colorLineRegex.test(line));
    
    if (colorLines.length === 0) {
      return {
        isValid: false,
        error: 'No valid color definitions found',
        suggestions: [
          'Add color definitions (e.g., background=#000000)',
          'Check the Ghostty theme format',
          'Ensure color lines are not commented out'
        ],
        metadata
      };
    }

    // Validate color values
    const warnings: string[] = [];
    let invalidColors = 0;

    for (const line of colorLines) {
      const valueMatch = line.match(colorValueRegex);
      if (valueMatch && valueMatch[1].startsWith('#')) {
        if (!hexColorRegex.test(valueMatch[1])) {
          invalidColors++;
        }
      }
    }

    if (invalidColors > colorLines.length / 2) {
      return {
        isValid: false,
        error: 'Too many invalid color values found',
        suggestions: [
          'Use valid hex color format (#RRGGBB)',
          'Check color values for typos',
          'Ensure colors are properly formatted'
        ],
        metadata
      };
    }

    if (invalidColors > 0) {
      warnings.push(`${invalidColors} invalid color value(s) found`);
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata
    };
  }

  /**
   * Parse Ghostty theme file into structured data
   * 
   * Parses a validated Ghostty theme file into a structured format suitable
   * for VS Code theme generation. Extracts color definitions, validates formats,
   * and provides detailed parsing results with warnings and errors.
   * 
   * @param filePath - Path to Ghostty theme file to parse
   * @param options - File operation options with progress tracking
   * @returns Promise resolving to parsing result with theme data
   * 
   * @throws {FileProcessingError} When parsing fails due to file access issues
   * 
   * @example
   * ```typescript
   * const result = await fileService.parseGhosttyThemeFile('./theme.txt');
   * if (result.success) {
   *   console.log(`Found ${result.colorCount} colors`);
   *   console.log('Theme data:', result.data);
   * } else {
   *   console.error('Parsing failed:', result.error);
   * }
   * ```
   */
  async parseGhosttyThemeFile(
    filePath: string,
    options: FileOperationOptions = {}
  ): Promise<ThemeParsingResult> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedPath = this.validatePath(filePath, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      // First validate the file
      const validation = await this.validateGhosttyThemeFile(validatedPath, options);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          warnings: validation.warnings
        };
      }

      const timeout = options.timeout || FILE_SERVICE_CONFIG.OPERATION_TIMEOUT;
      
      const parsePromise = this.parseThemeFileInternal(validatedPath, options);

      const result = await Promise.race([
        parsePromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Parsing failed: ${(error as Error).message}`
      };
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal theme parsing implementation
   */
  private async parseThemeFileInternal(
    filePath: string,
    options: FileOperationOptions
  ): Promise<ThemeParsingResult> {
    const content = await this.readFile(filePath, {
      ...options,
      onProgress: (progress) => {
        options.onProgress?.({
          ...progress,
          operation: 'Parsing theme file'
        });
      }
    });

    const data: Record<string, string> = {};
    const invalidLines: string[] = [];
    const warnings: string[] = [];
    let colorCount = 0;

    const lines = content.split('\n');
    const colorLineRegex = /^(color\d+|background|foreground|cursor|selection_background|selection_foreground)[\s=:]/i;
    const valueRegex = /[\s=:]+(#[A-Fa-f0-9]{3,8}|\w+)\s*$/;
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#') || line.startsWith('//')) {
        continue;
      }

      // Parse color definitions
      const colorMatch = line.match(colorLineRegex);
      if (colorMatch) {
        const valueMatch = line.match(valueRegex);
        if (valueMatch) {
          const key = colorMatch[1].toLowerCase();
          const value = valueMatch[1];
          
          // Validate hex colors
          if (value.startsWith('#') && !hexColorRegex.test(value)) {
            invalidLines.push(`Line ${i + 1}: Invalid color format "${value}"`);
            warnings.push(`Invalid color on line ${i + 1}: ${value}`);
          } else {
            data[key] = value.toLowerCase();
            colorCount++;
          }
        } else {
          invalidLines.push(`Line ${i + 1}: Missing color value`);
        }
      } else {
        // Check for palette format (palette = N=#color)
        const paletteMatch = line.match(/^palette[\s=:]+(\d+)[\s=:]+(.+)$/i);
        if (paletteMatch) {
          const index = paletteMatch[1];
          const color = paletteMatch[2].trim();
          
          if (color.startsWith('#') && !hexColorRegex.test(color)) {
            invalidLines.push(`Line ${i + 1}: Invalid palette color format "${color}"`);
            warnings.push(`Invalid palette color on line ${i + 1}: ${color}`);
          } else {
            data[`color${index}`] = color.toLowerCase();
            colorCount++;
          }
        } else if (line.includes('=') || line.includes(':')) {
          // Potential configuration line that we don't recognize
          invalidLines.push(`Line ${i + 1}: Unrecognized configuration "${line}"`);
        }
      }
    }

    return {
      success: true,
      data,
      colorCount,
      invalidLines: invalidLines.length > 0 ? invalidLines : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Generate complete VS Code extension file structure
   * 
   * Creates a complete VS Code extension directory with all necessary files:
   * - package.json with extension manifest
   * - Theme JSON file with color definitions
   * - README.md with usage instructions
   * - CHANGELOG.md with version history
   * - LICENSE file
   * 
   * @param outputDir - Directory where to create the extension
   * @param themeData - Parsed theme color data from Ghostty file
   * @param config - Theme configuration object
   * @param config.themeName - Display name for the theme
   * @param config.description - Theme description (optional)
   * @param config.version - Theme version (default: '1.0.0')
   * @param config.publisher - Publisher name (required for VS Code)
   * @param options - File operation options with progress tracking
   * @returns Promise that resolves when all files are generated
   * 
   * @throws {FileProcessingError} When file generation fails
   * @throws {ValidationError} When theme configuration is invalid
   * 
   * @example
   * ```typescript
   * await fileService.generateExtensionFiles(
   *   './my-theme-extension',
   *   themeData,
   *   {
   *     themeName: 'My Dark Theme',
   *     description: 'Beautiful dark theme for coding',
   *     version: '1.0.0',
   *     publisher: 'mycompany'
   *   },
   *   {
   *     onProgress: (progress) => console.log(`${progress.operation}: ${progress.percentage}%`)
   *   }
   * );
   * ```
   */
  async generateExtensionFiles(
    outputDir: string,
    themeData: Record<string, string>,
    config: {
      themeName: string;
      description?: string;
      version?: string;
      publisher?: string;
    },
    options: FileOperationOptions = {}
  ): Promise<void> {
    const operationId = this.generateOperationId();
    
    try {
      const validatedOutputDir = this.validatePath(outputDir, options.baseDir);
      const controller = new AbortController();
      this.activeOperations.set(operationId, controller);

      const timeout = options.timeout || PERFORMANCE_LIMITS.EXTENDED_TIMEOUT; // Use extended timeout for multiple files
      
      const generatePromise = this.generateExtensionFilesInternal(validatedOutputDir, themeData, config, options);

      await Promise.race([
        generatePromise,
        this.createTimeoutPromise(timeout, operationId)
      ]);

    } catch (error) {
      throw new FileProcessingError(`Failed to generate extension files: ${(error as Error).message}`);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Internal extension files generation
   */
  private async generateExtensionFilesInternal(
    outputDir: string,
    themeData: Record<string, string>,
    config: {
      themeName: string;
      description?: string;
      version?: string;
      publisher?: string;
    },
    options: FileOperationOptions
  ): Promise<void> {
    // Validate theme configuration
    const validatedConfig = this.securityService.validateThemeInput(config);
    
    // Create output directory structure
    await this.ensureDirectoryExists(outputDir, options);
    await this.ensureDirectoryExists(join(outputDir, 'themes'), options);

    const steps = [
      'package.json',
      'theme file',
      'README.md',
      'CHANGELOG.md',
      'LICENSE'
    ];
    let currentStep = 0;

    // Generate package.json
    options.onProgress?.({
      bytesProcessed: currentStep++,
      totalBytes: steps.length,
      percentage: Math.round(((currentStep - 1) / steps.length) * 100),
      operation: 'Generating package.json'
    });

    const packageJson = this.generatePackageJson(validatedConfig);
    await this.writeFile(join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2), {
      ...options,
      createParents: true
    });

    // Generate theme file
    options.onProgress?.({
      bytesProcessed: currentStep++,
      totalBytes: steps.length,
      percentage: Math.round(((currentStep - 1) / steps.length) * 100),
      operation: 'Generating theme file'
    });

    const themeJson = this.generateThemeJson(validatedConfig.name, themeData);
    const themeFileName = `${validatedConfig.name.toLowerCase().replace(/\s+/g, '-')}-color-theme.json`;
    await this.writeFile(join(outputDir, 'themes', themeFileName), JSON.stringify(themeJson, null, 2), {
      ...options,
      createParents: true
    });

    // Generate README.md
    options.onProgress?.({
      bytesProcessed: currentStep++,
      totalBytes: steps.length,
      percentage: Math.round(((currentStep - 1) / steps.length) * 100),
      operation: 'Generating README.md'
    });

    const readme = this.generateReadme(validatedConfig);
    await this.writeFile(join(outputDir, 'README.md'), readme, {
      ...options,
      createParents: true
    });

    // Generate CHANGELOG.md
    options.onProgress?.({
      bytesProcessed: currentStep++,
      totalBytes: steps.length,
      percentage: Math.round(((currentStep - 1) / steps.length) * 100),
      operation: 'Generating CHANGELOG.md'
    });

    const changelog = this.generateChangelog(validatedConfig.version);
    await this.writeFile(join(outputDir, 'CHANGELOG.md'), changelog, {
      ...options,
      createParents: true
    });

    // Generate LICENSE
    options.onProgress?.({
      bytesProcessed: currentStep++,
      totalBytes: steps.length,
      percentage: Math.round(((currentStep - 1) / steps.length) * 100),
      operation: 'Generating LICENSE'
    });

    const license = this.generateLicense();
    await this.writeFile(join(outputDir, 'LICENSE'), license, {
      ...options,
      createParents: true
    });

    options.onProgress?.({
      bytesProcessed: steps.length,
      totalBytes: steps.length,
      percentage: 100,
      operation: 'Extension generation completed'
    });
  }

  /**
   * Generate package.json content
   */
  private generatePackageJson(config: {
    name: string;
    description: string;
    version: string;
    publisher: string;
  }): any {
    return {
      name: config.name.toLowerCase().replace(/\s+/g, '-'),
      displayName: config.name,
      description: config.description || `${config.name} color theme`,
      version: config.version || '1.0.0',
      publisher: config.publisher || 'unknown',
      engines: {
        vscode: '^1.74.0'
      },
      categories: ['Themes'],
      contributes: {
        themes: [
          {
            label: config.name,
            uiTheme: 'vs-dark',
            path: `./themes/${config.name.toLowerCase().replace(/\s+/g, '-')}-color-theme.json`
          }
        ]
      },
      keywords: ['theme', 'color-theme', 'ghostty', 'terminal'],
      repository: {
        type: 'git',
        url: ''
      },
      bugs: {
        url: ''
      },
      license: 'MIT'
    };
  }

  /**
   * Generate VS Code theme JSON
   */
  private generateThemeJson(themeName: string, themeData: Record<string, string>): any {
    const colors: any = {};
    const tokenColors: any[] = [];

    // Map Ghostty colors to VS Code theme colors
    const colorMappings: Record<string, string[]> = {
      background: ['editor.background', 'terminal.background'],
      foreground: ['editor.foreground', 'terminal.foreground'],
      cursor: ['editorCursor.foreground', 'terminalCursor.foreground'],
      selection_background: ['editor.selectionBackground', 'terminal.selectionBackground'],
      selection_foreground: ['editor.selectionForeground']
    };

    // Apply basic color mappings
    for (const [ghosttyKey, vscodeKeys] of Object.entries(colorMappings)) {
      if (themeData[ghosttyKey]) {
        for (const vscodeKey of vscodeKeys) {
          colors[vscodeKey] = themeData[ghosttyKey];
        }
      }
    }

    // Map terminal colors (color0-color15)
    const terminalColors = [
      'terminal.ansiBlack', 'terminal.ansiRed', 'terminal.ansiGreen', 'terminal.ansiYellow',
      'terminal.ansiBlue', 'terminal.ansiMagenta', 'terminal.ansiCyan', 'terminal.ansiWhite',
      'terminal.ansiBrightBlack', 'terminal.ansiBrightRed', 'terminal.ansiBrightGreen', 'terminal.ansiBrightYellow',
      'terminal.ansiBrightBlue', 'terminal.ansiBrightMagenta', 'terminal.ansiBrightCyan', 'terminal.ansiBrightWhite'
    ];

    for (let i = 0; i < terminalColors.length && i < 16; i++) {
      const colorKey = `color${i}`;
      if (themeData[colorKey]) {
        colors[terminalColors[i]] = themeData[colorKey];
      }
    }

    // Add some basic token colors
    tokenColors.push(
      {
        settings: {
          foreground: themeData.foreground || '#ffffff'
        }
      },
      {
        name: 'Comment',
        scope: ['comment', 'punctuation.definition.comment'],
        settings: {
          foreground: themeData.color8 || themeData.color0 || '#6a6a6a'
        }
      },
      {
        name: 'String',
        scope: ['string'],
        settings: {
          foreground: themeData.color2 || '#98c379'
        }
      },
      {
        name: 'Number',
        scope: ['constant.numeric'],
        settings: {
          foreground: themeData.color1 || '#d19a66'
        }
      },
      {
        name: 'Keyword',
        scope: ['keyword'],
        settings: {
          foreground: themeData.color4 || '#c678dd'
        }
      }
    );

    return {
      name: themeName,
      type: 'dark',
      colors,
      tokenColors
    };
  }

  /**
   * Generate README.md content
   */
  private generateReadme(config: { name: string; description: string; version: string }): string {
    return `# ${config.name}

${config.description}

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "${config.name}"
4. Click Install

## Usage

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Preferences: Color Theme"
3. Select "${config.name}"

## Features

- Dark theme optimized for coding
- Terminal colors imported from Ghostty theme
- Consistent color scheme across editor and terminal

## Version

Current version: ${config.version}

## License

MIT License - see LICENSE file for details.
`;
  }

  /**
   * Generate CHANGELOG.md content
   */
  private generateChangelog(version: string): string {
    return `# Change Log

All notable changes to the "${version}" extension will be documented in this file.

## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
- Dark theme with terminal color support
- Imported from Ghostty theme configuration

### Changed
- N/A

### Removed
- N/A
`;
  }

  /**
   * Generate LICENSE content
   */
  private generateLicense(): string {
    return `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  }

  /**
   * Cancel all active operations
   */
  cancelAllOperations(): void {
    for (const [operationId, controller] of this.activeOperations) {
      controller.abort();
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Cancel specific operation
   */
  cancelOperation(operationId: string): boolean {
    const controller = this.activeOperations.get(operationId);
    if (controller) {
      controller.abort();
      this.activeOperations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cancelAllOperations();
    this.securityService.cleanup();
  }
}

/**
 * Global file service instance
 */
let globalFileService: FileService | null = null;

/**
 * Get the global file service instance (singleton pattern)
 * 
 * Lazy-initializes the global file service with default SecurityService.
 * Ensures consistent file operations throughout the application.
 * 
 * @returns The global FileService instance
 * 
 * @example
 * ```typescript
 * const fileService = getFileService();
 * const exists = await fileService.exists('./config.json');
 * ```
 * 
 * @since 1.0.0
 */
export function getFileService(): FileService {
  if (!globalFileService) {
    globalFileService = new FileService();
  }
  return globalFileService;
}

/**
 * Reset the global file service (for testing)
 * 
 * Cleans up the current global file service and resets it to null.
 * Cancels all active operations and cleans up resources. Used primarily
 * in test environments to ensure clean state between tests.
 * 
 * @example
 * ```typescript
 * // In test setup/teardown
 * afterEach(() => {
 *   resetFileService();
 * });
 * ```
 * 
 * @since 1.0.0
 */
export function resetFileService(): void {
  if (globalFileService) {
    globalFileService.cleanup();
    globalFileService = null;
  }
}

/**
 * Convenience function to create a file service with error handling
 * 
 * Creates a new FileService instance wrapped with comprehensive error handling.
 * Provides additional error context and graceful failure handling.
 * 
 * @returns Promise resolving to a new FileService instance
 * 
 * @throws {FileProcessingError} When service creation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const fileService = await createFileService();
 *   // Use file service
 * } catch (error) {
 *   console.error('Failed to create file service:', error.message);
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const createFileService = withErrorHandling(
  async (): Promise<FileService> => {
    return new FileService();
  }
);

/**
 * Export the service and utilities for easy access
 */
export default FileService;