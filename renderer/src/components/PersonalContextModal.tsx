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

interface PersonalContext {
  role: string;
  tasks: string[];
  preferences: string;
  rawMarkdown?: string;
}

const TASK_OPTIONS = [
  { value: 'email', label: 'Write emails', icon: '📧' },
  { value: 'research', label: 'Research', icon: '🔍' },
  { value: 'planning', label: 'Planning', icon: '📋' },
  { value: 'coding', label: 'Code', icon: '💻' },
  { value: 'sales', label: 'Sales calls', icon: '📞' },
  { value: 'content', label: 'Create content', icon: '✍️' },
  { value: 'analysis', label: 'Data analysis', icon: '📊' },
  { value: 'meetings', label: 'Meeting prep', icon: '🎯' },
  { value: 'docs', label: 'Documentation', icon: '📝' },
  { value: 'social', label: 'Social media', icon: '📱' },
];

const LOCAL_STORAGE_KEY = 'personal_context';

const PersonalContextModal: React.FC<PersonalContextModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [context, setContext] = useState<PersonalContext>({
    role: '',
    tasks: [],
    preferences: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setContext(JSON.parse(localData));
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
          setContext(serverContext);
          // Update local cache
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverContext));
        }
      }
    } catch (err) {
      console.error('Error loading personal context:', err);
      // Don't show error if we have local data
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!localData) {
        setError('Failed to load personal context');
      }
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(context));

      // Then sync to backend
      const response = await fetch('/api/user/personal-context', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'default-user', // TODO: Get from auth context
        },
        body: JSON.stringify(context),
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

  const handleTaskToggle = (taskValue: string) => {
    setContext(prev => ({
      ...prev,
      tasks: prev.tasks.includes(taskValue)
        ? prev.tasks.filter(t => t !== taskValue)
        : [...prev.tasks, taskValue],
    }));
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
              <p className="text-sm text-secondaryText">Help me understand how to help you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-all"
          >
            <ICONS.X />
          </button>
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
              {/* Role input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-primaryText">
                  What's your role?
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-canvas border border-border rounded-xl text-primaryText placeholder-secondaryText focus:outline-none focus:border-accent transition-colors"
                  placeholder="e.g., Product Manager at a startup"
                  value={context.role}
                  onChange={(e) => setContext(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>

              {/* Tasks selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-primaryText">
                  What do you do most often?
                  <span className="ml-2 text-xs font-normal text-secondaryText">(pick a few)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TASK_OPTIONS.map((option) => {
                    const isSelected = context.tasks.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-accent/15 border border-accent text-accent'
                            : 'bg-canvas border border-border text-secondaryText hover:border-accent/50 hover:text-primaryText'
                        }`}
                        onClick={() => handleTaskToggle(option.value)}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferences textarea */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-primaryText">
                  Anything else I should know?
                  <span className="ml-2 text-xs font-normal text-secondaryText">(optional)</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-canvas border border-border rounded-xl text-primaryText placeholder-secondaryText focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="e.g., I prefer concise responses. I work on B2B SaaS products. My team uses agile methodology..."
                  rows={4}
                  value={context.preferences}
                  onChange={(e) => setContext(prev => ({ ...prev, preferences: e.target.value }))}
                />
              </div>

              {/* Preview */}
              {(context.role || context.tasks.length > 0 || context.preferences) && (
                <div className="bg-canvas border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-hover/50 border-b border-border">
                    <span>📄</span>
                    <span className="text-xs font-semibold text-secondaryText uppercase tracking-wide">
                      Context Preview
                    </span>
                  </div>
                  <div className="p-4 text-sm text-secondaryText space-y-2">
                    {context.role && (
                      <p><span className="text-primaryText font-medium">Role:</span> {context.role}</p>
                    )}
                    {context.tasks.length > 0 && (
                      <p>
                        <span className="text-primaryText font-medium">Common tasks:</span>{' '}
                        {context.tasks.map(t => {
                          const opt = TASK_OPTIONS.find(o => o.value === t);
                          return opt?.label || t;
                        }).join(', ')}
                      </p>
                    )}
                    {context.preferences && (
                      <p><span className="text-primaryText font-medium">Preferences:</span> {context.preferences}</p>
                    )}
                  </div>
                </div>
              )}

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
