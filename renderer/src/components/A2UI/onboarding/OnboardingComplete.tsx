/**
 * OnboardingComplete Component
 * 
 * A2UI component for the onboarding completion screen.
 * Shows summary of setup and suggested first actions.
 */

import React from 'react';

interface Suggestion {
  text: string;
  prompt?: string;
  icon?: string;
}

interface OnboardingCompleteProps {
  onEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  toolsConnected?: number;
  totalTools?: number;
  contextSaved?: boolean;
  userName?: string;
  suggestions?: Suggestion[];
  onStartChatting?: string;
  onTrySuggestion?: string;
  title?: string;
  ctaLabel?: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { 
    text: 'Draft an email to a colleague about a project update',
    prompt: 'Help me draft an email to my team about our project progress',
    icon: '📧'
  },
  { 
    text: 'Summarize my unread emails from today',
    prompt: 'Summarize my unread emails and highlight anything urgent',
    icon: '📬'
  },
  { 
    text: 'Create a meeting agenda for my next standup',
    prompt: 'Help me create an agenda for our team standup meeting',
    icon: '📋'
  },
  { 
    text: 'Research a topic and give me a summary',
    prompt: 'Research [topic] and give me a concise summary with key points',
    icon: '🔍'
  },
];

export const OnboardingComplete: React.FC<OnboardingCompleteProps> = ({
  onEvent,
  toolsConnected = 0,
  totalTools = 0,
  contextSaved = false,
  userName,
  suggestions = DEFAULT_SUGGESTIONS,
  onStartChatting = 'onStartChatting',
  onTrySuggestion = 'onTrySuggestion',
  title = "You're all set!",
  ctaLabel = "Start Chatting",
}) => {
  const handleTrySuggestion = (suggestion: Suggestion) => {
    onEvent(onTrySuggestion, { 
      text: suggestion.text,
      prompt: suggestion.prompt || suggestion.text 
    });
  };

  return (
    <div className="a2ui-onboarding-complete">
      {/* Celebration */}
      <div className="a2ui-onboarding-complete__celebration">
        <div className="a2ui-onboarding-complete__confetti">🎉</div>
        <h1 className="a2ui-onboarding-complete__title">{title}</h1>
        {userName && (
          <p className="a2ui-onboarding-complete__greeting">
            Nice to meet you, {userName}!
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="a2ui-onboarding-complete__summary">
        <div className="a2ui-onboarding-complete__summary-item a2ui-onboarding-complete__summary-item--success">
          <span className="a2ui-onboarding-complete__summary-icon">✓</span>
          <span className="a2ui-onboarding-complete__summary-text">
            {toolsConnected > 0 
              ? `${toolsConnected} tool${toolsConnected !== 1 ? 's' : ''} connected`
              : 'No tools connected yet'
            }
          </span>
        </div>
        <div className={`a2ui-onboarding-complete__summary-item ${contextSaved ? 'a2ui-onboarding-complete__summary-item--success' : ''}`}>
          <span className="a2ui-onboarding-complete__summary-icon">
            {contextSaved ? '✓' : '○'}
          </span>
          <span className="a2ui-onboarding-complete__summary-text">
            {contextSaved ? 'Personal context saved' : 'Personal context not set'}
          </span>
        </div>
      </div>

      {/* Suggestions */}
      <div className="a2ui-onboarding-complete__suggestions">
        <h3 className="a2ui-onboarding-complete__suggestions-title">
          Quick things you can try:
        </h3>
        <div className="a2ui-onboarding-complete__suggestions-list">
          {suggestions.slice(0, 4).map((suggestion, index) => (
            <button
              key={index}
              className="a2ui-onboarding-complete__suggestion"
              onClick={() => handleTrySuggestion(suggestion)}
            >
              {suggestion.icon && (
                <span className="a2ui-onboarding-complete__suggestion-icon">
                  {suggestion.icon}
                </span>
              )}
              <span className="a2ui-onboarding-complete__suggestion-text">
                "{suggestion.text}"
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="a2ui-onboarding-complete__actions">
        <button
          className="a2ui-onboarding-complete__cta"
          onClick={() => onEvent(onStartChatting)}
        >
          {ctaLabel}
          <span className="a2ui-onboarding-complete__cta-arrow">→</span>
        </button>
      </div>

      {/* Tips */}
      <div className="a2ui-onboarding-complete__tips">
        <p>
          💡 <strong>Tip:</strong> You can always connect more tools or update your 
          context from the Settings menu.
        </p>
      </div>
    </div>
  );
};

export default OnboardingComplete;
