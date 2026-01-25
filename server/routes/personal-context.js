/**
 * Personal Context Routes
 * 
 * Handles saving and loading user personal context to/from Supabase.
 * Personal context is injected into every conversation as system context.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/user/personal-context
 * 
 * Retrieves the user's personal context from Supabase.
 * Falls back to localStorage data if Supabase is not configured.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default-user';

    if (!supabase) {
      // Supabase not configured, return empty
      return res.json({
        success: true,
        data: null,
        message: 'Supabase not configured - using local storage only'
      });
    }

    // Fetch from Supabase user_profiles
    const { data, error } = await supabase
      .from('user_profiles')
      .select('personal_context, onboarding_completed_at, connected_tools')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user doesn't exist yet)
      throw error;
    }

    res.json({
      success: true,
      data: data ? {
        personalContext: data.personal_context,
        onboardingCompletedAt: data.onboarding_completed_at,
        connectedTools: data.connected_tools || []
      } : null
    });

  } catch (error) {
    console.error('Error fetching personal context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/user/personal-context
 * 
 * Saves the user's personal context to Supabase.
 * Creates or updates the user profile.
 */
router.put('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default-user';
    const { role, tasks, preferences, rawMarkdown } = req.body;

    if (!supabase) {
      // Supabase not configured, return success (client will use localStorage)
      return res.json({
        success: true,
        message: 'Supabase not configured - saved to local storage only'
      });
    }

    // Build the personal context object
    const personalContext = {
      role: role || '',
      tasks: tasks || [],
      preferences: preferences || '',
      rawMarkdown: rawMarkdown || generateMarkdown(role, tasks, preferences),
      updatedAt: new Date().toISOString()
    };

    // Upsert to Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        personal_context: personalContext,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        personalContext: data.personal_context
      }
    });

  } catch (error) {
    console.error('Error saving personal context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/user/onboarding-complete
 * 
 * Marks the onboarding as complete for the user.
 */
router.post('/onboarding-complete', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default-user';
    const { connectedTools } = req.body;

    if (!supabase) {
      return res.json({
        success: true,
        message: 'Supabase not configured - saved to local storage only'
      });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        onboarding_completed_at: new Date().toISOString(),
        connected_tools: connectedTools || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        onboardingCompletedAt: data.onboarding_completed_at,
        connectedTools: data.connected_tools
      }
    });

  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to generate markdown from structured context
 */
function generateMarkdown(role, tasks, preferences) {
  let md = '# Personal Context\n\n';
  
  if (role) {
    md += `## Role\n${role}\n\n`;
  }
  
  if (tasks && tasks.length > 0) {
    md += '## Common Tasks\n';
    tasks.forEach(task => {
      md += `- ${task}\n`;
    });
    md += '\n';
  }
  
  if (preferences) {
    md += `## Preferences & Notes\n${preferences}\n`;
  }
  
  return md;
}

export default router;
