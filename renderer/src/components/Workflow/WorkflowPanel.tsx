/**
 * WorkflowPanel Component
 *
 * Displays the list of workflows in the right sidebar.
 * Supports filtering, search, and favorites.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowFilter } from '../../types/workflow';
import WorkflowCard from './WorkflowCard';
import { ICONS } from '../../constants';
import { SERVER_URL } from '../../constants';

interface WorkflowPanelProps {
  onRunWorkflow?: (workflow: Workflow) => void;
  onSelectWorkflow?: (workflow: Workflow | null) => void;
  selectedWorkflowId?: string | null;
  className?: string;
}

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  onRunWorkflow,
  onSelectWorkflow,
  selectedWorkflowId,
  className = '',
}) => {
  // State
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<WorkflowFilter>({
    search: '',
    status: 'all',
    favoritesOnly: false,
    tags: [],
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Fetch workflows from API
   */
  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter.search) params.set('search', filter.search);
      if (filter.status !== 'all') params.set('status', filter.status);
      if (filter.favoritesOnly) params.set('favorites', 'true');
      if (filter.tags.length > 0) params.set('tags', filter.tags.join(','));

      const response = await fetch(
        `${SERVER_URL}/api/workflows?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Fetch workflows on mount and when filter changes
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  /**
   * Handle workflow selection
   */
  const handleSelectWorkflow = useCallback(
    (workflow: Workflow) => {
      if (selectedWorkflowId === workflow.id) {
        onSelectWorkflow?.(null);
      } else {
        onSelectWorkflow?.(workflow);
      }
    },
    [selectedWorkflowId, onSelectWorkflow]
  );

  /**
   * Handle workflow run
   */
  const handleRunWorkflow = useCallback(
    (workflow: Workflow) => {
      onRunWorkflow?.(workflow);
    },
    [onRunWorkflow]
  );

  /**
   * Handle favorite toggle
   */
  const handleFavorite = useCallback(
    async (workflow: Workflow) => {
      try {
        await fetch(`${SERVER_URL}/api/workflows/${workflow.id}/favorite`, {
          method: 'POST',
        });
        // Refresh workflows
        fetchWorkflows();
      } catch (err) {
        console.error('Error toggling favorite:', err);
      }
    },
    [fetchWorkflows]
  );

  /**
   * Handle workflow delete
   */
  const handleDelete = useCallback(
    async (workflow: Workflow) => {
      if (!confirm(`Delete workflow "${workflow.name}"?`)) return;

      try {
        await fetch(`${SERVER_URL}/api/workflows/${workflow.id}`, {
          method: 'DELETE',
        });
        // Refresh workflows
        fetchWorkflows();
        // Clear selection if deleted
        if (selectedWorkflowId === workflow.id) {
          onSelectWorkflow?.(null);
        }
      } catch (err) {
        console.error('Error deleting workflow:', err);
      }
    },
    [fetchWorkflows, selectedWorkflowId, onSelectWorkflow]
  );

  /**
   * Handle workflow edit
   */
  const handleEdit = useCallback((workflow: Workflow) => {
    // TODO: Open workflow editor
    console.log('Edit workflow:', workflow.id);
  }, []);

  /**
   * Filter workflows client-side (for immediate feedback)
   */
  const filteredWorkflows = workflows.filter(workflow => {
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (
        !workflow.name.toLowerCase().includes(searchLower) &&
        !workflow.description?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Favorites filter
    if (filter.favoritesOnly && !workflow.isFavorite) {
      return false;
    }

    return true;
  });

  // Group workflows by favorites
  const favoriteWorkflows = filteredWorkflows.filter(w => w.isFavorite);
  const otherWorkflows = filteredWorkflows.filter(w => !w.isFavorite);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`workflow-panel ${className}`}>
        <div className="workflow-panel__header">
          <span className="workflow-panel__title">Workflows</span>
        </div>
        <div className="workflow-panel__loading">
          <ICONS.Loader />
          <span>Loading workflows...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`workflow-panel ${className}`}>
        <div className="workflow-panel__header">
          <span className="workflow-panel__title">Workflows</span>
        </div>
        <div className="workflow-panel__error">
          <ICONS.AlertCircle />
          <span>{error}</span>
          <button onClick={fetchWorkflows}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`workflow-panel ${className}`}>
      {/* Header */}
      <div className="workflow-panel__header">
        <span className="workflow-panel__title">Workflows</span>
        <span className="workflow-panel__count">{workflows.length}</span>
      </div>

      {/* Search & Filter Bar */}
      <div className="workflow-panel__toolbar">
        <div className="workflow-panel__search">
          <input
            type="text"
            placeholder="Search workflows..."
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
          {filter.search && (
            <button
              className="workflow-panel__search-clear"
              onClick={() => setFilter(f => ({ ...f, search: '' }))}
            >
              <ICONS.X />
            </button>
          )}
        </div>

        <div className="workflow-panel__filter-buttons">
          <button
            className={`workflow-panel__filter-btn ${
              filter.favoritesOnly ? 'workflow-panel__filter-btn--active' : ''
            }`}
            onClick={() =>
              setFilter(f => ({ ...f, favoritesOnly: !f.favoritesOnly }))
            }
            title="Show favorites only"
          >
            ★
          </button>

          <button
            className={`workflow-panel__filter-btn ${
              showFilters ? 'workflow-panel__filter-btn--active' : ''
            }`}
            onClick={() => setShowFilters(!showFilters)}
            title="More filters"
          >
            <ICONS.Filter />
          </button>
        </div>
      </div>

      {/* Extended Filters */}
      {showFilters && (
        <div className="workflow-panel__filters">
          <div className="workflow-panel__filter-group">
            <label>Status</label>
            <select
              value={filter.status}
              onChange={e =>
                setFilter(f => ({
                  ...f,
                  status: e.target.value as WorkflowFilter['status'],
                }))
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      )}

      {/* Workflow List */}
      <div className="workflow-panel__list">
        {filteredWorkflows.length === 0 ? (
          <div className="workflow-panel__empty">
            {filter.search || filter.favoritesOnly ? (
              <>
                <span>No workflows match your filters</span>
                <button
                  onClick={() =>
                    setFilter({
                      search: '',
                      status: 'all',
                      favoritesOnly: false,
                      tags: [],
                    })
                  }
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <span className="workflow-panel__empty-icon">📋</span>
                <span>No workflows yet</span>
                <p>
                  Chat with the assistant and click "Save as Workflow" to create
                  reusable workflows.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Favorites Section */}
            {favoriteWorkflows.length > 0 && (
              <div className="workflow-panel__section">
                <h3 className="workflow-panel__section-title">
                  <span>⭐ Favorites</span>
                  <span className="workflow-panel__section-count">
                    {favoriteWorkflows.length}
                  </span>
                </h3>
                {favoriteWorkflows.map(workflow => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    isSelected={selectedWorkflowId === workflow.id}
                    onSelect={handleSelectWorkflow}
                    onRun={handleRunWorkflow}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onFavorite={handleFavorite}
                  />
                ))}
              </div>
            )}

            {/* Other Workflows Section */}
            {otherWorkflows.length > 0 && (
              <div className="workflow-panel__section">
                {favoriteWorkflows.length > 0 && (
                  <h3 className="workflow-panel__section-title">
                    <span>All Workflows</span>
                    <span className="workflow-panel__section-count">
                      {otherWorkflows.length}
                    </span>
                  </h3>
                )}
                {otherWorkflows.map(workflow => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    isSelected={selectedWorkflowId === workflow.id}
                    onSelect={handleSelectWorkflow}
                    onRun={handleRunWorkflow}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onFavorite={handleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowPanel;
