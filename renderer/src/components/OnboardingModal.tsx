/**
 * OnboardingModal Component
 * 
 * Simple onboarding wizard for new users:
 * 1. Welcome screen explaining the tool
 * 2. Tool selection with checkboxes
 * 3. Connection links for selected tools
 */

import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'select-tools' | 'connect';

interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
  composioApp: string;
}

const AVAILABLE_TOOLS: Tool[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📧',
    description: 'Send and read emails',
    composioApp: 'gmail',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: '📅',
    description: 'Manage events and schedules',
    composioApp: 'googlecalendar',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Manage repos, issues, and PRs',
    composioApp: 'github',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    description: 'Send messages and notifications',
    composioApp: 'slack',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    description: 'Access docs and databases',
    composioApp: 'notion',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '📋',
    description: 'Track issues and projects',
    composioApp: 'linear',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: '📁',
    description: 'Access and manage files',
    composioApp: 'googledrive',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    icon: '📊',
    description: 'Read and write spreadsheets',
    composioApp: 'googlesheets',
  },
];

const ONBOARDING_COMPLETE_KEY = 'onboarding_completed';
const SELECTED_TOOLS_KEY = 'selected_tools';

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [connectionUrls, setConnectionUrls] = useState<Record<string, string>>({});
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('welcome');
      setSelectedTools([]);
      setConnectionUrls({});
    }
  }, [isOpen]);

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev =>
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTools.length === AVAILABLE_TOOLS.length) {
      setSelectedTools([]);
    } else {
      setSelectedTools(AVAILABLE_TOOLS.map(t => t.id));
    }
  };

  const handleContinueToConnect = async () => {
    if (selectedTools.length === 0) return;
    
    setIsLoadingUrls(true);
    setStep('connect');

    // Get connection URLs from Composio
    try {
      const urls: Record<string, string> = {};
      
      for (const toolId of selectedTools) {
        const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
        if (tool) {
          // Call backend to get Composio auth URL
          try {
            const response = await fetch(`http://localhost:3001/api/composio/auth-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ app: tool.composioApp }),
            });
            
            if (response.ok) {
              const data = await response.json();
              urls[toolId] = data.url;
            } else {
              // Fallback URL if API fails
              urls[toolId] = `https://app.composio.dev/apps/${tool.composioApp}`;
            }
          } catch {
            // Fallback URL
            urls[toolId] = `https://app.composio.dev/apps/${tool.composioApp}`;
          }
        }
      }
      
      setConnectionUrls(urls);
    } finally {
      setIsLoadingUrls(false);
    }
  };

  const handleComplete = () => {
    // Save selected tools and mark onboarding complete
    localStorage.setItem(SELECTED_TOOLS_KEY, JSON.stringify(selectedTools));
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-lg font-semibold text-primaryText">
                {step === 'welcome' && 'Welcome!'}
                {step === 'select-tools' && 'Select Your Tools'}
                {step === 'connect' && 'Connect Your Accounts'}
              </h2>
              <p className="text-sm text-secondaryText">
                {step === 'welcome' && 'Get started with your AI co-worker'}
                {step === 'select-tools' && 'Choose which tools to integrate'}
                {step === 'connect' && 'Click to authorize each tool'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondaryText hover:text-primaryText transition-colors p-1"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Welcome */}
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
                <span className="text-4xl">👋</span>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-primaryText">
                  Welcome to Your AI Co-Worker
                </h3>
                <p className="text-secondaryText leading-relaxed">
                  This tool uses the <strong>Claude Agent SDK</strong> and <strong>Composio</strong> to 
                  give you access to dozens of powerful integrations. Your AI assistant can send emails, 
                  manage calendars, create GitHub issues, and much more.
                </p>
                <p className="text-secondaryText leading-relaxed">
                  Let's connect some of your favorite tools so your AI co-worker can help you get things done.
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={handleSkip}
                  className="px-5 py-2.5 text-secondaryText hover:text-primaryText transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep('select-tools')}
                  className="px-6 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
                >
                  Let's Get Started →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Tools */}
          {step === 'select-tools' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-secondaryText text-sm">
                  Select the tools you'd like to connect:
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  {selectedTools.length === AVAILABLE_TOOLS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {AVAILABLE_TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolToggle(tool.id)}
                    className={`
                      p-3 rounded-xl border-2 text-left transition-all
                      ${selectedTools.includes(tool.id)
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50 bg-[#252525]'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{tool.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primaryText text-sm">
                            {tool.name}
                          </span>
                          {selectedTools.includes(tool.id) && (
                            <span className="text-accent">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-secondaryText truncate">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setStep('welcome')}
                  className="px-5 py-2.5 text-secondaryText hover:text-primaryText transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleContinueToConnect}
                  disabled={selectedTools.length === 0}
                  className="px-6 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue ({selectedTools.length} selected) →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connect */}
          {step === 'connect' && (
            <div className="space-y-4">
              {isLoadingUrls ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
                  <span className="ml-3 text-secondaryText">Getting connection links...</span>
                </div>
              ) : (
                <>
                  <p className="text-secondaryText text-sm">
                    Click each link below to connect your account. A new tab will open for authorization.
                  </p>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                    {selectedTools.map(toolId => {
                      const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
                      if (!tool) return null;
                      
                      return (
                        <a
                          key={toolId}
                          href={connectionUrls[toolId] || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-all group"
                        >
                          <span className="text-2xl">{tool.icon}</span>
                          <div className="flex-1">
                            <span className="font-medium text-primaryText">
                              Connect {tool.name}
                            </span>
                            <p className="text-xs text-secondaryText">
                              {tool.description}
                            </p>
                          </div>
                          <span className="text-accent group-hover:translate-x-1 transition-transform">
                            →
                          </span>
                        </a>
                      );
                    })}
                  </div>

                  <div className="bg-accent/10 rounded-xl p-4 text-sm">
                    <p className="text-primaryText">
                      <strong>💡 Tip:</strong> After connecting, return here and click "Done" to finish setup.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-between pt-4 border-t border-border">
                    <button
                      onClick={() => setStep('select-tools')}
                      className="px-5 py-2.5 text-secondaryText hover:text-primaryText transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleComplete}
                      className="px-6 py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
                    >
                      Done ✓
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
