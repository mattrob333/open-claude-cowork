/**
 * A2UI Component Catalog
 *
 * Contains all A2UI components that can be rendered by the A2UIRenderer.
 * Each component receives standard props: onEvent, renderChild
 */

import React, { useState } from 'react';
import {
  WelcomeHero,
  ToolGrid,
  ConnectionProgress,
  PersonalContextForm,
  OnboardingComplete,
} from './onboarding';

// ============================================================
// BASE TYPES
// ============================================================

interface A2UIComponentProps {
  onEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  renderChild: (childId: string) => React.ReactNode;
}

// ============================================================
// LAYOUT COMPONENTS
// ============================================================

export const Column: React.FC<
  A2UIComponentProps & {
    children?: string[];
    gap?: number;
    padding?: number;
    alignment?: 'start' | 'center' | 'end' | 'stretch';
  }
> = ({ children = [], gap = 0, padding = 0, alignment = 'stretch', renderChild }) => (
  <div
    className="a2ui-column"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: `${gap}px`,
      padding: `${padding}px`,
      alignItems:
        alignment === 'stretch'
          ? 'stretch'
          : alignment === 'center'
          ? 'center'
          : alignment === 'end'
          ? 'flex-end'
          : 'flex-start',
    }}
  >
    {children.map(childId => renderChild(childId))}
  </div>
);

export const Row: React.FC<
  A2UIComponentProps & {
    children?: string[];
    gap?: number;
    alignment?: 'start' | 'center' | 'end' | 'space_between';
    wrap?: boolean;
  }
> = ({ children = [], gap = 0, alignment = 'start', wrap = false, renderChild }) => (
  <div
    className="a2ui-row"
    style={{
      display: 'flex',
      flexDirection: 'row',
      gap: `${gap}px`,
      alignItems: 'center',
      justifyContent:
        alignment === 'space_between'
          ? 'space-between'
          : alignment === 'center'
          ? 'center'
          : alignment === 'end'
          ? 'flex-end'
          : 'flex-start',
      flexWrap: wrap ? 'wrap' : 'nowrap',
    }}
  >
    {children.map(childId => renderChild(childId))}
  </div>
);

export const Card: React.FC<
  A2UIComponentProps & {
    children?: string[];
    variant?: 'default' | 'outlined' | 'elevated';
  }
> = ({ children = [], variant = 'default', renderChild }) => (
  <div className={`a2ui-card a2ui-card--${variant}`}>
    {children.map(childId => renderChild(childId))}
  </div>
);

export const Divider: React.FC<A2UIComponentProps> = () => (
  <hr className="a2ui-divider" />
);

export const Spacer: React.FC<A2UIComponentProps & { height?: number }> = ({
  height = 16,
}) => <div style={{ height: `${height}px` }} />;

// ============================================================
// TYPOGRAPHY COMPONENTS
// ============================================================

export const Text: React.FC<
  A2UIComponentProps & {
    text: string;
    style?:
      | 'body'
      | 'body_large'
      | 'body_secondary'
      | 'heading_small'
      | 'heading_medium'
      | 'heading_large'
      | 'label'
      | 'value'
      | 'emoji_large'
      | 'section_header'
      | 'step_title'
      | 'variable_name'
      | 'list_item_numbered';
    animate?: 'none' | 'pulse';
  }
> = ({ text, style = 'body', animate = 'none' }) => {
  const className = `a2ui-text a2ui-text--${style} ${
    animate !== 'none' ? `a2ui-animate--${animate}` : ''
  }`;
  return <span className={className}>{text}</span>;
};

export const Heading: React.FC<
  A2UIComponentProps & {
    text: string;
    level?: 1 | 2 | 3 | 4;
  }
> = ({ text, level = 2 }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={`a2ui-heading a2ui-heading--${level}`}>{text}</Tag>;
};

export const Markdown: React.FC<
  A2UIComponentProps & {
    content: string;
  }
> = ({ content }) => (
  <div
    className="a2ui-markdown"
    dangerouslySetInnerHTML={{ __html: content }}
  />
);

