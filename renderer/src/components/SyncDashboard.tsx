import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../constants';

// Types
interface SourceConnection {
  id: string;
  name: string;
  type: 'sharepoint' | 'google_drive' | 'onedrive' | 'dropbox' | 's3' | 'local';
  status: 'pending' | 'connected' | 'syncing' | 'error' | 'disabled';
  syncEnabled: boolean;
  lastSyncAt?: number;
  nextSyncAt?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

interface SyncJob {
  id: string;
  connectionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  filesDiscovered: number;
  filesProcessed: number;
  filesSkipped: number;
  startedAt: number;
  completedAt?: number;
  errors: Array<{ fileId: string; fileName: string; error: string }>;
}

interface SyncDashboardProps {
  onClose?: () => void;
}

// Connector type icons and colors
const CONNECTOR_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  sharepoint: {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M11.5 2C6.81 2 3 5.81 3 10.5c0 2.05.72 3.93 1.93 5.4l-.38.52c-.69.94-1.05 2.07-1.05 3.23V21h15v-1.35c0-1.16-.36-2.29-1.05-3.23l-.38-.52A8.49 8.49 0 0020 10.5C20 5.81 16.19 2 11.5 2z" fill="#036C70"/>
        <circle cx="11.5" cy="10.5" r="4.5" fill="#1A9BA1"/>
      </svg>
    ),
    color: '#036C70',
    label: 'SharePoint'
  },
  google_drive: {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M8 2L3 9H10L15 2H8Z" fill="#4285F4"/>
        <path d="M15 2L10 9H21L16 2H15Z" fill="#0F9D58"/>
        <path d="M3 9L8 22H19L14 9H3Z" fill="#FBBC05"/>
      </svg>
    ),
    color: '#4285F4',
    label: 'Google Drive'
  },
  onedrive: {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#0078D4"/>
      </svg>
    ),
    color: '#0078D4',
    label: 'OneDrive'
  },
  dropbox: {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M6 2L0 6L6 10L0 14L6 18L12 14L18 18L24 14L18 10L24 6L18 2L12 6L6 2Z" fill="#0061FF"/>
      </svg>
    ),
    color: '#0061FF',
    label: 'Dropbox'
  },
  s3: {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#FF9900"/>
        <path d="M12 2V22M2 7L12 12L22 7" stroke="white" strokeWidth="1" fill="none"/>
      </svg>
    ),
    color: '#FF9900',
    label: 'Amazon S3'
  },
  local: {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z"/>
      </svg>
    ),
    color: '#6B7280',
    label: 'Local Folder'
  }
};

