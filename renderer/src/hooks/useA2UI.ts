/**
 * useA2UI Hook
 *
 * React hook for managing A2UI state.
 * Handles surface management, component updates, and data model management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  A2UISurface,
  A2UIMessage,
  A2UIDataModel,
  A2UIEventHandler,
  A2UIComponent,
} from '../types/a2ui';
import { processA2UIMessage } from '../components/A2UI/A2UIRenderer';

// ============================================================
// TYPES
// ============================================================

interface UseA2UIOptions {
  /** Initial surfaces */
  initialSurfaces?: Map<string, A2UISurface>;
  /** Initial data models */
  initialDataModels?: Map<string, A2UIDataModel>;
  /** Callback when an event is triggered from UI */
  onEvent?: A2UIEventHandler;
  /** Callback when surfaces change */
  onSurfacesChange?: (surfaces: Map<string, A2UISurface>) => void;
}

interface UseA2UIReturn {
  /** Current surfaces */
  surfaces: Map<string, A2UISurface>;
  /** Current data models */
  dataModels: Map<string, A2UIDataModel>;
  /** Whether streaming is in progress */
  isStreaming: boolean;
  /** Current error if any */
  error: string | null;

  /** Process an incoming A2UI message */
  processMessage: (message: A2UIMessage) => void;
  /** Process multiple messages at once */
  processMessages: (messages: A2UIMessage[]) => void;
  /** Handle event from UI component */
  handleEvent: A2UIEventHandler;
  /** Clear all surfaces */
  clearSurfaces: () => void;
  /** Delete a specific surface */
  deleteSurface: (surfaceId: string) => void;
  /** Update data at a specific path */
  updateData: (surfaceId: string, path: string, value: unknown, merge?: boolean) => void;
  /** Add or update a component */
  updateComponent: (surfaceId: string, component: A2UIComponent) => void;
  /** Set streaming state */
  setStreaming: (streaming: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useA2UI(options: UseA2UIOptions = {}): UseA2UIReturn {
  const {
    initialSurfaces = new Map(),
    initialDataModels = new Map(),
    onEvent,
    onSurfacesChange,
  } = options;

  // State
  const [surfaces, setSurfaces] = useState<Map<string, A2UISurface>>(initialSurfaces);
  const [dataModels, setDataModels] = useState<Map<string, A2UIDataModel>>(initialDataModels);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for tracking pending events to send back
  const pendingEventsRef = useRef<{
    surfaceId: string;
    eventName: string;
    payload?: Record<string, unknown>;
  }[]>([]);

  // Notify when surfaces change
  useEffect(() => {
    onSurfacesChange?.(surfaces);
  }, [surfaces, onSurfacesChange]);

  /**
   * Process an incoming A2UI message
   */
  const processMessage = useCallback((message: A2UIMessage) => {
    const result = processA2UIMessage(message, surfaces, dataModels);
    setSurfaces(result.surfaces);
    setDataModels(result.dataModels);
  }, [surfaces, dataModels]);

  /**
   * Process multiple messages at once (batch update)
   */
  const processMessages = useCallback((messages: A2UIMessage[]) => {
    let currentSurfaces = surfaces;
    let currentDataModels = dataModels;

    for (const message of messages) {
      const result = processA2UIMessage(message, currentSurfaces, currentDataModels);
      currentSurfaces = result.surfaces;
      currentDataModels = result.dataModels;
    }

    setSurfaces(currentSurfaces);
    setDataModels(currentDataModels);
  }, [surfaces, dataModels]);

  /**
   * Handle event from UI component
   */
  const handleEvent = useCallback<A2UIEventHandler>(
    (surfaceId, eventName, payload) => {
      // Add to pending events
      pendingEventsRef.current.push({ surfaceId, eventName, payload });

      // Call external handler if provided
      onEvent?.(surfaceId, eventName, payload);

      // Log for debugging
      console.debug('[A2UI Event]', { surfaceId, eventName, payload });
    },
    [onEvent]
  );

  /**
   * Clear all surfaces
   */
  const clearSurfaces = useCallback(() => {
    setSurfaces(new Map());
    setDataModels(new Map());
    setError(null);
  }, []);

  /**
   * Delete a specific surface
   */
  const deleteSurface = useCallback((surfaceId: string) => {
    setSurfaces(prev => {
      const next = new Map(prev);
      next.delete(surfaceId);
      return next;
    });
    setDataModels(prev => {
      const next = new Map(prev);
      next.delete(surfaceId);
      return next;
    });
  }, []);

  /**
   * Update data at a specific path
   */
  const updateData = useCallback(
    (surfaceId: string, path: string, value: unknown, merge = false) => {
      processMessage({
        type: 'updateData',
        surfaceId,
        path,
        value,
        merge,
      });
    },
    [processMessage]
  );

  /**
   * Add or update a component
   */
  const updateComponent = useCallback(
    (surfaceId: string, component: A2UIComponent) => {
      processMessage({
        type: 'updateComponents',
        surfaceId,
        components: [component],
      });
    },
    [processMessage]
  );

  /**
   * Set streaming state
   */
  const setStreaming = useCallback((streaming: boolean) => {
    setIsStreaming(streaming);
    if (!streaming) {
      // Clear pending events when streaming ends
      pendingEventsRef.current = [];
    }
  }, []);

  return {
    surfaces,
    dataModels,
    isStreaming,
    error,
    processMessage,
    processMessages,
    handleEvent,
    clearSurfaces,
    deleteSurface,
    updateData,
    updateComponent,
    setStreaming,
    setError,
  };
}

// ============================================================
// SSE INTEGRATION HELPER
// ============================================================

/**
 * Parse A2UI messages from SSE data
 */
export function parseA2UIFromSSE(data: string): A2UIMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === 'a2ui' && parsed.message) {
      return parsed.message as A2UIMessage;
    }
    // Also support direct A2UI messages
    if (['createSurface', 'updateComponents', 'updateData', 'deleteSurface'].includes(parsed.type)) {
      return parsed as A2UIMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a SSE stream handler for A2UI
 */
export function createA2UIStreamHandler(
  processMessage: (message: A2UIMessage) => void,
  setStreaming: (streaming: boolean) => void,
  setError: (error: string | null) => void
) {
  return {
    onMessage: (event: MessageEvent) => {
      const a2uiMessage = parseA2UIFromSSE(event.data);
      if (a2uiMessage) {
        processMessage(a2uiMessage);
      }
    },
    onOpen: () => {
      setStreaming(true);
      setError(null);
    },
    onError: (event: Event) => {
      console.error('[A2UI SSE Error]', event);
      setError('Connection error');
      setStreaming(false);
    },
    onClose: () => {
      setStreaming(false);
    },
  };
}

export default useA2UI;
