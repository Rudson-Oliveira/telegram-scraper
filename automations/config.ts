/**
 * Configuration file for Telegram Scraper Automations
 * Manages environment variables and API credentials
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  // Manus Configuration
  manus: {
    apiKey: process.env.MANUS_API_KEY || '',
    userId: process.env.MANUS_USER_ID || '',
    apiUrl: process.env.MANUS_API_URL || 'https://tele-scrap-fgfuwhsp.manus.space/api/v1/',
  },

  // Gemini Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.0-flash-exp',
  },

  // Notion Configuration
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Obsidian Configuration
  obsidian: {
    vaultPath: process.env.OBSIDIAN_VAULT_PATH || '/home/ubuntu/obsidian-vault',
  },

  // Automation Settings
  automation: {
    classifierEnabled: process.env.AUTO_CLASSIFIER_ENABLED === 'true',
    notionSyncEnabled: process.env.AUTO_NOTION_SYNC_ENABLED === 'true',
    obsidianExportEnabled: process.env.AUTO_OBSIDIAN_EXPORT_ENABLED === 'true',
    monitorIntervalHours: parseInt(process.env.MONITOR_INTERVAL_HOURS || '6', 10),
  },

  // Perplexity API (optional)
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
  },
};

// Validate required configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.gemini.apiKey) {
    errors.push('GEMINI_API_KEY is required');
  }

  if (!config.supabase.url || !config.supabase.anonKey) {
    errors.push('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default config;
