import React from 'react';
import { ServiceLogo } from './ServiceLogo';

interface WorkflowServiceLogosProps {
  /** Array of service names (e.g., ['gmail', 'slack', 'github']) */
  services: string[];
  /** Maximum number of logos to show before showing +N (default: 3) */
  maxVisible?: number;
  /** Size of each logo in pixels (default: 20) */
  size?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * WorkflowServiceLogos - Displays stacked service logos for a workflow
 *
 * Shows up to maxVisible logos stacked horizontally with overlap,
 * plus a "+N" indicator if there are more services than maxVisible.
 */
export const WorkflowServiceLogos: React.FC<WorkflowServiceLogosProps> = ({
  services,
  maxVisible = 3,
  size = 20,
  className = '',
}) => {
  if (!services || services.length === 0) {
    return null;
  }

  const visibleServices = services.slice(0, maxVisible);
  const remainingCount = services.length - maxVisible;
  const overlap = size * 0.35; // 35% overlap

  return (
    <div className={`flex items-center ${className}`}>
      {/* Stacked logos */}
      <div className="flex items-center" style={{ marginRight: remainingCount > 0 ? 4 : 0 }}>
        {visibleServices.map((service, index) => (
          <div
            key={service}
            className="rounded-full bg-card border border-border flex items-center justify-center"
            style={{
              width: size + 4,
              height: size + 4,
              marginLeft: index > 0 ? -overlap : 0,
              zIndex: visibleServices.length - index,
            }}
            title={service}
          >
            <ServiceLogo
              service={service}
              size={size}
            />
          </div>
        ))}
      </div>

      {/* +N indicator */}
      {remainingCount > 0 && (
        <span
          className="text-secondaryText font-medium"
          style={{ fontSize: size * 0.6 }}
          title={services.slice(maxVisible).join(', ')}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

/**
 * WorkflowServiceLogosCompact - Even more compact version for tight spaces
 */
export const WorkflowServiceLogosCompact: React.FC<WorkflowServiceLogosProps> = ({
  services,
  maxVisible = 2,
  size = 16,
  className = '',
}) => {
  if (!services || services.length === 0) {
    return null;
  }

  const visibleServices = services.slice(0, maxVisible);
  const remainingCount = services.length - maxVisible;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {visibleServices.map((service) => (
        <div
          key={service}
          className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
          title={service}
        >
          <ServiceLogo
            service={service}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <span
          className="text-secondaryText text-[10px] ml-0.5"
          title={services.slice(maxVisible).join(', ')}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

/**
 * WorkflowServiceLogosInline - Inline display with service names
 */
export const WorkflowServiceLogosInline: React.FC<{
  services: string[];
  size?: number;
  className?: string;
}> = ({
  services,
  size = 14,
  className = '',
}) => {
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {services.map((service) => (
        <div
          key={service}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-secondaryText"
        >
          <ServiceLogo service={service} size={size} />
          <span className="capitalize">{service.replace(/-/g, ' ')}</span>
        </div>
      ))}
    </div>
  );
};

export default WorkflowServiceLogos;
