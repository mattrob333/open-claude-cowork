/**
 * A2UI Components
 *
 * Export all A2UI-related components and utilities
 */

export { default as A2UIRenderer, processA2UIMessage, deepMerge } from './A2UIRenderer';
export { componentCatalog } from './componentCatalog';

// Re-export individual components for direct use
export {
  Column,
  Row,
  Card,
  Divider,
  Spacer,
  Text,
  Heading,
  Markdown,
  TextField,
  TextArea,
  Button,
  ButtonGroup,
  MultiSelect,
  RadioGroup,
  CheckboxGroup,
  Select,
  Toggle,
  Icon,
  Chip,
  ChipGroup,
  ProgressSpinner,
  ProgressBar,
  List,
  LabelValue,
  Accordion,
  Table,
  StatsRow,
  CompanyInfoCard,
  EmailPreviewCard,
  EmailDraftsList,
  StepProgress,
  VariableForm,
} from './componentCatalog';
