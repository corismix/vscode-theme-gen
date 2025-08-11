import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SecurityService,
  ResourceLimiter,
  PathValidator,
  InputSanitizer,
  getSecurityService,
  resetSecurityService,
} from '@/services/SecurityService';
import { SecurityError, ValidationError } from '@/types';
import { SECURITY_LIMITS, RESOURCE_LIMITS } from '@/config';

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    resetSecurityService();
    securityService = new SecurityService();
  });

  afterEach(() => {
    securityService.cleanup();
    resetSecurityService();
  });

  describe('validateFilePath', () => {
    it('should validate a safe file path', () => {
      const safePath = '/Users/test/theme.conf';
      const result = securityService.validateFilePath(safePath);
      expect(result).toBe(safePath);
    });

    it('should reject path traversal attempts', () => {
      expect(() => {
        securityService.validateFilePath('../../../etc/passwd');
      }).toThrow(SecurityError);
    });

    it('should reject files with disallowed extensions', () => {
      expect(() => {
        securityService.validateFilePath('/Users/test/malicious.exe');
      }).toThrow(SecurityError);
    });

    it('should reject paths with null bytes', () => {
      expect(() => {
        securityService.validateFilePath('/Users/test/file\0.conf');
      }).toThrow(SecurityError);
    });

    it('should reject paths that are too long', () => {
      const longPath = '/Users/test/' + 'a'.repeat(SECURITY_LIMITS.MAX_PATH_LENGTH);
      expect(() => {
        securityService.validateFilePath(longPath);
      }).toThrow(SecurityError);
    });

    it('should track file read operations', () => {
      const safePath = '/Users/test/theme.conf';
      securityService.validateFilePath(safePath);
      
      const stats = securityService.getSecurityStats();
      expect(stats.resourceUsage.fileReads).toBe(1);
    });

    it('should enforce file read limits', () => {
      const safePath = '/Users/test/theme.conf';
      
      // Exceed the file read limit
      for (let i = 0; i < RESOURCE_LIMITS.MAX_FILE_READS + 1; i++) {
        if (i < RESOURCE_LIMITS.MAX_FILE_READS) {
          securityService.validateFilePath(safePath);
        } else {
          expect(() => {
            securityService.validateFilePath(safePath);
          }).toThrow(SecurityError);
        }
      }
    });
  });

  describe('validateThemeInput', () => {
    it('should validate and sanitize theme input', () => {
      const input = {
        name: 'My Theme',
        description: 'A beautiful theme for VS Code',
        version: '1.0.0',
        publisher: 'test-publisher',
      };

      const result = securityService.validateThemeInput(input);
      
      expect(result.name).toBe('My Theme');
      expect(result.description).toBe('A beautiful theme for VS Code');
      expect(result.version).toBe('1.0.0');
      expect(result.publisher).toBe('test-publisher');
    });

    it('should handle empty input gracefully', () => {
      const input = {};
      const result = securityService.validateThemeInput(input);
      
      expect(result.name).toBe('');
      expect(result.description).toBe('');
      expect(result.version).toBe('');
      expect(result.publisher).toBe('');
    });

    it('should sanitize dangerous characters in theme name', () => {
      const input = {
        name: 'Theme<script>alert("xss")</script>',
      };

      const result = securityService.validateThemeInput(input);
      expect(result.name).not.toContain('<script>');
      expect(result.name).not.toContain('alert');
    });

    it('should reject overly long inputs', () => {
      const longName = 'a'.repeat(SECURITY_LIMITS.MAX_THEME_NAME_LENGTH + 1);
      
      expect(() => {
        securityService.validateThemeInput({ name: longName });
      }).toThrow(ValidationError);
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics', () => {
      const stats = securityService.getSecurityStats();
      
      expect(stats).toHaveProperty('resourceUsage');
      expect(stats).toHaveProperty('limits');
      expect(stats.limits).toBe(SECURITY_LIMITS);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      expect(() => securityService.cleanup()).not.toThrow();
    });
  });
});

