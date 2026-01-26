/**
 * PersonalContextModal Component
 * 
 * Modal for viewing and editing the user's personal context.
 * Syncs with Supabase and caches locally.
 */

import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface PersonalContextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOCAL_STORAGE_KEY = 'personal_context';

// AI context template prompt - general purpose for work and life
const AI_CONTEXT_TEMPLATE = `Create a comprehensive personal context profile for me that I can use with an AI assistant. This should cover all aspects of my life where I might need AI help. Include the following sections:

## About Me
- My name and background
- Key interests, skills, and expertise
- Current life situation and priorities

## Communication Preferences
- How I like to receive information (concise vs detailed)
- Tone preferences (formal, casual, direct)
- Any specific formatting I prefer

## Areas I Need Help With
- Professional tasks and goals
- Personal projects and interests
- Regular activities or routines

## Important Context
- Key people in my life (family, colleagues, etc.)
- Goals I'm working toward
- Constraints or considerations to keep in mind

## My Style
- Writing tone and voice
- Decision-making approach
- Values and principles that matter to me

Please ask me questions to gather this information, then format it as a clean markdown document I can paste into my AI assistant.`;

const PersonalContextModal: React.FC<PersonalContextModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [contextText, setContextText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPromptCopied, setShowPromptCopied] = useState(false);

  // Load context on open
  useEffect(() => {
    if (isOpen) {
      loadContext();
    }
  }, [isOpen]);

  const loadContext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First try to load from localStorage
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        setContextText(localData);
      }

      // Then try to fetch from backend (source of truth)
      const response = await fetch('/api/user/personal-context', {
        headers: {
          'x-user-id': 'default-user', // TODO: Get from auth context
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.personalContext) {
          const serverContext = data.data.personalContext;
          // Handle both old format (object) and new format (string)
          const text = typeof serverContext === 'string' 
            ? serverContext 
            : serverContext.rawMarkdown || serverContext.preferences || '';
          setContextText(text);
          localStorage.setItem(LOCAL_STORAGE_KEY, text);
        }
      }
    } catch (err) {
      console.error('Error loading personal context:', err);
      // Silently fail - localStorage will be used as fallback
    } finally {
      setIsLoading(false);
    }
  };

  const saveContext = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Save to localStorage first (immediate)
      localStorage.setItem(LOCAL_STORAGE_KEY, contextText);

      // Then sync to backend
      const response = await fetch('/api/user/personal-context', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'default-user', // TODO: Get from auth context
        },
        body: JSON.stringify({ rawMarkdown: contextText }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to server');
      }

      setSuccessMessage('Personal context saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving personal context:', err);
      setError('Saved locally, but failed to sync to server');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border border-border rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h2 className="text-lg font-bold text-primaryText">Personal Context</h2>
              <p className="text-sm text-secondaryText">Tell me about yourself so I can help you better</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(AI_CONTEXT_TEMPLATE);
                setShowPromptCopied(true);
                setTimeout(() => setShowPromptCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-all"
              title="Copy a template prompt to use with any AI to generate your personal context"
            >
              {showPromptCopied ? (
                <>✓ Copied!</>
              ) : (
                <>📋 Copy AI Context Template</>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-all"
            >
              <ICONS.X />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="animate-spin text-accent"><ICONS.Loader /></span>
              <span className="ml-3 text-secondaryText">Loading...</span>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                <p className="text-sm text-secondaryText">
                  <span className="text-accent font-medium">Tip:</span> Click "Copy AI Context Template" above, paste it into ChatGPT or Claude, answer the questions, then paste the result here.
                </p>
              </div>

              {/* Main text area */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-primaryText">
                  Your Personal Context
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-canvas border border-border rounded-xl text-primaryText placeholder-secondaryText focus:outline-none focus:border-accent transition-colors resize-none font-mono text-sm"
                  placeholder="Paste your personal context here...\n\nThis can include anything about you:\n- Who you are and what you do\n- Your communication preferences\n- Goals and priorities\n- Writing style\n- Important context about your life\n\nThe AI will use this to personalize responses."
                  rows={14}
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                />
                <p className="text-xs text-secondaryText">
                  {contextText.length > 0 ? `${contextText.length} characters` : 'No context added yet'}
                </p>
              </div>

              {/* Messages */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                  {successMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-secondaryText hover:text-primaryText transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveContext}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin w-4 h-4"><ICONS.Loader /></span>
                Saving...
              </>
            ) : (
              'Save Context'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalContextModal;
