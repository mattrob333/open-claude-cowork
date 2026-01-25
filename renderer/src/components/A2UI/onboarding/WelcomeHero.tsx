/**
 * WelcomeHero Component
 * 
 * A2UI component for the onboarding welcome screen.
 * Shows a warm greeting and introduces the setup process.
 */

import React from 'react';

interface WelcomeHeroProps {
  onEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  title?: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  skipLabel?: string;
  onCta?: string;
  onSkip?: string;
  showSkip?: boolean;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  onEvent,
  title = "Welcome to Hyper Gemini!",
  subtitle = "I'm your AI co-worker",
  description = "Let me help you get set up so I can actually be useful to you. This takes about 3 minutes and you'll be ready to go.",
  ctaLabel = "Let's Go",
  skipLabel = "Skip for now",
  onCta = "onContinue",
  onSkip = "onSkip",
  showSkip = true,
}) => {
  return (
    <div className="a2ui-welcome-hero">
      {/* Animated background gradient */}
      <div className="a2ui-welcome-hero__bg" />
      
      {/* Content */}
      <div className="a2ui-welcome-hero__content">
        {/* Icon/Logo */}
        <div className="a2ui-welcome-hero__icon">
          <span className="a2ui-welcome-hero__emoji">👋</span>
        </div>
        
        {/* Title */}
        <h1 className="a2ui-welcome-hero__title">{title}</h1>
        
        {/* Subtitle */}
        <p className="a2ui-welcome-hero__subtitle">{subtitle}</p>
        
        {/* Description */}
        <p className="a2ui-welcome-hero__description">{description}</p>
        
        {/* Features preview */}
        <div className="a2ui-welcome-hero__features">
          <div className="a2ui-welcome-hero__feature">
            <span className="a2ui-welcome-hero__feature-icon">🔗</span>
            <span>Connect your tools</span>
          </div>
          <div className="a2ui-welcome-hero__feature">
            <span className="a2ui-welcome-hero__feature-icon">🧠</span>
            <span>Personalize your experience</span>
          </div>
          <div className="a2ui-welcome-hero__feature">
            <span className="a2ui-welcome-hero__feature-icon">🚀</span>
            <span>Start being productive</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="a2ui-welcome-hero__actions">
          <button
            className="a2ui-welcome-hero__cta"
            onClick={() => onEvent(onCta)}
          >
            {ctaLabel}
            <span className="a2ui-welcome-hero__cta-arrow">→</span>
          </button>
          
          {showSkip && (
            <button
              className="a2ui-welcome-hero__skip"
              onClick={() => onEvent(onSkip)}
            >
              {skipLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeHero;