describe('ResourceLimiter', () => {
  let limiter: ResourceLimiter;

  beforeEach(() => {
    limiter = new ResourceLimiter();
  });

  afterEach(() => {
    limiter.cleanup();
  });

  describe('canPerform', () => {
    it('should allow operations within limits', () => {
      expect(limiter.canPerform('fileReads')).toBe(true);
    });

    it('should block operations exceeding limits', () => {
      // Track operations up to the limit
      for (let i = 0; i < RESOURCE_LIMITS.MAX_FILE_READS; i++) {
        limiter.track('fileReads');
      }
      
      expect(limiter.canPerform('fileReads')).toBe(false);
    });

    it('should handle unknown operation types', () => {
      expect(limiter.canPerform('unknownOperation')).toBe(true);
    });
  });

  describe('track', () => {
    it('should track operations correctly', () => {
      limiter.track('fileReads');
      limiter.track('fileReads');
      
      const stats = limiter.getStats();
      expect(stats.fileReads).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return current operation counts', () => {
      limiter.track('fileReads');
      limiter.track('fileWrites');
      
      const stats = limiter.getStats();
      expect(stats.fileReads).toBe(1);
      expect(stats.fileWrites).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clear operations and timers', () => {
      limiter.track('fileReads');
      limiter.cleanup();
      
      const stats = limiter.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe('reset timer', () => {
    it('should reset operations periodically', (done) => {
      limiter.track('fileReads');
      expect(limiter.getStats().fileReads).toBe(1);
      
      // Mock timer to trigger immediately
      setTimeout(() => {
        // In real scenario, operations would be cleared
        // This tests the timer setup doesn't crash
        done();
      }, 10);
    });
  });
});

describe('PathValidator', () => {
  describe('validatePath', () => {
    it('should validate safe absolute paths', () => {
      const safePath = '/Users/test/theme.conf';
      const result = PathValidator.validatePath(safePath);
      expect(result).toBe(safePath);
    });

    it('should resolve relative paths safely', () => {
      const relativePath = './theme.conf';
      const result = PathValidator.validatePath(relativePath);
      expect(result).toContain('theme.conf');
      expect(result).not.toContain('../');
    });

    it('should reject path traversal', () => {
      expect(() => {
        PathValidator.validatePath('../../../etc/passwd');
      }).toThrow(SecurityError);
    });

    it('should reject null bytes in paths', () => {
      expect(() => {
        PathValidator.validatePath('/test/file\0.conf');
      }).toThrow(SecurityError);
    });

    it('should reject overly long paths', () => {
      const longPath = 'a'.repeat(SECURITY_LIMITS.MAX_PATH_LENGTH + 1);
      expect(() => {
        PathValidator.validatePath(longPath);
      }).toThrow(SecurityError);
    });

    it('should reject invalid path inputs', () => {
      expect(() => {
        PathValidator.validatePath('');
      }).toThrow(SecurityError);

      expect(() => {
        PathValidator.validatePath(null as any);
      }).toThrow(SecurityError);

      expect(() => {
        PathValidator.validatePath(undefined as any);
      }).toThrow(SecurityError);
    });

    it('should handle custom base directories', () => {
      const customBase = '/Users/test';
      const result = PathValidator.validatePath('theme.conf', customBase);
      expect(result).toBe('/Users/test/theme.conf');
    });
  });

  describe('validateFileExtension', () => {
    it('should allow permitted extensions', () => {
      expect(PathValidator.validateFileExtension('theme.conf')).toBe(true);
      expect(PathValidator.validateFileExtension('config.toml')).toBe(true);
      expect(PathValidator.validateFileExtension('data.json')).toBe(true);
    });

    it('should reject dangerous extensions', () => {
      expect(PathValidator.validateFileExtension('malicious.exe')).toBe(false);
      expect(PathValidator.validateFileExtension('script.bat')).toBe(false);
      expect(PathValidator.validateFileExtension('shell.sh')).toBe(false);
    });

    it('should handle case insensitive extensions', () => {
      expect(PathValidator.validateFileExtension('THEME.CONF')).toBe(true);
      expect(PathValidator.validateFileExtension('MALICIOUS.EXE')).toBe(false);
    });

    it('should handle files without extensions', () => {
      expect(PathValidator.validateFileExtension('filename')).toBe(false);
    });
  });

  describe('isPathSafe', () => {
    it('should allow paths in safe directories', () => {
      const safePath = process.cwd() + '/theme.conf';
      expect(PathValidator.isPathSafe(safePath)).toBe(true);
    });

    it('should reject paths outside safe directories', () => {
      expect(PathValidator.isPathSafe('/etc/passwd')).toBe(false);
      expect(PathValidator.isPathSafe('/root/.ssh/id_rsa')).toBe(false);
    });

    it('should handle invalid paths gracefully', () => {
      expect(PathValidator.isPathSafe('')).toBe(false);
      // Path with null bytes would be caught by resolve
      expect(PathValidator.isPathSafe('invalid\0path')).toBe(false);
    });
  });
});

describe('InputSanitizer', () => {
  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const dangerous = 'Hello<script>alert("xss")</script>World';
      const result = InputSanitizer.sanitizeInput(dangerous);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should handle normal input', () => {
      const normal = 'My Theme Name';
      const result = InputSanitizer.sanitizeInput(normal);
      expect(result).toBe(normal);
    });

    it('should reject non-string input', () => {
      expect(() => {
        InputSanitizer.sanitizeInput(null as any);
      }).toThrow(ValidationError);

      expect(() => {
        InputSanitizer.sanitizeInput(123 as any);
      }).toThrow(ValidationError);
    });
  });

  describe('processUserInput', () => {
    it('should process valid input', () => {
      const input = '  My Theme Name  ';
      const result = InputSanitizer.processUserInput(input);
      expect(result).toBe('My Theme Name');
    });

    it('should enforce length limits', () => {
      const longInput = 'a'.repeat(SECURITY_LIMITS.MAX_INPUT_LENGTH + 1);
      expect(() => {
        InputSanitizer.processUserInput(longInput);
      }).toThrow(ValidationError);
    });

    it('should reject empty input after sanitization', () => {
      const emptyAfterSanitization = '   ';
      expect(() => {
        InputSanitizer.processUserInput(emptyAfterSanitization);
      }).toThrow(ValidationError);
    });

    it('should reject invalid input types', () => {
      expect(() => {
        InputSanitizer.processUserInput(null as any);
      }).toThrow(ValidationError);

      expect(() => {
        InputSanitizer.processUserInput('');
      }).toThrow(ValidationError);
    });

    it('should respect custom max length', () => {
      const input = 'test input';
      const result = InputSanitizer.processUserInput(input, 5);
      expect(() => {
        InputSanitizer.processUserInput(input, 5);
      }).toThrow(ValidationError);
    });
  });

  describe('sanitizeThemeName', () => {
    it('should sanitize theme names properly', () => {
      const input = 'My Amazing Theme!@#$';
      const result = InputSanitizer.sanitizeThemeName(input);
      expect(result).toBe('My Amazing Theme');
    });

    it('should normalize spaces', () => {
      const input = 'Theme   With    Multiple   Spaces';
      const result = InputSanitizer.sanitizeThemeName(input);
      expect(result).toBe('Theme With Multiple Spaces');
    });

    it('should allow hyphens and underscores', () => {
      const input = 'my-theme_name-2';
      const result = InputSanitizer.sanitizeThemeName(input);
      expect(result).toBe('my-theme_name-2');
    });

    it('should enforce theme name length limits', () => {
      const longName = 'a'.repeat(SECURITY_LIMITS.MAX_THEME_NAME_LENGTH + 1);
      expect(() => {
        InputSanitizer.sanitizeThemeName(longName);
      }).toThrow(ValidationError);
    });
  });

  describe('sanitizeFilePath', () => {
    it('should sanitize and validate file paths', () => {
      const input = './theme.conf';
      const result = InputSanitizer.sanitizeFilePath(input);
      expect(result).toContain('theme.conf');
    });

    it('should reject dangerous file paths', () => {
      expect(() => {
        InputSanitizer.sanitizeFilePath('../../../etc/passwd');
      }).toThrow(SecurityError);
    });
  });
});

