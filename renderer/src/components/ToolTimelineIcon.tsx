import React from 'react';
import { ServiceLogoFromTool } from './ServiceLogo';

interface ToolTimelineIconProps {
  /** Full tool name (e.g., 'mcp_composio_GMAIL_SEND_EMAIL') */
  toolName: string;
  /** Current status of the tool execution */
  status: 'running' | 'done' | 'error';
  /** Size in pixels (default: 24) */
  size?: number;
}

/**
 * Spinner component for running state
 */
const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" fill="none"/>
    <path d="M12 2C6.477 2 2 6.477 2 12" stroke="#D97757" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/**
 * Checkmark icon for done state
 */
const CheckIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * Error icon for error state
 */
const ErrorIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * ToolTimelineIcon - Shows service logo with execution status
 *
 * Visual states:
 * - Running: Animated pulse + spinner overlay
 * - Done: Logo + green checkmark badge
 * - Error: Logo + red X badge
 */
export const ToolTimelineIcon: React.FC<ToolTimelineIconProps> = ({
  toolName,
  status,
  size = 24,
}) => {
  const logoSize = Math.round(size * 0.65);
  const badgeSize = Math.round(size * 0.5);

  return (
    <div
      className={`relative flex items-center justify-center rounded-md transition-all duration-300 ${
        status === 'running'
          ? 'bg-accent/20 animate-pulse'
          : status === 'error'
          ? 'bg-red-500/10'
          : 'bg-green-500/10'
      }`}
      style={{ width: size, height: size }}
    >
      {status === 'running' ? (
        // Running: Show spinner
        <Spinner className="w-4 h-4 text-accent" />
      ) : (
        // Done/Error: Show logo with status badge
        <>
          <ServiceLogoFromTool
            toolName={toolName}
            size={logoSize}
            className="opacity-80"
          />

          {/* Status badge */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center ${
              status === 'error' ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: badgeSize, height: badgeSize }}
          >
            {status === 'error' ? (
              <ErrorIcon className="w-2 h-2 text-white" />
            ) : (
              <CheckIcon className="w-2 h-2 text-white" />
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * ToolTimelineIconSimple - A simpler version that just shows the logo
 * with a colored ring indicator
 */
export const ToolTimelineIconSimple: React.FC<ToolTimelineIconProps> = ({
  toolName,
  status,
  size = 24,
}) => {
  const ringColor = status === 'running'
    ? 'ring-accent'
    : status === 'error'
    ? 'ring-red-500'
    : 'ring-green-500';

  return (
    <div
      className={`flex items-center justify-center rounded-md ring-2 ${ringColor} ${
        status === 'running' ? 'animate-pulse' : ''
      } bg-card/50`}
      style={{ width: size, height: size }}
    >
      {status === 'running' ? (
        <Spinner className="w-4 h-4 text-accent" />
      ) : (
        <ServiceLogoFromTool
          toolName={toolName}
          size={Math.round(size * 0.7)}
        />
      )}
    </div>
  );
};

export default ToolTimelineIcon;
