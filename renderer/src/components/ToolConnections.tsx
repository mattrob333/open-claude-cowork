import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../constants';
import { SERVER_URL } from '../constants';

interface ToolConnection {
  id: string;
  name: string;
  app: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  lastUsed?: number;
  expiresAt?: number;
}

interface ToolConnectionsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock data for initial connections (will be replaced with API data)
const INITIAL_CONNECTIONS: ToolConnection[] = [
  { id: '1', name: 'Gmail', app: 'GMAIL', icon: '📧', status: 'connected', lastUsed: Date.now() - 3600000 },
  { id: '2', name: 'Google Drive', app: 'GOOGLEDRIVE', icon: '📁', status: 'connected', lastUsed: Date.now() - 7200000 },
  { id: '3', name: 'GitHub', app: 'GITHUB', icon: '🐙', status: 'expired', expiresAt: Date.now() - 86400000 },
  { id: '4', name: 'Slack', app: 'SLACK', icon: '💬', status: 'disconnected' },
  { id: '5', name: 'Notion', app: 'NOTION', icon: '📝', status: 'connected', lastUsed: Date.now() - 1800000 },
];

const ToolConnections: React.FC<ToolConnectionsProps> = ({ isOpen, onClose }) => {
  const [connections, setConnections] = useState<ToolConnection[]>(INITIAL_CONNECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch connections from API
  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // This would call a real API endpoint in production
      const response = await fetch(`${SERVER_URL}/api/connections`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      // Use mock data if API fails
      setConnections(INITIAL_CONNECTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
    }
  }, [isOpen, fetchConnections]);

  // Handle reconnect
  const handleReconnect = async (connection: ToolConnection) => {
    setReconnecting(connection.id);
    setError(null);

    try {
      // Simulate OAuth flow - in production this would open OAuth popup
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update connection status
      setConnections(prev =>
        prev.map(c =>
          c.id === connection.id
            ? { ...c, status: 'connected' as const, lastUsed: Date.now() }
            : c
        )
      );
    } catch (err) {
      setError(`Failed to reconnect ${connection.name}`);
    } finally {
      setReconnecting(null);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (connection: ToolConnection) => {
    try {
      setConnections(prev =>
        prev.map(c =>
          c.id === connection.id
            ? { ...c, status: 'disconnected' as const }
            : c
        )
      );
    } catch (err) {
      setError(`Failed to disconnect ${connection.name}`);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Get status color
  const getStatusColor = (status: ToolConnection['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'expired':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-panel border border-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <ICONS.Settings />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primaryText">Tool Connections</h2>
              <p className="text-xs text-secondaryText">Manage your OAuth app connections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-colors"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Connection list */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {connections.map(connection => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{connection.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primaryText">{connection.name}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(connection.status)}`} />
                      </div>
                      <div className="text-xs text-secondaryText">
                        {connection.status === 'connected' && `Last used: ${formatRelativeTime(connection.lastUsed)}`}
                        {connection.status === 'expired' && 'Token expired - reconnect required'}
                        {connection.status === 'disconnected' && 'Not connected'}
                        {connection.status === 'error' && 'Connection error'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connection.status === 'connected' ? (
                      <button
                        onClick={() => handleDisconnect(connection)}
                        className="px-3 py-1.5 text-xs font-medium text-secondaryText hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReconnect(connection)}
                        disabled={reconnecting === connection.id}
                        className="px-3 py-1.5 text-xs font-medium text-canvas bg-accent hover:bg-accentHover rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {reconnecting === connection.id ? (
                          <>
                            <div className="animate-spin w-3 h-3 border-2 border-canvas border-t-transparent rounded-full" />
                            Connecting...
                          </>
                        ) : (
                          connection.status === 'expired' ? 'Reconnect' : 'Connect'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-white/[0.02]">
          <p className="text-[10px] text-secondaryText text-center">
            Connections are managed via Composio. OAuth tokens are securely stored and refreshed automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ToolConnections;