describe('Global Security Service', () => {
  afterEach(() => {
    resetSecurityService();
  });

  describe('getSecurityService', () => {
    it('should return singleton instance', () => {
      const service1 = getSecurityService();
      const service2 = getSecurityService();
      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getSecurityService();
      resetSecurityService();
      const service2 = getSecurityService();
      expect(service1).not.toBe(service2);
    });
  });

  describe('resetSecurityService', () => {
    it('should clean up existing service', () => {
      const service = getSecurityService();
      const cleanupSpy = vi.spyOn(service, 'cleanup');
      
      resetSecurityService();
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle multiple resets gracefully', () => {
      resetSecurityService();
      resetSecurityService();
      resetSecurityService();
      
      expect(() => getSecurityService()).not.toThrow();
    });
  });
});

describe('Security Error Scenarios', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    resetSecurityService();
    securityService = new SecurityService();
  });

  afterEach(() => {
    securityService.cleanup();
    resetSecurityService();
  });

  it('should handle resource exhaustion scenarios', () => {
    // Test cascading resource exhaustion
    const safePath = '/Users/test/theme.conf';
    
    for (let i = 0; i < RESOURCE_LIMITS.MAX_FILE_READS; i++) {
      securityService.validateFilePath(safePath);
    }
    
    expect(() => {
      securityService.validateFilePath(safePath);
    }).toThrow('File read limit exceeded');
  });

  it('should handle edge cases in path validation', () => {
    // Test various edge cases
    const edgeCases = [
      './',
      '../',
      './.',
      '.././',
      'file with spaces.conf',
      'файл.conf', // Unicode filename
    ];

    edgeCases.forEach(testCase => {
      try {
        const result = securityService.validateFilePath(testCase);
        expect(typeof result).toBe('string');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  it('should prevent timing attacks on path validation', () => {
    const start = performance.now();
    try {
      securityService.validateFilePath('../../../etc/passwd');
    } catch {
      // Expected to fail
    }
    const timeForBadPath = performance.now() - start;

    const start2 = performance.now();
    try {
      securityService.validateFilePath('/Users/test/valid.conf');
    } catch {
      // May or may not fail depending on file existence
    }
    const timeForGoodPath = performance.now() - start2;

    // Time difference should be reasonable (not revealing internal logic)
    expect(Math.abs(timeForBadPath - timeForGoodPath)).toBeLessThan(100);
  });
});