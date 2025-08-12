# Configuration System

This directory contains the centralized configuration system for the VS Code
Theme Generator, replacing magic numbers and hard-coded values throughout the
codebase with configurable, environment-variable-driven limits.

## Files

- **`limits.ts`** - Main configuration with all limits, defaults, and validation
  helpers
- **`index.ts`** - Public API exports and convenience re-exports

## Categories

### File Limits (`FILE_LIMITS`)

- `MAX_SIZE_BYTES` - Maximum file size for theme files (1MB default)
- `STREAMING_MAX_SIZE_BYTES` - Maximum size for streaming operations (10MB
  default)
- `STREAMING_THRESHOLD` - When to switch to streaming (10MB default)
- `MAX_LINES` - Maximum lines in theme files (10,000 default)
- `STREAM_CHUNK_SIZE` - Chunk size for streaming (64KB default)
- `PROGRESS_INTERVAL` - Progress update frequency (1MB default)

### Security Limits (`SECURITY_LIMITS`)

- `MAX_INPUT_LENGTH` - Maximum user input length (1000 chars default)
- `MAX_KEY_LENGTH` - Maximum theme key length (100 chars default)
- `MAX_VALUE_LENGTH` - Maximum theme value length (500 chars default)
- `MAX_THEME_NAME_LENGTH` - Maximum theme name length (100 chars default)
- `MAX_DESCRIPTION_LENGTH` - Maximum description length (500 chars default)
- `MAX_PUBLISHER_LENGTH` - Maximum publisher name length (100 chars default)
- `MAX_PATH_LENGTH` - Maximum file path length (500 chars default)
- `ALLOWED_FILE_EXTENSIONS` - Allowed file extensions array
- `DANGEROUS_CHARACTERS` - Regex for dangerous characters

### Resource Limits (`RESOURCE_LIMITS`)

- `MAX_CONCURRENT_OPS` - Maximum concurrent operations (10 default)
- `MAX_FILE_READS` - Maximum file reads per session (100 default)
- `MAX_FILE_WRITES` - Maximum file writes per session (50 default)
- `RESOURCE_RESET_INTERVAL` - Counter reset interval (1 hour default)

### Performance Limits (`PERFORMANCE_LIMITS`)

- `OPERATION_TIMEOUT` - Default operation timeout (30 seconds default)
- `EXTENDED_TIMEOUT` - Extended timeout for complex operations (1 minute
  default)
- `TEST_TIMEOUT` - Test operation timeout (10 seconds default)

### UI Limits (`UI_LIMITS`)

- `NOTIFICATION_DURATION` - Default notification duration (5 seconds default)
- `MAX_RECENT_FILES` - Maximum recent files to track (10 default)
- `CLEANUP_THRESHOLD_DAYS` - Configuration cleanup threshold (30 days default)

### Default Values (`DEFAULT_VALUES`)

- `THEME_VERSION` - Default theme version ("0.0.1" default)
- `LICENSE` - Default license type ("MIT" default)
- `FILE_ENCODING` - Default file encoding ("utf8" default)
- `THEME_KEYWORDS` - Default theme keywords array
- `VSCODE_CATEGORIES` - Default VS Code categories array

## Environment Variables

All limits support environment variable overrides with validation:

```bash
# File size limits (supports K/M/G suffixes)
THEME_MAX_FILE_SIZE="2M"
THEME_STREAMING_SIZE="50M"
THEME_STREAMING_THRESHOLD="5M"

# Numeric limits
THEME_MAX_LINES="50000"
THEME_MAX_INPUT_LENGTH="2000"
THEME_MAX_THEME_NAME_LENGTH="150"

# Timeouts (milliseconds)
THEME_OPERATION_TIMEOUT="60000"
THEME_NOTIFICATION_DURATION="3000"

# Arrays (comma-separated)
THEME_ALLOWED_EXTENSIONS=".theme,.conf,.json"
THEME_DEFAULT_KEYWORDS="theme,dark,light"
```

## Usage

```typescript
import {
  FILE_LIMITS,
  SECURITY_LIMITS,
  validateFileSize,
  formatBytes,
} from '@/config';

// Use limits
if (fileSize > FILE_LIMITS.MAX_SIZE_BYTES) {
  throw new Error(`File too large: ${formatBytes(fileSize)}`);
}

// Validate with helpers
validateFileSize(fileSize);
validateStringLength(
  themeName,
  SECURITY_LIMITS.MAX_THEME_NAME_LENGTH,
  'Theme name'
);

// Format for display
console.log(`Max file size: ${formatBytes(FILE_LIMITS.MAX_SIZE_BYTES)}`);
```

## Migration

The following files have been updated to use this centralized configuration:

- `src/lib/theme-generator.ts` - Theme parsing limits
- `src/lib/utils.ts` - File validation limits
- `src/services/SecurityService.ts` - Security validation limits
- `src/services/FileService.ts` - File operation limits
- `src/types/config.types.ts` - Default configuration values
- `src/utils/config.ts` - Configuration cleanup settings
- `src/components/shared/hooks.ts` - UI notification duration
- `src/test/setup.ts` - Test timeout configuration

All magic numbers have been replaced with configurable values that support
environment variable overrides and include comprehensive validation.
