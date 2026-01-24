/**
 * A2UI Renderer
 *
 * Main component that renders A2UI surfaces and components from streaming messages.
 * Handles surface creation, component updates, and data model management.
 */

import React, { useCallback, useMemo } from 'react';
import {
  A2UISurface,
  A2UIComponent,
  A2UIMessage,
  A2UIDataModel,
  A2UIEventHandler,
  isDataRef,
} from '../../types/a2ui';
import { componentCatalog } from './componentCatalog';

// ============================================================
// TYPES
// ============================================================

interface A2UIRendererProps {
  /** Map of surface ID to surface definition */
  surfaces: Map<string, A2UISurface>;
  /** Map of surface ID to data model */
  dataModels: Map<string, A2UIDataModel>;
  /** Event handler for user interactions */
  onEvent: A2UIEventHandler;
  /** Additional CSS classes */
  className?: string;
}

interface ComponentRendererProps {
  component: A2UIComponent;
  surfaceId: string;
  dataModel: A2UIDataModel;
  onEvent: A2UIEventHandler;
  components: Map<string, A2UIComponent>;
  renderChild: (childId: string) => React.ReactNode;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Resolve data references in props
 * Converts { dataRef: "/path/to/value" } to the actual value from data model
 */
function resolveDataRefs(obj: unknown, dataModel: A2UIDataModel): unknown {
  if (obj === null || obj === undefined) return obj;

  if (isDataRef(obj)) {
    return getValueByPath(dataModel, obj.dataRef);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveDataRefs(item, dataModel));
  }

  if (typeof obj === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveDataRefs(value, dataModel);
    }
    return resolved;
  }

  return obj;
}

/**
 * Get value from object by path string like "/companies/0/name"
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Deep merge two objects
 */
export function deepMerge(target: unknown, source: unknown): unknown {
  if (typeof source !== 'object' || source === null) return source;
  if (typeof target !== 'object' || target === null) return source;

  const result = { ...(target as Record<string, unknown>) };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    result[key] = deepMerge(
      (target as Record<string, unknown>)[key],
      (source as Record<string, unknown>)[key]
    );
  }
  return result;
}

// ============================================================
// COMPONENT RENDERER
// ============================================================

const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  component,
  surfaceId,
  dataModel,
  onEvent,
  components,
  renderChild,
}) => {
  const ComponentClass = componentCatalog[component.type];

  if (!ComponentClass) {
    console.warn(`Unknown A2UI component type: ${component.type}`);
    return (
      <div className="a2ui-unknown-component" data-type={component.type}>
        Unknown component: {component.type}
      </div>
    );
  }

  // Resolve data references in props
  const resolvedProps = resolveDataRefs(component.props, dataModel) as Record<
    string,
    unknown
  >;

  // Create event handler that sends events back
  const handleEvent = useCallback(
    (eventName: string, payload?: Record<string, unknown>) => {
      onEvent(surfaceId, eventName, payload);
    },
    [surfaceId, onEvent]
  );

  // Create child renderer
  const childRenderer = useCallback(
    (childId: string) => {
      const childComponent = components.get(childId);
      if (!childComponent) {
        console.warn(`Child component not found: ${childId}`);
        return null;
      }
      return (
        <ComponentRenderer
          key={childId}
          component={childComponent}
          surfaceId={surfaceId}
          dataModel={dataModel}
          onEvent={onEvent}
          components={components}
          renderChild={renderChild}
        />
      );
    },
    [components, surfaceId, dataModel, onEvent, renderChild]
  );

  return (
    <ComponentClass
      {...resolvedProps}
      onEvent={handleEvent}
      renderChild={childRenderer}
    />
  );
};

// ============================================================
// MAIN RENDERER
// ============================================================

