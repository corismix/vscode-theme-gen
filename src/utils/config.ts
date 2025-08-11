/**
 * Configuration management system for VS Code Theme Generator
 * Following TweakCC patterns for robust configuration handling
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  GeneratorConfig,
  UserPreferences,
  ThemeDefaults,
  RecentFile,
  DEFAULT_THEME_DEFAULTS,
  DEFAULT_USER_PREFERENCES,
} from './types.js';

// ============================================================================
// Configuration Constants
// ============================================================================

const CONFIG_DIR = join(homedir(), '.vscode-theme-generator');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const BACKUP_FILE = join(CONFIG_DIR, 'config.backup.json');
const CONFIG_VERSION = '1.0.0';

// ============================================================================
// Default Configuration
// ============================================================================

const createDefaultConfig = (): GeneratorConfig => ({
  version: CONFIG_VERSION,
  lastModified: new Date().toISOString(),
  recentFiles: [],
  preferences: { ...DEFAULT_USER_PREFERENCES },
  themeDefaults: { ...DEFAULT_THEME_DEFAULTS },
});

// ============================================================================
// Configuration File Operations
// ============================================================================

/**
 * Ensures the configuration directory exists
 */
const ensureConfigDir = async (): Promise<void> => {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
};

/**
 * Reads the configuration file with error handling and validation
 */
export const readConfigFile = async (): Promise<GeneratorConfig> => {
  try {
    await ensureConfigDir();
    
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(configData);
    
    // Validate and migrate if necessary
    const config = validateAndMigrateConfig(parsed);
    return config;
  } catch (error) {
    // If config doesn't exist or is invalid, create default
    console.warn('Config file not found or invalid, creating default configuration');
    return createDefaultConfig();
  }
};

/**
 * Writes the configuration file with backup creation
 */
export const writeConfigFile = async (config: GeneratorConfig): Promise<void> => {
  try {
    await ensureConfigDir();
    
    // Create backup of existing config
    try {
      const existingConfig = await fs.readFile(CONFIG_FILE, 'utf8');
      await fs.writeFile(BACKUP_FILE, existingConfig);
    } catch {
      // No existing config to backup
    }
    
    // Update timestamp
    const updatedConfig: GeneratorConfig = {
      ...config,
      lastModified: new Date().toISOString(),
    };
    
    // Write new config
    await fs.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
  } catch (error) {
    throw new Error(`Failed to write configuration: ${(error as Error).message}`);
  }
};

/**
 * Restores configuration from backup
 */
export const restoreFromBackup = async (): Promise<GeneratorConfig> => {
  try {
    const backupData = await fs.readFile(BACKUP_FILE, 'utf8');
    const config = JSON.parse(backupData);
    
    // Write restored config
    await writeConfigFile(config);
    return config;
  } catch {
    // If backup doesn't exist, create default config
    const defaultConfig = createDefaultConfig();
    await writeConfigFile(defaultConfig);
    return defaultConfig;
  }
};

// ============================================================================
// Configuration Validation and Migration
// ============================================================================

/**
 * Validates and migrates configuration to current version
 */
const validateAndMigrateConfig = (config: any): GeneratorConfig => {
  // Start with default config
  const validatedConfig = createDefaultConfig();
  
  if (!config || typeof config !== 'object') {
    return validatedConfig;
  }
  
  // Merge in valid properties
  if (typeof config.version === 'string') {
    validatedConfig.version = config.version;
  }
  
  if (typeof config.lastModified === 'string') {
    validatedConfig.lastModified = config.lastModified;
  }
  
  // Validate recent files
  if (Array.isArray(config.recentFiles)) {
    validatedConfig.recentFiles = config.recentFiles
      .filter(isValidRecentFile)
      .slice(0, 10); // Limit to 10 recent files
  }
  
  // Validate preferences
  if (config.preferences && typeof config.preferences === 'object') {
    validatedConfig.preferences = {
      ...validatedConfig.preferences,
      ...validateUserPreferences(config.preferences),
    };
  }
  
  // Validate theme defaults
  if (config.themeDefaults && typeof config.themeDefaults === 'object') {
    validatedConfig.themeDefaults = {
      ...validatedConfig.themeDefaults,
      ...validateThemeDefaults(config.themeDefaults),
    };
  }
  
  return validatedConfig;
};

/**
 * Validates a recent file entry
 */
const isValidRecentFile = (file: any): file is RecentFile => {
  return (
    file &&
    typeof file === 'object' &&
    typeof file.path === 'string' &&
    typeof file.name === 'string' &&
    typeof file.lastUsed === 'string'
  );
};

/**
 * Validates user preferences
 */
const validateUserPreferences = (preferences: any): Partial<UserPreferences> => {
  const validated: Partial<UserPreferences> = {};
  
  if (typeof preferences.defaultPublisher === 'string') {
    validated.defaultPublisher = preferences.defaultPublisher;
  }
  
  if (typeof preferences.defaultLicense === 'string') {
    validated.defaultLicense = preferences.defaultLicense;
  }
  
  if (typeof preferences.defaultOutputPath === 'string') {
    validated.defaultOutputPath = preferences.defaultOutputPath;
  }
  
  if (typeof preferences.autoOpenVSCode === 'boolean') {
    validated.autoOpenVSCode = preferences.autoOpenVSCode;
  }
  
  if (typeof preferences.generateFullExtension === 'boolean') {
    validated.generateFullExtension = preferences.generateFullExtension;
  }
  
  if (typeof preferences.generateReadme === 'boolean') {
    validated.generateReadme = preferences.generateReadme;
  }
  
  if (typeof preferences.generateChangelog === 'boolean') {
    validated.generateChangelog = preferences.generateChangelog;
  }
  
  if (typeof preferences.generateQuickstart === 'boolean') {
    validated.generateQuickstart = preferences.generateQuickstart;
  }
  
  if (typeof preferences.maxRecentFiles === 'number' && preferences.maxRecentFiles > 0) {
    validated.maxRecentFiles = Math.min(preferences.maxRecentFiles, 20);
  }
  
  return validated;
};