// ============================================================
// INPUT COMPONENTS
// ============================================================

export const TextField: React.FC<
  A2UIComponentProps & {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: string;
    required?: boolean;
    autoFocus?: boolean;
    type?: 'text' | 'email' | 'url' | 'number' | 'password';
    error?: string;
    disabled?: boolean;
  }
> = ({
  label,
  placeholder,
  value = '',
  onChange,
  required,
  autoFocus,
  type = 'text',
  error,
  disabled,
  onEvent,
}) => (
  <div className="a2ui-textfield">
    {label && (
      <label className="a2ui-textfield__label">
        {label}
        {required && <span className="a2ui-required">*</span>}
      </label>
    )}
    <input
      type={type}
      className={`a2ui-textfield__input ${
        error ? 'a2ui-textfield__input--error' : ''
      }`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange && onEvent(onChange, { value: e.target.value })}
      autoFocus={autoFocus}
      disabled={disabled}
    />
    {error && <span className="a2ui-textfield__error">{error}</span>}
  </div>
);

export const TextArea: React.FC<
  A2UIComponentProps & {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: string;
    required?: boolean;
    rows?: number;
    maxLength?: number;
    error?: string;
    disabled?: boolean;
  }
> = ({
  label,
  placeholder,
  value = '',
  onChange,
  required,
  rows = 4,
  maxLength,
  error,
  disabled,
  onEvent,
}) => (
  <div className="a2ui-textarea">
    {label && (
      <label className="a2ui-textarea__label">
        {label}
        {required && <span className="a2ui-required">*</span>}
      </label>
    )}
    <textarea
      className={`a2ui-textarea__input ${
        error ? 'a2ui-textarea__input--error' : ''
      }`}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange && onEvent(onChange, { value: e.target.value })}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
    />
    {error && <span className="a2ui-textarea__error">{error}</span>}
  </div>
);

export const Button: React.FC<
  A2UIComponentProps & {
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    onPress?: string;
  }
> = ({
  label,
  variant = 'primary',
  size = 'medium',
  fullWidth,
  disabled,
  loading,
  onPress,
  onEvent,
}) => (
  <button
    className={`a2ui-button a2ui-button--${variant} a2ui-button--${size} ${
      fullWidth ? 'a2ui-button--full-width' : ''
    } ${loading ? 'a2ui-button--loading' : ''}`}
    disabled={disabled || loading}
    onClick={() => onPress && onEvent(onPress)}
  >
    {loading && <span className="a2ui-button__spinner" />}
    {label}
  </button>
);

export const ButtonGroup: React.FC<
  A2UIComponentProps & {
    label?: string;
    options?: { value: string; label: string; icon?: string }[];
    value?: string;
    onChange?: string;
  }