const A2UIRenderer: React.FC<A2UIRendererProps> = ({
  surfaces,
  dataModels,
  onEvent,
  className = '',
}) => {
  // Memoize the component render function
  const renderComponent = useCallback(
    (
      component: A2UIComponent,
      surfaceId: string,
      dataModel: A2UIDataModel,
      allComponents: Map<string, A2UIComponent>
    ) => {
      return (
        <ComponentRenderer
          key={component.id}
          component={component}
          surfaceId={surfaceId}
          dataModel={dataModel}
          onEvent={onEvent}
          components={allComponents}
          renderChild={(childId: string) => {
            const childComponent = allComponents.get(childId);
            if (!childComponent) return null;
            return renderComponent(
              childComponent,
              surfaceId,
              dataModel,
              allComponents
            );
          }}
        />
      );
    },
    [onEvent]
  );

  // Render all surfaces
  const surfaceElements = useMemo(() => {
    return Array.from(surfaces.entries()).map(([surfaceId, surface]) => {
      const dataModel = dataModels.get(surfaceId) || {};
      const rootComponent = surface.components.get(surface.rootComponentId);

      if (!rootComponent) {
        console.warn(`Root component not found for surface: ${surfaceId}`);
        return null;
      }

      return (
        <div
          key={surfaceId}
          className="a2ui-surface"
          data-surface-id={surfaceId}
        >
          {renderComponent(
            rootComponent,
            surfaceId,
            dataModel,
            surface.components
          )}
        </div>
      );
    });
  }, [surfaces, dataModels, renderComponent]);

  return (
    <div className={`a2ui-renderer ${className}`}>
      {surfaceElements}
    </div>
  );
};

// ============================================================
// MESSAGE PROCESSOR
// ============================================================

/**
 * Process an A2UI message and update surfaces/data models
 * This is a pure function that returns new state
 */
export function processA2UIMessage(
  message: A2UIMessage,
  surfaces: Map<string, A2UISurface>,
  dataModels: Map<string, A2UIDataModel>
): {
  surfaces: Map<string, A2UISurface>;
  dataModels: Map<string, A2UIDataModel>;
} {
  const newSurfaces = new Map(surfaces);
  const newDataModels = new Map(dataModels);

  switch (message.type) {
    case 'createSurface': {
      const components = new Map<string, A2UIComponent>();
      let rootId = 'root';

      if (message.rootComponent) {
        components.set(message.rootComponent.id, message.rootComponent);
        rootId = message.rootComponent.id;

        // Add any child components
        const addChildren = (comp: A2UIComponent) => {
          if (comp.children) {
            for (const childId of comp.children) {
              const child = message.rootComponent?.props?.childComponents?.[
                childId
              ] as A2UIComponent | undefined;
              if (child) {
                components.set(childId, child);
                addChildren(child);
              }
            }
          }
        };
        addChildren(message.rootComponent);
      }

      newSurfaces.set(message.surfaceId, {
        id: message.surfaceId,
        catalogId: message.catalogId,
        components,
        rootComponentId: rootId,
      });

      // Initialize empty data model
      if (!newDataModels.has(message.surfaceId)) {
        newDataModels.set(message.surfaceId, {});
      }
      break;
    }

    case 'updateComponents': {
      const surface = newSurfaces.get(message.surfaceId);
      if (surface) {
        const newComponents = new Map(surface.components);
        for (const component of message.components) {
          newComponents.set(component.id, component);
        }
        newSurfaces.set(message.surfaceId, {
          ...surface,
          components: newComponents,
        });
      }
      break;
    }

    case 'updateData': {
      const currentData = newDataModels.get(message.surfaceId) || {};

      if (message.path === '/' || message.path === '') {
        // Replace entire data model
        if (message.merge) {
          newDataModels.set(
            message.surfaceId,
            deepMerge(currentData, message.value) as A2UIDataModel
          );
        } else {
          newDataModels.set(
            message.surfaceId,
            message.value as A2UIDataModel
          );
        }
      } else {
        // Update at specific path
        const parts = message.path.split('/').filter(Boolean);
        const newData = { ...currentData };
        let current: Record<string, unknown> = newData;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (current[part] === undefined || typeof current[part] !== 'object') {
            current[part] = {};
          } else {
            current[part] = { ...(current[part] as Record<string, unknown>) };
          }
          current = current[part] as Record<string, unknown>;
        }

        const lastPart = parts[parts.length - 1];
        if (message.merge && typeof current[lastPart] === 'object') {
          current[lastPart] = deepMerge(current[lastPart], message.value);
        } else {
          current[lastPart] = message.value;
        }

        newDataModels.set(message.surfaceId, newData);
      }
      break;
    }

    case 'deleteSurface': {
      newSurfaces.delete(message.surfaceId);
      newDataModels.delete(message.surfaceId);
      break;
    }
  }

  return { surfaces: newSurfaces, dataModels: newDataModels };
}

export default A2UIRenderer;
