/**
 * ConnectionProgress Component
 * 
 * A2UI component showing live progress of tool connections.
 * Displays status for each tool being connected via OAuth.
 */

import React from 'react';

interface Connection {
  id: string;
  name: string;
  icon: string;
  status: 'pending' | 'connecting' | 'connected' | 'failed';
  error?: string;
}

interface ConnectionProgressProps {
  onEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  connections?: Connection[];
  title?: string;
  subtitle?: string;
  onRetry?: string;
  onContinue?: string;
  onSkipFailed?: string;
  continueLabel?: string;
}

export const ConnectionProgress: React.FC<ConnectionProgressProps> = ({
  onEvent,
  connections = [],
  title = "Connecting your tools...",
  subtitle = "Please complete the login for each service when prompted.",
  onRetry = 'onRetryConnection',
  onContinue = 'onContinue',
  onSkipFailed = 'onSkipFailed',
  continueLabel = "Continue",
}) => {
  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const failedCount = connections.filter(c => c.status === 'failed').length;
  const pendingCount = connections.filter(c => c.status === 'pending' || c.status === 'connecting').length;
  const allDone = pendingCount === 0;
  const hasFailures = failedCount > 0;

  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'connected': return '✓';
      case 'failed': return '✗';
      case 'connecting': return '○';
      default: return '○';
    }
  };

  const getStatusClass = (status: Connection['status']) => {
    switch (status) {
      case 'connected': return 'a2ui-connection-progress__item--connected';
      case 'failed': return 'a2ui-connection-progress__item--failed';
      case 'connecting': return 'a2ui-connection-progress__item--connecting';
      default: return 'a2ui-connection-progress__item--pending';
    }
  };

  return (
    <div className="a2ui-connection-progress">
      {/* Header */}
      <div className="a2ui-connection-progress__header">
        <h2 className="a2ui-connection-progress__title">
          {allDone ? (
            hasFailures ? '⚠️ Some connections failed' : '✅ All connected!'
          ) : (
            <>
              <span className="a2ui-connection-progress__spinner" />
              {title}
            </>
          )}
        </h2>
        <p className="a2ui-connection-progress__subtitle">
          {allDone 
            ? `${connectedCount} of ${connections.length} tools connected successfully.`
            : subtitle
          }
        </p>
      </div>

      {/* Progress bar */}
      <div className="a2ui-connection-progress__bar">
        <div 
          className="a2ui-connection-progress__bar-fill"
          style={{ width: `${(connectedCount / connections.length) * 100}%` }}
        />
      </div>

      {/* Connection list */}
      <div className="a2ui-connection-progress__list">
        {connections.map((connection) => (
          <div 
            key={connection.id}
            className={`a2ui-connection-progress__item ${getStatusClass(connection.status)}`}
          >
            <span className="a2ui-connection-progress__item-icon">
              {connection.icon}
            </span>
            <span className="a2ui-connection-progress__item-name">
              {connection.name}
            </span>
            <span className="a2ui-connection-progress__item-status">
              {connection.status === 'connecting' && (
                <span className="a2ui-connection-progress__item-spinner" />
              )}
              <span className={`a2ui-connection-progress__item-indicator`}>
                {getStatusIcon(connection.status)}
              </span>
            </span>
            {connection.status === 'failed' && (
              <button
                className="a2ui-connection-progress__retry"
                onClick={() => onEvent(onRetry, { toolId: connection.id })}
              >
                Retry
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Error message for failures */}
      {hasFailures && allDone && (
        <div className="a2ui-connection-progress__error">
          <p>Don't worry — you can connect these tools later from Settings.</p>
        </div>
      )}

      {/* Actions */}
      {allDone && (
        <div className="a2ui-connection-progress__actions">
          {hasFailures && (
            <button
              className="a2ui-connection-progress__skip"
              onClick={() => onEvent(onSkipFailed)}
            >
              Skip failed connections
            </button>
          )}
          <button
            className="a2ui-connection-progress__continue"
            onClick={() => onEvent(onContinue)}
          >
            {continueLabel}
            <span className="a2ui-connection-progress__continue-arrow">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionProgress;
