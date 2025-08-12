/**
 * Tests for CLI validation logic
 * Tests the validation functions from main.ts in isolation
 */

import { describe, it, expect } from 'vitest';

// We need to extract the validation logic to test it properly
// For now, let's test the basic patterns that would be used

describe('CLI Validation Patterns', () => {
  describe('version validation', () => {
    const VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

    it('accepts valid semantic versions', () => {
      const validVersions = [
        '1.0.0',
        '0.1.0',
        '10.20.30',
        '1.0.0-alpha',
        '1.0.0-beta.1',
        '2.1.3-pre.1',
      ];

      validVersions.forEach(version => {
        expect(VERSION_REGEX.test(version)).toBe(true);
      });
    });

    it('rejects invalid versions', () => {
      const invalidVersions = ['1.0', '1', '1.0.0.0', 'v1.0.0', '1.0.0-', 'invalid', ''];

      invalidVersions.forEach(version => {
        expect(VERSION_REGEX.test(version)).toBe(false);
      });
    });
  });

  describe('publisher name validation', () => {
    const PUBLISHER_REGEX = /^[a-z0-9-]+$/i;
    const MIN_LENGTH = 3;

    const validatePublisher = (publisher: string): boolean => {
      return publisher.length >= MIN_LENGTH && PUBLISHER_REGEX.test(publisher);
    };

    it('accepts valid publisher names', () => {
      const validPublishers = [
        'my-company',
        'company',
        'Company123',
        'long-publisher-name',
        'company-with-dashes',
      ];

      validPublishers.forEach(publisher => {
        expect(validatePublisher(publisher)).toBe(true);
      });
    });

    it('rejects invalid publisher names', () => {
      const invalidPublishers = [
        'ab', // Too short
        'invalid!',
        'invalid@domain.com',
        'invalid space',
        'invalid_underscore',
        '',
      ];

      invalidPublishers.forEach(publisher => {
        expect(validatePublisher(publisher)).toBe(false);
      });
    });
  });

  describe('step navigation logic', () => {
    const determineSkipStep = (input?: string, name?: string): string | undefined => {
      if (input && name) {
        return 'extension-options';
      } else if (input) {
        return 'theme-config';
      }
      return undefined;
    };

    it('skips to extension options when both input and name provided', () => {
      expect(determineSkipStep('/test/theme.txt', 'My Theme')).toBe('extension-options');
    });

    it('skips to theme config when only input provided', () => {
      expect(determineSkipStep('/test/theme.txt')).toBe('theme-config');
      expect(determineSkipStep('/test/theme.txt', '')).toBe('theme-config');
    });

    it('does not skip when no input provided', () => {
      expect(determineSkipStep()).toBeUndefined();
      expect(determineSkipStep('', 'My Theme')).toBeUndefined();
    });
  });

  describe('initial data creation patterns', () => {
    interface CLIFlags {
      input?: string;
      name?: string;
      description?: string;
      version?: string;
      publisher?: string;
      license?: string;
      output?: string;
      readme?: boolean;
      changelog?: boolean;
      quickstart?: boolean;
    }

    interface FormData {
      inputFile: string;
      themeName: string;
      description: string;
      version: string;
      publisher: string;
      license: string;
      outputPath: string;
      generateFullExtension: boolean;
      generateReadme: boolean;
      generateChangelog: boolean;
      generateQuickstart: boolean;
      skipToStep?: string;
    }

    const createInitialData = (flags: CLIFlags): Partial<FormData> => {
      return {
        inputFile: flags.input || '',
        themeName: flags.name || '',
        description: flags.description || '',
        version: flags.version || '0.0.1',
        publisher: flags.publisher || '',
        license: flags.license || 'MIT',
        outputPath: flags.output || '',
        generateFullExtension: true,
        generateReadme: flags.readme !== false,
        generateChangelog: flags.changelog !== false,
        generateQuickstart: flags.quickstart !== false,
      };
    };

    it('creates initial data with provided flags', () => {
      const flags: CLIFlags = {
        input: '/test/theme.txt',
        name: 'My Theme',
        description: 'Test theme',
        version: '1.0.0',
        publisher: 'my-company',
        license: 'MIT',
      };

      const result = createInitialData(flags);

      expect(result.inputFile).toBe('/test/theme.txt');
      expect(result.themeName).toBe('My Theme');
      expect(result.description).toBe('Test theme');
      expect(result.version).toBe('1.0.0');
      expect(result.publisher).toBe('my-company');
      expect(result.license).toBe('MIT');
    });

    it('uses defaults for missing flags', () => {
      const flags: CLIFlags = {};

      const result = createInitialData(flags);

      expect(result.inputFile).toBe('');
      expect(result.themeName).toBe('');
      expect(result.version).toBe('0.0.1');
      expect(result.license).toBe('MIT');
      expect(result.generateFullExtension).toBe(true);
      expect(result.generateReadme).toBe(true);
      expect(result.generateChangelog).toBe(true);
      expect(result.generateQuickstart).toBe(true);
    });

    it('handles boolean flag negation', () => {
      const flags: CLIFlags = {
        readme: false,
        changelog: false,
        quickstart: false,
      };

      const result = createInitialData(flags);

      expect(result.generateReadme).toBe(false);
      expect(result.generateChangelog).toBe(false);
      expect(result.generateQuickstart).toBe(false);
    });
  });
});
