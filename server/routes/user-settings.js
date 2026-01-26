/**
 * User Settings Routes
 * 
 * Handles user settings including API key storage.
 * Keys are stored encrypted in Supabase.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = express.Router();

// Simple encryption for API keys (in production, use a proper KMS)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-32-chars-long!!';
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error('Decryption error:', e);
    return null;
  }
}

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// In-memory storage fallback for development
const inMemorySettings = new Map();

/**
 * GET /api/user/settings
 * Get user settings (without exposing actual keys)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    
    if (supabase) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return res.json({
          has_anthropic_key: !!data.anthropic_api_key,
          has_composio_key: !!data.composio_api_key,
          credits: data.credits || 0,
        });
      }
    } else {
      // In-memory fallback
      const settings = inMemorySettings.get(userId);
      if (settings) {
        return res.json({
          has_anthropic_key: !!settings.anthropic_api_key,
          has_composio_key: !!settings.composio_api_key,
          credits: settings.credits || 100,
        });
      }
    }

    // Return defaults
    res.json({
      has_anthropic_key: false,
      has_composio_key: false,
      credits: 100, // Free credits for new users
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/user/settings
 * Update user settings (API keys are encrypted)
 */
router.put('/', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { anthropic_api_key, composio_api_key } = req.body;

    const updates = {};
    if (anthropic_api_key) {
      updates.anthropic_api_key = encrypt(anthropic_api_key);
    }
    if (composio_api_key) {
      updates.composio_api_key = encrypt(composio_api_key);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    if (supabase) {
      // Check if user exists
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            ...updates,
            credits: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    } else {
      // In-memory fallback
      const existing = inMemorySettings.get(userId) || { credits: 100 };
      inMemorySettings.set(userId, { ...existing, ...updates });
    }

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * Get decrypted API key for a user (internal use only)
 */
export async function getUserApiKey(userId, keyType) {
  if (!supabase) {
    const settings = inMemorySettings.get(userId);
    if (settings && settings[keyType]) {
      return decrypt(settings[keyType]);
    }
    return null;
  }

  const { data } = await supabase
    .from('user_settings')
    .select(keyType)
    .eq('user_id', userId)
    .single();

  if (data && data[keyType]) {
    return decrypt(data[keyType]);
  }
  return null;
}

export default router;