/**
 * Validates theme defaults
 */
const validateThemeDefaults = (defaults: any): Partial<ThemeDefaults> => {
  const validated: Partial<ThemeDefaults> = {};
  
  if (typeof defaults.version === 'string' && /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(defaults.version)) {
    validated.version = defaults.version;
  }
  
  if (typeof defaults.license === 'string') {
    validated.license = defaults.license;
  }
  
  if (typeof defaults.publisher === 'string') {
    validated.publisher = defaults.publisher;
  }
  
  if (typeof defaults.description === 'string') {
    validated.description = defaults.description;
  }
  
  if (Array.isArray(defaults.keywords)) {
    validated.keywords = defaults.keywords.filter((k: any) => typeof k === 'string');
  }
  
  if (Array.isArray(defaults.categories)) {
    validated.categories = defaults.categories.filter((c: any) => typeof c === 'string');
  }
  
  return validated;
};

// ============================================================================
// Recent Files Management
// ============================================================================

/**
 * Adds a file to the recent files list
 */
export const addRecentFile = async (filePath: string, fileName: string): Promise<void> => {
  try {
    const config = await readConfigFile();
    
    // Remove existing entry if it exists
    config.recentFiles = config.recentFiles.filter(f => f.path !== filePath);
    
    // Add to beginning of list
    config.recentFiles.unshift({
      path: filePath,
      name: fileName,
      lastUsed: new Date().toISOString(),
      isValid: true,
    });
    
    // Limit to max recent files
    const maxFiles = config.preferences.maxRecentFiles || 10;
    config.recentFiles = config.recentFiles.slice(0, maxFiles);
    
    await writeConfigFile(config);
  } catch (error) {
    console.warn('Failed to add recent file:', (error as Error).message);
  }
};

/**
 * Removes a file from the recent files list
 */
export const removeRecentFile = async (filePath: string): Promise<void> => {
  try {
    const config = await readConfigFile();
    config.recentFiles = config.recentFiles.filter(f => f.path !== filePath);
    await writeConfigFile(config);
  } catch (error) {
    console.warn('Failed to remove recent file:', (error as Error).message);
  }
};

/**
 * Clears all recent files
 */
export const clearRecentFiles = async (): Promise<void> => {
  try {
    const config = await readConfigFile();
    config.recentFiles = [];
    await writeConfigFile(config);
  } catch (error) {
    console.warn('Failed to clear recent files:', (error as Error).message);
  }
};

/**
 * Validates recent files and removes invalid ones
 */
export const validateRecentFiles = async (): Promise<void> => {
  try {
    const config = await readConfigFile();
    const validFiles: RecentFile[] = [];
    
    for (const file of config.recentFiles) {
      try {
        await fs.access(file.path);
        validFiles.push({ ...file, isValid: true });
      } catch {
        // File no longer exists, don't add to valid files
      }
    }
    
    if (validFiles.length !== config.recentFiles.length) {
      config.recentFiles = validFiles;
      await writeConfigFile(config);
    }
  } catch (error) {
    console.warn('Failed to validate recent files:', (error as Error).message);
  }
};

// ============================================================================
// Configuration Updates
// ============================================================================

/**
 * Updates user preferences
 */
export const updateUserPreferences = async (updates: Partial<UserPreferences>): Promise<void> => {
  const config = await readConfigFile();
  config.preferences = {
    ...config.preferences,
    ...validateUserPreferences(updates),
  };
  await writeConfigFile(config);
};

/**
 * Updates theme defaults
 */
export const updateThemeDefaults = async (updates: Partial<ThemeDefaults>): Promise<void> => {
  const config = await readConfigFile();
  config.themeDefaults = {
    ...config.themeDefaults,
    ...validateThemeDefaults(updates),
  };
  await writeConfigFile(config);
};

/**
 * Updates entire configuration using an updater function
 */
export const updateConfig = async (updater: (config: GeneratorConfig) => GeneratorConfig): Promise<GeneratorConfig> => {
  const config = await readConfigFile();
  const updatedConfig = updater(config);
  const validatedConfig = validateAndMigrateConfig(updatedConfig);
  await writeConfigFile(validatedConfig);
  return validatedConfig;
};

// ============================================================================
// Configuration Reset and Cleanup
// ============================================================================

/**
 * Resets configuration to defaults
 */
export const resetConfig = async (): Promise<GeneratorConfig> => {
  const defaultConfig = createDefaultConfig();
  await writeConfigFile(defaultConfig);
  return defaultConfig;
};

/**
 * Cleans up old configuration files and backups
 */
export const cleanupOldConfigs = async (): Promise<void> => {
  try {
    // Remove files older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      const backupStats = await fs.stat(BACKUP_FILE);
      if (backupStats.mtime < thirtyDaysAgo) {
        await fs.unlink(BACKUP_FILE);
      }
    } catch {
      // Backup file doesn't exist, that's fine
    }
  } catch (error) {
    console.warn('Failed to cleanup old configs:', (error as Error).message);
  }
};

// ============================================================================
// Export Configuration Utilities
// ============================================================================

export const configUtils = {
  readConfigFile,
  writeConfigFile,
  restoreFromBackup,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles,
  validateRecentFiles,
  updateUserPreferences,
  updateThemeDefaults,
  updateConfig,
  resetConfig,
  cleanupOldConfigs,
  createDefaultConfig,
} as const;

export default configUtils;