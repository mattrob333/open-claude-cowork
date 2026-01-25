/**
 * PersonalContextForm Component
 * 
 * A2UI component for gathering personal context during onboarding.
 * Collects role, common tasks, and preferences in a conversational way.
 */

import React from 'react';

interface TaskOption {
  value: string;
  label: string;
  icon?: string;
}

interface PersonalContextFormProps {
  onEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  role?: string;
  tasks?: string[];
  preferences?: string;
  onChange?: string;
  onSave?: string;
  title?: string;
  subtitle?: string;
  saveLabel?: string;
  taskOptions?: TaskOption[];
}

const DEFAULT_TASK_OPTIONS: TaskOption[] = [
  { value: 'email', label: 'Write emails', icon: '📧' },
  { value: 'research', label: 'Research', icon: '🔍' },
  { value: 'planning', label: 'Planning', icon: '📋' },
  { value: 'coding', label: 'Code', icon: '💻' },
  { value: 'sales', label: 'Sales calls', icon: '📞' },
  { value: 'content', label: 'Create content', icon: '✍️' },
  { value: 'analysis', label: 'Data analysis', icon: '📊' },
  { value: 'meetings', label: 'Meeting prep', icon: '🎯' },
  { value: 'docs', label: 'Documentation', icon: '📝' },
  { value: 'social', label: 'Social media', icon: '📱' },
];

export const PersonalContextForm: React.FC<PersonalContextFormProps> = ({
  onEvent,
  role = '',
  tasks = [],
  preferences = '',
  onChange = 'onContextChange',
  onSave = 'onSaveContext',
  title = "Help me understand how to help you",
  subtitle = "The more I know, the better I can assist you.",
  saveLabel = "Save & Continue",
  taskOptions = DEFAULT_TASK_OPTIONS,
}) => {
  const handleRoleChange = (value: string) => {
    onEvent(onChange, { field: 'role', value });
  };

  const handleTaskToggle = (taskValue: string) => {
    const newTasks = tasks.includes(taskValue)
      ? tasks.filter(t => t !== taskValue)
      : [...tasks, taskValue];
    onEvent(onChange, { field: 'tasks', value: newTasks });
  };

  const handlePreferencesChange = (value: string) => {
    onEvent(onChange, { field: 'preferences', value });
  };

  const handleSave = () => {
    onEvent(onSave, { role, tasks, preferences });
  };

  const isValid = role.trim().length > 0;

  return (
    <div className="a2ui-personal-context">
      {/* Header */}
      <div className="a2ui-personal-context__header">
        <h2 className="a2ui-personal-context__title">
          <span className="a2ui-personal-context__title-icon">🧠</span>
          {title}
        </h2>
        <p className="a2ui-personal-context__subtitle">{subtitle}</p>
      </div>

      {/* Form */}
      <div className="a2ui-personal-context__form">
        {/* Role input */}
        <div className="a2ui-personal-context__field">
          <label className="a2ui-personal-context__label">
            What's your role?
            <span className="a2ui-personal-context__required">*</span>
          </label>
          <input
            type="text"
            className="a2ui-personal-context__input"
            placeholder="e.g., Product Manager at a startup"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tasks selection */}
        <div className="a2ui-personal-context__field">
          <label className="a2ui-personal-context__label">
            What do you do most often?
            <span className="a2ui-personal-context__hint">(pick a few)</span>
          </label>
          <div className="a2ui-personal-context__tasks">
            {taskOptions.map((option) => {
              const isSelected = tasks.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`a2ui-personal-context__task ${isSelected ? 'a2ui-personal-context__task--selected' : ''}`}
                  onClick={() => handleTaskToggle(option.value)}
                >
                  {option.icon && <span className="a2ui-personal-context__task-icon">{option.icon}</span>}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences textarea */}
        <div className="a2ui-personal-context__field">
          <label className="a2ui-personal-context__label">
            Anything else I should know?
            <span className="a2ui-personal-context__hint">(optional)</span>
          </label>
          <textarea
            className="a2ui-personal-context__textarea"
            placeholder="e.g., I prefer concise responses. I work on B2B SaaS products. My team uses agile methodology..."
            value={preferences}
            onChange={(e) => handlePreferencesChange(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* Preview */}
      {(role || tasks.length > 0 || preferences) && (
        <div className="a2ui-personal-context__preview">
          <div className="a2ui-personal-context__preview-header">
            <span className="a2ui-personal-context__preview-icon">📄</span>
            <span>Your context file preview</span>
          </div>
          <div className="a2ui-personal-context__preview-content">
            {role && <p><strong>Role:</strong> {role}</p>}
            {tasks.length > 0 && (
              <p><strong>Common tasks:</strong> {tasks.map(t => {
                const opt = taskOptions.find(o => o.value === t);
                return opt?.label || t;
              }).join(', ')}</p>
            )}
            {preferences && <p><strong>Preferences:</strong> {preferences}</p>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="a2ui-personal-context__actions">
        <button
          className="a2ui-personal-context__save"
          onClick={handleSave}
          disabled={!isValid}
        >
          {saveLabel}
          <span className="a2ui-personal-context__save-arrow">→</span>
        </button>
      </div>
    </div>
  );
};

export default PersonalContextForm;