> = ({ label, options = [], value, onChange, onEvent }) => (
  <div className="a2ui-buttongroup">
    {label && <label className="a2ui-buttongroup__label">{label}</label>}
    <div className="a2ui-buttongroup__buttons">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`a2ui-buttongroup__button ${
            value === opt.value ? 'a2ui-buttongroup__button--selected' : ''
          }`}
          onClick={() => onChange && onEvent(onChange, { value: opt.value })}
        >
          {opt.icon && <span className="a2ui-buttongroup__icon">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

export const MultiSelect: React.FC<
  A2UIComponentProps & {
    label?: string;
    options?: { value: string; label: string }[];
    value?: string[];
    onChange?: string;
    maxSelections?: number;
  }
> = ({ label, options = [], value = [], onChange, maxSelections, onEvent }) => (
  <div className="a2ui-multiselect">
    {label && <label className="a2ui-multiselect__label">{label}</label>}
    <div className="a2ui-multiselect__chips">
      {options.map(opt => {
        const isSelected = value.includes(opt.value);
        const isDisabled =
          !isSelected && maxSelections !== undefined && value.length >= maxSelections;

        return (
          <button
            key={opt.value}
            className={`a2ui-multiselect__chip ${
              isSelected ? 'a2ui-multiselect__chip--selected' : ''
            }`}
            disabled={isDisabled}
            onClick={() => {
              if (!onChange) return;
              const newValue = isSelected
                ? value.filter(v => v !== opt.value)
                : [...value, opt.value];
              onEvent(onChange, { value: newValue });
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

export const RadioGroup: React.FC<
  A2UIComponentProps & {
    options?: { value: string; label: string; description?: string }[];
    value?: string;
    onChange?: string;
  }
> = ({ options = [], value, onChange, onEvent }) => (
  <div className="a2ui-radiogroup">
    {options.map(opt => (
      <label key={opt.value} className="a2ui-radiogroup__option">
        <input
          type="radio"
          checked={value === opt.value}
          onChange={() => onChange && onEvent(onChange, { value: opt.value })}
        />
        <div className="a2ui-radiogroup__content">
          <span className="a2ui-radiogroup__label">{opt.label}</span>
          {opt.description && (
            <span className="a2ui-radiogroup__description">{opt.description}</span>
          )}
        </div>
      </label>
    ))}
  </div>
);

export const CheckboxGroup: React.FC<
  A2UIComponentProps & {
    options?: { value: string; label: string }[];
    value?: string[];
    onChange?: string;
  }
> = ({ options = [], value = [], onChange, onEvent }) => (
  <div className="a2ui-checkboxgroup">
    {options.map(opt => (
      <label key={opt.value} className="a2ui-checkboxgroup__option">
        <input
          type="checkbox"
          checked={value.includes(opt.value)}
          onChange={() => {
            if (!onChange) return;
            const newValue = value.includes(opt.value)
              ? value.filter(v => v !== opt.value)
              : [...value, opt.value];
            onEvent(onChange, { value: newValue });
          }}
        />
        <span>{opt.label}</span>
      </label>
    ))}
  </div>
);

export const Select: React.FC<
  A2UIComponentProps & {
    label?: string;
    options?: { value: string; label: string }[];
    value?: string;
    onChange?: string;
    placeholder?: string;
  }
> = ({ label, options = [], value, onChange, placeholder, onEvent }) => (
  <div className="a2ui-select">
    {label && <label className="a2ui-select__label">{label}</label>}
    <select
      className="a2ui-select__input"
      value={value || ''}
      onChange={e => onChange && onEvent(onChange, { value: e.target.value })}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const Toggle: React.FC<
  A2UIComponentProps & {
    label?: string;
    value?: boolean;
    onChange?: string;
  }
> = ({ label, value = false, onChange, onEvent }) => (
  <label className="a2ui-toggle">
    <input
      type="checkbox"
      checked={value}
      onChange={() => onChange && onEvent(onChange, { value: !value })}
    />
    <span className="a2ui-toggle__slider" />
    {label && <span className="a2ui-toggle__label">{label}</span>}
  </label>
);

// ============================================================
// DISPLAY COMPONENTS
// ============================================================

export const Icon: React.FC<
  A2UIComponentProps & {
    name: string;
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    color?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  }
> = ({ name, size = 'medium', color = 'default' }) => (
  <span
    className={`a2ui-icon a2ui-icon--${size} a2ui-icon--${color}`}
    data-icon={name}
  >
    {name}
  </span>
);

export const Chip: React.FC<
  A2UIComponentProps & {
    label: string;
    variant?: 'default' | 'info' | 'success' | 'warning' | 'error' | 'status';
    removable?: boolean;
    onRemove?: string;
  }
> = ({ label, variant = 'default', removable, onRemove, onEvent }) => (
  <span className={`a2ui-chip a2ui-chip--${variant}`}>
    {label}
    {removable && onRemove && (
      <button
        className="a2ui-chip__remove"
        onClick={() => onEvent(onRemove)}
        aria-label="Remove"
      >
        ×
      </button>
    )}
  </span>
);

export const ChipGroup: React.FC<
  A2UIComponentProps & {
    chips?: string[];
  }
> = ({ chips = [] }) => (
  <div className="a2ui-chipgroup">
    {chips.map((chip, i) => (
      <span key={i} className="a2ui-chip">
        {chip}
      </span>
    ))}
  </div>
);

export const ProgressSpinner: React.FC<
  A2UIComponentProps & {
    size?: 'small' | 'medium' | 'large';
    label?: string;
  }
> = ({ size = 'medium', label }) => (
  <div className={`a2ui-spinner a2ui-spinner--${size}`}>
    <div className="a2ui-spinner__circle" />
    {label && <span className="a2ui-spinner__label">{label}</span>}
  </div>
);

export const ProgressBar: React.FC<
  A2UIComponentProps & {
    value?: number;
    label?: string;
    showValue?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'error';
  }
> = ({ value = 0, label, showValue, variant = 'default' }) => (
  <div className={`a2ui-progressbar a2ui-progressbar--${variant}`}>
    {label && <span className="a2ui-progressbar__label">{label}</span>}
    <div className="a2ui-progressbar__track">
      <div
        className="a2ui-progressbar__fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
    {showValue && (
      <span className="a2ui-progressbar__value">{Math.round(value)}%</span>
    )}
  </div>
);

export const List: React.FC<
  A2UIComponentProps & {
    items?: unknown[];
    renderItem?: string;
  }
> = ({ items = [], renderItem, renderChild }) => (
  <div className="a2ui-list">
    {items.map((_, index) => (
      <div key={index} className="a2ui-list__item">
        {renderItem ? renderChild(renderItem) : null}
      </div>
    ))}
  </div>
);

export const LabelValue: React.FC<
  A2UIComponentProps & {
    label: string;
    value: string;
    copyable?: boolean;
  }
> = ({ label, value, copyable, onEvent }) => (
  <div className="a2ui-labelvalue">
    <span className="a2ui-labelvalue__label">{label}</span>
    <span className="a2ui-labelvalue__value">
      {value}
      {copyable && (
        <button
          className="a2ui-labelvalue__copy"
          onClick={() => {
            navigator.clipboard.writeText(value);
            onEvent('copied', { value });
          }}
          aria-label="Copy"
        >
          📋
        </button>
      )}
    </span>
  </div>
);

export const Accordion: React.FC<
  A2UIComponentProps & {
    sections?: { id: string; title: string; content: string; defaultOpen?: boolean }[];
  }
> = ({ sections = [], renderChild }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.defaultOpen).map(s => s.id))
  );

  return (
    <div className="a2ui-accordion">
      {sections.map(section => (
        <div key={section.id} className="a2ui-accordion__section">
          <button
            className="a2ui-accordion__header"
            onClick={() => {
              const next = new Set(openSections);
              if (next.has(section.id)) {
                next.delete(section.id);
              } else {
                next.add(section.id);
              }
              setOpenSections(next);
            }}
          >
            <span>{section.title}</span>
            <span className="a2ui-accordion__chevron">
              {openSections.has(section.id) ? '▼' : '▶'}
            </span>
          </button>
          {openSections.has(section.id) && (
            <div className="a2ui-accordion__content">
              {renderChild(section.content)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const Table: React.FC<
  A2UIComponentProps & {
    columns?: { key: string; label: string; width?: string }[];
    rows?: Record<string, unknown>[];
  }
> = ({ columns = [], rows = [] }) => (
  <div className="a2ui-table-container">
    <table className="a2ui-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={col.width ? { width: col.width } : undefined}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map(col => (
              <td key={col.key}>{String(row[col.key] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ============================================================
// CUSTOM WORKFLOW COMPONENTS
// ============================================================

export const StatsRow: React.FC<
  A2UIComponentProps & {
    stats?: { label: string; value: string; icon?: string }[];
  }
> = ({ stats = [] }) => (
  <div className="a2ui-statsrow">
    {stats.map((stat, i) => (
      <div key={i} className="a2ui-statsrow__stat">
        {stat.icon && <span className="a2ui-statsrow__icon">{stat.icon}</span>}
        <span className="a2ui-statsrow__value">{stat.value}</span>
        <span className="a2ui-statsrow__label">{stat.label}</span>
      </div>
    ))}
  </div>
);

export const CompanyInfoCard: React.FC<
  A2UIComponentProps & {
    name: string;
    description?: string;
    funding?: string;
    employees?: string;
    recentNews?: { title: string; date: string; url?: string }[];
  }
> = ({ name, description, funding, employees, recentNews = [] }) => (
  <div className="a2ui-company-card">
    <h3 className="a2ui-company-card__name">{name}</h3>
    {description && (
      <p className="a2ui-company-card__description">{description}</p>
    )}
    <div className="a2ui-company-card__meta">
      {funding && <span>💰 {funding}</span>}
      {employees && <span>👥 {employees} employees</span>}
    </div>
    {recentNews.length > 0 && (
      <div className="a2ui-company-card__news">
        <h4>Recent News</h4>
        <ul>
          {recentNews.map((news, i) => (
            <li key={i}>
              <span className="a2ui-company-card__news-title">{news.title}</span>
              <span className="a2ui-company-card__news-date">{news.date}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export const EmailPreviewCard: React.FC<
  A2UIComponentProps & {
    subject: string;
    body: string;
    tone?: string;
    recipient?: string;
    editable?: boolean;
    onEdit?: string;
  }
> = ({ subject, body, tone, recipient, editable, onEdit, onEvent }) => (
  <div className="a2ui-email-preview">
    <div className="a2ui-email-preview__header">
      {recipient && (
        <span className="a2ui-email-preview__recipient">To: {recipient}</span>
      )}
      <span className="a2ui-email-preview__subject">{subject}</span>
      {tone && <span className="a2ui-email-preview__tone">{tone}</span>}
    </div>
    <div className="a2ui-email-preview__body">{body}</div>
    {editable && onEdit && (
      <button
        className="a2ui-email-preview__edit"
        onClick={() => onEvent(onEdit)}
      >
        ✏️ Edit
      </button>
    )}
  </div>
);

export const EmailDraftsList: React.FC<
  A2UIComponentProps & {
    drafts?: {
      id: string;
      recipient: string;
      subject: string;
      body: string;
      tone?: string;
    }[];
    onCopy?: string;
    onOpenInGmail?: string;
  }
> = ({ drafts = [], onCopy, onOpenInGmail, onEvent }) => (
  <div className="a2ui-email-drafts">
    {drafts.map(draft => (
      <div key={draft.id} className="a2ui-email-drafts__item">
        <div className="a2ui-email-drafts__recipient">{draft.recipient}</div>
        <div className="a2ui-email-drafts__subject">{draft.subject}</div>
        <div className="a2ui-email-drafts__body">{draft.body}</div>
        <div className="a2ui-email-drafts__actions">
          {onCopy && (
            <button onClick={() => onEvent(onCopy, { emailId: draft.id })}>
              📋 Copy
            </button>
          )}
          {onOpenInGmail && (
            <button onClick={() => onEvent(onOpenInGmail, { emailId: draft.id })}>
              📧 Gmail
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const StepProgress: React.FC<
  A2UIComponentProps & {
    steps?: {
      id: string;
      name: string;
      status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
      durationMs?: number;
    }[];
    currentStepId?: string;
  }
> = ({ steps = [], currentStepId }) => (
  <div className="a2ui-step-progress">
    {steps.map((step, index) => (
      <div
        key={step.id}
        className={`a2ui-step-progress__step a2ui-step-progress__step--${step.status} ${
          step.id === currentStepId ? 'a2ui-step-progress__step--current' : ''
        }`}
      >
        <div className="a2ui-step-progress__indicator">
          {step.status === 'completed' && '✓'}
          {step.status === 'failed' && '✗'}
          {step.status === 'skipped' && '○'}
          {step.status === 'running' && (
            <span className="a2ui-step-progress__spinner" />
          )}
          {step.status === 'pending' && index + 1}
        </div>
        <div className="a2ui-step-progress__content">
          <span className="a2ui-step-progress__name">{step.name}</span>
          {step.durationMs !== undefined && (
            <span className="a2ui-step-progress__duration">
              {(step.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const VariableForm: React.FC<
  A2UIComponentProps & {
    variables?: {
      key: string;
      name: string;
      type: string;
      required?: boolean;
      defaultValue?: unknown;
      options?: { value: string; label: string }[];
      placeholder?: string;
      helpText?: string;
    }[];
    values?: Record<string, unknown>;
    errors?: Record<string, string>;
    onChange?: string;
    onSubmit?: string;
  }
> = ({
  variables = [],
  values = {},
  errors = {},
  onChange,
  onSubmit,
  onEvent,
}) => (
  <form
    className="a2ui-variable-form"
    onSubmit={e => {
      e.preventDefault();
      onSubmit && onEvent(onSubmit, { values });
    }}
  >
    {variables.map(variable => (
      <div key={variable.key} className="a2ui-variable-form__field">
        <label className="a2ui-variable-form__label">
          {variable.name}
          {variable.required && <span className="a2ui-required">*</span>}
        </label>

        {variable.type === 'textarea' ? (
          <textarea
            className="a2ui-variable-form__textarea"
            value={String(values[variable.key] ?? variable.defaultValue ?? '')}
            placeholder={variable.placeholder}
            onChange={e =>
              onChange &&
              onEvent(onChange, { key: variable.key, value: e.target.value })
            }
          />
        ) : variable.type === 'select' ? (
          <select
            className="a2ui-variable-form__select"
            value={String(values[variable.key] ?? variable.defaultValue ?? '')}
            onChange={e =>
              onChange &&
              onEvent(onChange, { key: variable.key, value: e.target.value })
            }
          >
            <option value="">{variable.placeholder || 'Select...'}</option>
            {(variable.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : variable.type === 'boolean' ? (
          <label className="a2ui-variable-form__toggle">
            <input
              type="checkbox"
              checked={Boolean(values[variable.key] ?? variable.defaultValue)}
              onChange={e =>
                onChange &&
                onEvent(onChange, { key: variable.key, value: e.target.checked })
              }
            />
            <span className="a2ui-variable-form__toggle-slider" />
          </label>
        ) : (
          <input
            type={variable.type === 'number' ? 'number' : 'text'}
            className="a2ui-variable-form__input"
            value={String(values[variable.key] ?? variable.defaultValue ?? '')}
            placeholder={variable.placeholder}
            onChange={e =>
              onChange &&
              onEvent(onChange, { key: variable.key, value: e.target.value })
            }
          />
        )}

        {variable.helpText && (
          <span className="a2ui-variable-form__help">{variable.helpText}</span>
        )}
        {errors[variable.key] && (
          <span className="a2ui-variable-form__error">{errors[variable.key]}</span>
        )}
      </div>
    ))}

    {onSubmit && (
      <button type="submit" className="a2ui-button a2ui-button--primary">
        Continue
      </button>
    )}
  </form>
);

// ============================================================
// EXPORT CATALOG
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const componentCatalog: Record<string, React.FC<any>> = {
  // Layout
  Column,
  Row,
  Card,
  Divider,
  Spacer,

  // Typography
  Text,
  Heading,
  Markdown,

  // Input
  TextField,
  TextArea,
  Button,
  ButtonGroup,
  MultiSelect,
  RadioGroup,
  CheckboxGroup,
  Select,
  Toggle,

  // Display
  Icon,
  Chip,
  ChipGroup,
  ProgressSpinner,
  ProgressBar,
  List,
  LabelValue,
  Accordion,
  Table,

  // Custom Workflow
  StatsRow,
  CompanyInfoCard,
  EmailPreviewCard,
  EmailDraftsList,
  StepProgress,
  VariableForm,

  // Onboarding
  WelcomeHero,
  ToolGrid,
  ConnectionProgress,
  PersonalContextForm,
  OnboardingComplete,
};

export default componentCatalog;
