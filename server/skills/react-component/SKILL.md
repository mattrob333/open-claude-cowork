---
name: React Component
description: Create React components following best practices with TypeScript
triggers:
  - "create component"
  - "react component"
  - "new component"
  - "build a component"
  - "make a component"
version: 1.0.0
author: open-claude-cowork
---

# React Component Creation Skill

## Overview
This skill guides the creation of high-quality React components using TypeScript, following modern best practices and patterns.

## Component Structure

### File Organization
```
ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.types.ts  # TypeScript interfaces (if complex)
├── ComponentName.test.tsx  # Tests
├── index.ts               # Re-export
└── README.md              # Documentation (optional)
```

### Basic Component Template

```typescript
import React from 'react';

interface ComponentNameProps {
  // Required props
  title: string;
  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  className?: string;
  // Event handlers
  onClick?: () => void;
  // Children
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  variant = 'primary',
  className = '',
  onClick,
  children,
}) => {
  return (
    <div
      className={`component-name component-name--${variant} ${className}`.trim()}
      onClick={onClick}
    >
      <h2>{title}</h2>
      {children}
    </div>
  );
};

export default ComponentName;
```

## Best Practices

### 1. TypeScript Usage
- Define explicit prop interfaces
- Use discriminated unions for variant props
- Avoid `any` type - use `unknown` if needed
- Export interfaces for reuse

### 2. Component Design
- Keep components focused (single responsibility)
- Extract reusable logic to custom hooks
- Use composition over inheritance
- Prefer controlled components

### 3. Performance
- Memoize callbacks with `useCallback`
- Memoize expensive computations with `useMemo`
- Use `React.memo` for pure presentational components
- Avoid inline object/array definitions in JSX

### 4. Accessibility
- Use semantic HTML elements
- Include ARIA attributes where needed
- Ensure keyboard navigation
- Maintain proper heading hierarchy
- Add alt text for images

### 5. Styling Approach
```typescript
// Prefer: Tailwind CSS classes
<div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow">

// Or: CSS Modules
import styles from './ComponentName.module.css';
<div className={styles.container}>

// Avoid: Inline styles for complex styling
```

### 6. Event Handling
```typescript
// Type event handlers properly
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  // handler logic
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

### 7. State Management
```typescript
// Local state for UI concerns
const [isOpen, setIsOpen] = useState(false);

// Lift state up for shared data
// Use context for deeply nested state
// Consider external state for complex apps
```

## Hooks Patterns

### Custom Hook Template
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseFeatureOptions {
  initialValue?: string;
  onSuccess?: (data: Data) => void;
}

interface UseFeatureReturn {
  data: Data | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFeature(options: UseFeatureOptions = {}): UseFeatureReturn {
  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchData();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [options.onSuccess]);

  useEffect(() => {
    refetch();
  }, []);

  return { data, isLoading, error, refetch };
}
```

## Testing Guidelines

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with required props', () => {
    render(<ComponentName title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<ComponentName title="Test" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    render(<ComponentName title="Test" variant="secondary" />);
    expect(screen.getByText('Test').parentElement).toHaveClass('component-name--secondary');
  });
});
```

## Common Patterns

### Compound Components
```typescript
const Card = ({ children }) => <div className="card">{children}</div>;
Card.Header = ({ children }) => <div className="card-header">{children}</div>;
Card.Body = ({ children }) => <div className="card-body">{children}</div>;

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### Render Props
```typescript
interface RenderProps<T> {
  data: T;
  isLoading: boolean;
}

interface DataProviderProps<T> {
  children: (props: RenderProps<T>) => React.ReactNode;
}
```

### Forward Refs
```typescript
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
);
```
