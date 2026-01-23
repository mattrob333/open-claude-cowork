import { useState, useCallback, useEffect } from 'react';
import { Workflow } from '../types';
import { getWorkflows, saveWorkflow } from '../services/chatService';

interface UseWorkflowsReturn {
  workflows: Workflow[];
  isLoading: boolean;
  error: string | null;
  loadWorkflows: () => Promise<void>;
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt'>) => Promise<Workflow>;
}

export function useWorkflows(): UseWorkflowsReturn {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWorkflows();
      setWorkflows(data as Workflow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
      console.error('Failed to load workflows:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (workflow: Omit<Workflow, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await saveWorkflow(workflow) as Workflow;
      setWorkflows(prev => [...prev, result]);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workflow';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return {
    workflows,
    isLoading,
    error,
    loadWorkflows,
    createWorkflow
  };
}
