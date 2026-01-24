/**
 * WorkflowPanel Component
 *
 * Displays the list of workflows in the right sidebar.
 * Uses localStorage for persistence with real-time updates via custom events.
 * Supports filtering, search, and favorites.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowFilter } from '../../types/workflow';
import WorkflowCard from './WorkflowCard';
import WorkflowInfoModal from './WorkflowInfoModal';
import { ICONS } from '../../constants';
import {
  getWorkflows,
  saveWorkflow,
  deleteWorkflow,
  toggleFavorite
} from '../../lib/workflowStorage';

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

  // Filter state
  const [filter, setFilter] = useState<WorkflowFilter>({
    search: '',
    status: 'all',
    favoritesOnly: false,
    tags: [],
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [infoWorkflow, setInfoWorkflow] = useState<Workflow | null>(null);

  /**
   * Load workflows from localStorage
   */
  const loadWorkflows = useCallback(() => {
    setIsLoading(true);
    try {
      const storedWorkflows = getWorkflows();
      setWorkflows(storedWorkflows);
    } catch (err) {
      console.error('Error loading workflows:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Listen for workflow events (created, updated, deleted)
  useEffect(() => {
    const handleWorkflowCreated = (e: CustomEvent<Workflow>) => {
      console.log('Workflow created event received:', e.detail);
      setWorkflows(prev => [...prev, e.detail]);
    };

    const handleWorkflowUpdated = (e: CustomEvent<Workflow>) => {
      console.log('Workflow updated event received:', e.detail);
      setWorkflows(prev =>
        prev.map(w => w.id === e.detail.id ? e.detail : w)
      );
    };

    const handleWorkflowDeleted = (e: CustomEvent<{ id: string }>) => {
      console.log('Workflow deleted event received:', e.detail);
      setWorkflows(prev => prev.filter(w => w.id !== e.detail.id));
    };

    window.addEventListener('workflow-created', handleWorkflowCreated as EventListener);
    window.addEventListener('workflow-updated', handleWorkflowUpdated as EventListener);
    window.addEventListener('workflow-deleted', handleWorkflowDeleted as EventListener);

    return () => {
      window.removeEventListener('workflow-created', handleWorkflowCreated as EventListener);
      window.removeEventListener('workflow-updated', handleWorkflowUpdated as EventListener);
      window.removeEventListener('workflow-deleted', handleWorkflowDeleted as EventListener);
    };
  }, []);

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
  const handleFavorite = useCallback((workflow: Workflow) => {
    toggleFavorite(workflow.id);
  }, []);

  /**
   * Handle workflow delete
   */
  const handleDelete = useCallback(
    (workflow: Workflow) => {
      if (!confirm(`Delete workflow "${workflow.name}"?`)) return;

      deleteWorkflow(workflow.id);

      // Clear selection if deleted
      if (selectedWorkflowId === workflow.id) {
        onSelectWorkflow?.(null);
      }
    },
    [selectedWorkflowId, onSelectWorkflow]
  );

  /**
   * Handle workflow edit
   */
  const handleEdit = useCallback((workflow: Workflow) => {
    // TODO: Open workflow editor
    console.log('Edit workflow:', workflow.id);
  }, []);

  /**
   * Handle workflow info view
   */
  const handleInfo = useCallback((workflow: Workflow) => {
    setInfoWorkflow(workflow);
  }, []);

  /**
   * Create test workflow (for development testing)
   */
  const handleCreateTestWorkflow = useCallback(() => {
    const testWorkflow: Workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Research & Summarize',
      description: 'Researches a topic and creates a comprehensive summary',
      icon: '🔬',
      status: 'active',
      goldenInstructions: 'Search the web for information on the given topic, analyze the results, and produce a well-structured summary.',
      steps: [
        { id: 'step_1', name: 'Search for information', description: 'Query web search for topic', tools: ['web_search'] },
        { id: 'step_2', name: 'Analyze results', description: 'Review and extract key points', tools: ['read', 'analyze'] },
        { id: 'step_3', name: 'Generate summary', description: 'Create structured summary', tools: ['write'] }
      ],
      variables: [
        { id: 'var_1', key: 'topic', name: 'Research Topic', type: 'string', required: true, description: 'The topic to research' },
        { id: 'var_2', key: 'depth', name: 'Research Depth', type: 'select', required: false, options: ['brief', 'moderate', 'comprehensive'] }
      ],
      tags: ['research', 'automation'],
      runCount: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveWorkflow(testWorkflow);
  }, []);

  /**
   * Filter workflows client-side
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

    // Status filter
    if (filter.status !== 'all' && workflow.status !== filter.status) {
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

  return (
    <div className={`workflow-panel ${className}`}>
      {/* Header */}
      <div className="workflow-panel__header">
        <span className="workflow-panel__title">Workflows</span>
        <span className="workflow-panel__count">{workflows.length}</span>
        <button
          onClick={handleCreateTestWorkflow}
          className="ml-auto p-1.5 text-secondaryText hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
          title="Create test workflow"
        >
          <ICONS.Plus />
        </button>
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
                    onInfo={handleInfo}
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
                    onInfo={handleInfo}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Modal */}
      {infoWorkflow && (
        <WorkflowInfoModal
          workflow={infoWorkflow}
          isOpen={!!infoWorkflow}
          onClose={() => setInfoWorkflow(null)}
          onRun={() => {
            handleRunWorkflow(infoWorkflow);
            setInfoWorkflow(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkflowPanel;