// Status badge component
const StatusBadge: React.FC<{ status: SourceConnection['status'] }> = ({ status }) => {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
    connected: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Connected' },
    syncing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Syncing' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Error' },
    disabled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Disabled' }
  }[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.bg} ${config.text}`}>
      {status === 'syncing' && (
        <span className="inline-block w-2 h-2 mr-1 rounded-full bg-blue-400 animate-pulse" />
      )}
      {config.label}
    </span>
  );
};

/**
 * SyncDashboard Component
 *
 * Displays and manages document source connections and sync operations.
 */
const SyncDashboard: React.FC<SyncDashboardProps> = ({ onClose }) => {
  const [connections, setConnections] = useState<SourceConnection[]>([]);
  const [activeSyncs, setActiveSyncs] = useState<SyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<SourceConnection | null>(null);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) throw new Error('Failed to fetch connections');
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Fetch active syncs
  const fetchActiveSyncs = useCallback(async () => {
    try {
      const response = await fetch('/api/sources/syncs/active');
      if (!response.ok) throw new Error('Failed to fetch active syncs');
      const data = await response.json();
      setActiveSyncs(data.syncs || []);
    } catch (err) {
      console.error('Failed to fetch active syncs:', err);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchConnections(), fetchActiveSyncs()]);
      setIsLoading(false);
    };

    loadData();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchConnections();
      fetchActiveSyncs();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchConnections, fetchActiveSyncs]);

  // Trigger sync for a connection
  const triggerSync = async (connectionId: string, fullSync = false) => {
    try {
      const response = await fetch(`/api/sources/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start sync');
      }

      // Refresh data
      fetchConnections();
      fetchActiveSyncs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    }
  };

  // Cancel a sync
  const cancelSync = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/sources/${connectionId}/sync/cancel`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to cancel sync');

      fetchConnections();
      fetchActiveSyncs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel sync');
    }
  };

  // Test connection
  const testConnection = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/sources/${connectionId}/connect`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  // Delete connection
  const deleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const response = await fetch(`/api/sources/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete connection');

      fetchConnections();
      setSelectedConnection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection');
    }
  };

  // Format timestamp
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Get active sync for a connection
  const getActiveSync = (connectionId: string) => {
    return activeSyncs.find(s => s.connectionId === connectionId && s.status === 'running');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] rounded-xl shadow-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" strokeLinecap="round"/>
                <path d="M21 3V9H15" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 3L12 12" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Document Sources</h2>
              <p className="text-xs text-white/50">Manage connected sources and sync status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <ICONS.X />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Connections List */}
          <div className="w-1/2 border-r border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-bold uppercase text-white/50 tracking-wider">Connections</span>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-accent/10 text-accent text-xs font-medium rounded-lg hover:bg-accent/20 transition-colors flex items-center gap-1"
              >
                <ICONS.Plus />
                Add Source
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : connections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-white/30">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z"/>
                  </svg>
                  <span className="text-sm">No sources connected</span>
                </div>
              ) : (
                connections.map(conn => {
                  const connectorConfig = CONNECTOR_CONFIG[conn.type] || CONNECTOR_CONFIG.local;
                  const activeSync = getActiveSync(conn.id);

                  return (
                    <div
                      key={conn.id}
                      onClick={() => setSelectedConnection(conn)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedConnection?.id === conn.id
                          ? 'bg-white/5 border-accent/50'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${connectorConfig.color}20` }}
                        >
                          {connectorConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium text-white truncate">{conn.name}</h3>
                            <StatusBadge status={conn.status} />
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">{connectorConfig.label}</p>

                          {/* Sync Progress */}
                          {activeSync && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                                <span>Syncing files...</span>
                                <span>{activeSync.filesProcessed} / {activeSync.filesDiscovered}</span>
                              </div>
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent transition-all"
                                  style={{
                                    width: activeSync.filesDiscovered > 0
                                      ? `${(activeSync.filesProcessed / activeSync.filesDiscovered) * 100}%`
                                      : '0%'
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Last Sync */}
                          {!activeSync && conn.lastSyncAt && (
                            <p className="text-[10px] text-white/30 mt-1">
                              Last synced: {formatTime(conn.lastSyncAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Connection Details */}
          <div className="w-1/2 flex flex-col">
            {selectedConnection ? (
              <>
                <div className="px-4 py-3 border-b border-white/5">
                  <span className="text-xs font-bold uppercase text-white/50 tracking-wider">Details</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${CONNECTOR_CONFIG[selectedConnection.type]?.color || '#6B7280'}20` }}
                    >
                      {CONNECTOR_CONFIG[selectedConnection.type]?.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{selectedConnection.name}</h3>
                      <p className="text-xs text-white/50">
                        {CONNECTOR_CONFIG[selectedConnection.type]?.label || selectedConnection.type}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Status</span>
                      <StatusBadge status={selectedConnection.status} />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Sync Enabled</span>
                      <span className={`text-sm ${selectedConnection.syncEnabled ? 'text-green-400' : 'text-white/30'}`}>
                        {selectedConnection.syncEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Last Synced</span>
                      <span className="text-sm text-white/70">{formatTime(selectedConnection.lastSyncAt)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Created</span>
                      <span className="text-sm text-white/70">{formatTime(selectedConnection.createdAt)}</span>
                    </div>

                    {selectedConnection.errorMessage && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs font-bold text-red-400 uppercase mb-1">Error</p>
                        <p className="text-sm text-red-300">{selectedConnection.errorMessage}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 space-y-2">
                    {selectedConnection.status === 'connected' && (
                      <>
                        {getActiveSync(selectedConnection.id) ? (
                          <button
                            onClick={() => cancelSync(selectedConnection.id)}
                            className="w-full px-4 py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            Cancel Sync
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerSync(selectedConnection.id)}
                            className="w-full px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
                          >
                            Start Sync
                          </button>
                        )}
                        <button
                          onClick={() => triggerSync(selectedConnection.id, true)}
                          className="w-full px-4 py-2 bg-white/5 text-white/70 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
                        >
                          Full Resync
                        </button>
                      </>
                    )}

                    {selectedConnection.status === 'pending' && (
                      <button
                        onClick={() => testConnection(selectedConnection.id)}
                        className="w-full px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
                      >
                        Test Connection
                      </button>
                    )}

                    {selectedConnection.status === 'error' && (
                      <button
                        onClick={() => testConnection(selectedConnection.id)}
                        className="w-full px-4 py-2 bg-yellow-500/10 text-yellow-400 text-sm font-medium rounded-lg hover:bg-yellow-500/20 transition-colors"
                      >
                        Retry Connection
                      </button>
                    )}

                    <button
                      onClick={() => deleteConnection(selectedConnection.id)}
                      className="w-full px-4 py-2 bg-red-500/5 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Delete Connection
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/20">
                <div className="text-center">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M8 9H16M8 13H14M12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12C3 13.8 3.5 15.5 4.4 16.9L3 21L7.1 19.6C8.5 20.5 10.2 21 12 21Z"/>
                  </svg>
                  <p className="text-sm">Select a connection to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Syncs Bar */}
        {activeSyncs.length > 0 && (
          <div className="px-6 py-3 bg-accent/5 border-t border-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-accent">
                {activeSyncs.length} sync{activeSyncs.length > 1 ? 's' : ''} in progress
              </span>
            </div>
            <span className="text-xs text-white/50">
              {activeSyncs.reduce((sum, s) => sum + s.filesProcessed, 0)} files processed
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncDashboard;
