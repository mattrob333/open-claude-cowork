/**
 * ToolGrid Component
 * 
 * A2UI component for selecting tools to connect during onboarding.
 * Displays a visual grid of tool cards with checkboxes.
 */

import React from 'react';

interface Tool {
  id: string;
  name: string;
  icon: string;
  description?: string;
  connected?: boolean;
  category?: string;
}

interface ToolGridProps {
  onEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  tools?: Tool[];
  selected?: string[];
  onChange?: string;
  onConnect?: string;
  title?: string;
  subtitle?: string;
  connectLabel?: string;
  minSelections?: number;
}

const DEFAULT_TOOLS: Tool[] = [
  // Communication
  { id: 'gmail', name: 'Gmail', icon: '📧', description: 'Email', category: 'communication' },
  { id: 'slack', name: 'Slack', icon: '💬', description: 'Team chat', category: 'communication' },
  // Productivity
  { id: 'notion', name: 'Notion', icon: '📝', description: 'Notes & docs', category: 'productivity' },
  { id: 'google_calendar', name: 'Google Calendar', icon: '📅', description: 'Scheduling', category: 'productivity' },
  { id: 'sharepoint', name: 'SharePoint', icon: '📁', description: 'File storage', category: 'productivity' },
  // Research
  { id: 'firecrawl', name: 'Firecrawl', icon: '🔥', description: 'Web scraping', category: 'research' },
  { id: 'exa', name: 'Exa Search', icon: '🔍', description: 'AI search', category: 'research' },
  // Development
  { id: 'github', name: 'GitHub', icon: '🐙', description: 'Code repos', category: 'development' },
  // Documents
  { id: 'google_sheets', name: 'Google Sheets', icon: '📊', description: 'Spreadsheets', category: 'documents' },
  { id: 'google_slides', name: 'Google Slides', icon: '📽️', description: 'Presentations', category: 'documents' },
  // Meetings
  { id: 'fireflies', name: 'Fireflies', icon: '🎙️', description: 'Meeting notes', category: 'meetings' },
  // CRM
  { id: 'zoho_crm', name: 'Zoho CRM', icon: '🎯', description: 'Customer management', category: 'crm' },
  { id: 'hubspot', name: 'HubSpot', icon: '🧡', description: 'Marketing & sales', category: 'crm' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', description: 'Enterprise CRM', category: 'crm' },
  { id: 'pipedrive', name: 'Pipedrive', icon: '📈', description: 'Sales pipeline', category: 'crm' },
];

export const ToolGrid: React.FC<ToolGridProps> = ({
  onEvent,
  tools = DEFAULT_TOOLS,
  selected = [],
  onChange = 'onToolSelectionChange',
  onConnect = 'onConnectTools',
  title = "What tools do you use daily?",
  subtitle = "Select the ones you'd like to connect. You can always add more later.",
  connectLabel = "Connect Selected",
  minSelections = 0,
}) => {
  const handleToggle = (toolId: string) => {
    const newSelected = selected.includes(toolId)
      ? selected.filter(id => id !== toolId)
      : [...selected, toolId];
    onEvent(onChange, { selected: newSelected });
  };

  const handleConnect = () => {
    if (selected.length >= minSelections) {
      onEvent(onConnect, { tools: selected });
    }
  };

  return (
    <div className="a2ui-tool-grid">
      {/* Header */}
      <div className="a2ui-tool-grid__header">
        <h2 className="a2ui-tool-grid__title">
          <span className="a2ui-tool-grid__title-icon">🔗</span>
          {title}
        </h2>
        <p className="a2ui-tool-grid__subtitle">{subtitle}</p>
      </div>

      {/* Grid */}
      <div className="a2ui-tool-grid__grid">
        {tools.map((tool) => {
          const isSelected = selected.includes(tool.id);
          const isConnected = tool.connected;
          
          return (
            <button
              key={tool.id}
              className={`a2ui-tool-grid__item ${isSelected ? 'a2ui-tool-grid__item--selected' : ''} ${isConnected ? 'a2ui-tool-grid__item--connected' : ''}`}
              onClick={() => !isConnected && handleToggle(tool.id)}
              disabled={isConnected}
            >
              <span className="a2ui-tool-grid__item-icon">{tool.icon}</span>
              <span className="a2ui-tool-grid__item-name">{tool.name}</span>
              {tool.description && (
                <span className="a2ui-tool-grid__item-desc">{tool.description}</span>
              )}
              {isConnected && (
                <span className="a2ui-tool-grid__item-badge">✓ Connected</span>
              )}
              {isSelected && !isConnected && (
                <span className="a2ui-tool-grid__item-check">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="a2ui-tool-grid__actions">
        <div className="a2ui-tool-grid__count">
          {selected.length} tool{selected.length !== 1 ? 's' : ''} selected
        </div>
        <button
          className="a2ui-tool-grid__connect"
          onClick={handleConnect}
          disabled={selected.length < minSelections}
        >
          {connectLabel} ({selected.length})
          <span className="a2ui-tool-grid__connect-arrow">→</span>
        </button>
      </div>
    </div>
  );
};

export default ToolGrid;
