/**
 * VariableForm Component
 *
 * Renders a form for collecting workflow variable values.
 * Supports different input types based on variable configuration.
 */

import React from 'react';
import { WorkflowVariable } from '../../types/workflow';

// ============================================================
// TYPES
// ============================================================

interface VariableFormProps {
  variables: WorkflowVariable[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const VariableForm: React.FC<VariableFormProps> = ({
  variables,
  values,
  onChange,
  errors = {},
  className = '',
}) => {
  const renderInput = (variable: WorkflowVariable) => {
    const value = values[variable.key] ?? variable.defaultValue ?? '';
    const hasError = !!errors[variable.key];

    switch (variable.type) {
      case 'textarea':
        return (
          <textarea
            className={`variable-form__input variable-form__textarea ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as string}
            onChange={e => onChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={`variable-form__input ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as number}
            onChange={e => onChange(variable.key, parseFloat(e.target.value))}
            placeholder={variable.placeholder}
            min={variable.validation?.min}
            max={variable.validation?.max}
          />
        );

      case 'select':
        return (
          <select
            className={`variable-form__input ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as string}
            onChange={e => onChange(variable.key, e.target.value)}
          >
            <option value="">Select...</option>
            {variable.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="variable-form__checkbox">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={e => onChange(variable.key, e.target.checked)}
            />
            <span>{variable.placeholder || 'Yes'}</span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            className={`variable-form__input ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as string}
            onChange={e => onChange(variable.key, e.target.value)}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className={`variable-form__input ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as string}
            onChange={e => onChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            className={`variable-form__input ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as string}
            onChange={e => onChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            className={`variable-form__input variable-form__file ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onChange(variable.key, file);
              }
            }}
            accept={variable.validation?.allowedExtensions?.join(',')}
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            className={`variable-form__input ${
              hasError ? 'variable-form__input--error' : ''
            }`}
            value={value as string}
            onChange={e => onChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
            maxLength={variable.validation?.maxLength}
          />
        );
    }
  };

  if (variables.length === 0) {
    return (
      <div className={`variable-form variable-form--empty ${className}`}>
        <p>No variables required for this workflow.</p>
      </div>
    );
  }

  return (
    <div className={`variable-form ${className}`}>
      {variables.map(variable => (
        <div key={variable.id} className="variable-form__group">
          <label
            className={`variable-form__label ${
              variable.required ? 'variable-form__label--required' : ''
            }`}
          >
            {variable.name}
          </label>

          {renderInput(variable)}

          {errors[variable.key] && (
            <span className="variable-form__error">{errors[variable.key]}</span>
          )}

          {variable.description && !errors[variable.key] && (
            <span className="variable-form__hint">{variable.description}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default VariableForm;
