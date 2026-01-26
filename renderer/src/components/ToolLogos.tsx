/**
 * Real Tool Logos Component
 * SVG logos for popular integrations
 */

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

// Gmail Logo
export const GmailLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"/>
    <path fill="#EA4335" d="M22 6l-10 7L2 6"/>
    <path fill="#FBBC05" d="M2 6v12h4V10l6 4.5 6-4.5v8h4V6"/>
    <path fill="#34A853" d="M2 18h4v-8l6 4.5"/>
    <path fill="#C5221F" d="M22 18h-4v-8l-6 4.5"/>
  </svg>
);

// Google Drive Logo
export const GoogleDriveLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M12 11L6.5 2h11L12 11z"/>
    <path fill="#FBBC05" d="M17.5 2L12 11l5.5 9h-11l5.5-9L17.5 2z"/>
    <path fill="#34A853" d="M6.5 20l5.5-9H1l5.5 9z"/>
    <path fill="#EA4335" d="M12 11l5.5 9H6.5l5.5-9z"/>
  </svg>
);

// Google Calendar Logo
export const GoogleCalendarLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
    <path fill="#fff" d="M19 20H5V9h14v11z"/>
    <path fill="#EA4335" d="M12 13h5v5h-5z"/>
    <path fill="#FBBC05" d="M7 13h5v5H7z"/>
    <path fill="#34A853" d="M7 13h5v-4H7z"/>
    <path fill="#4285F4" d="M12 9h5v4h-5z"/>
  </svg>
);

// Slack Logo
export const SlackLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
    <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
    <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
    <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

// GitHub Logo
export const GitHubLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

// Asana Logo
export const AsanaLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#F06A6A" d="M18.78 12.653c-2.882 0-5.22 2.337-5.22 5.22s2.338 5.22 5.22 5.22c2.883 0 5.22-2.337 5.22-5.22s-2.337-5.22-5.22-5.22zM5.22 12.653C2.337 12.653 0 14.99 0 17.873s2.337 5.22 5.22 5.22 5.22-2.337 5.22-5.22-2.337-5.22-5.22-5.22zM12 .907c-2.882 0-5.22 2.337-5.22 5.22s2.338 5.22 5.22 5.22c2.883 0 5.22-2.337 5.22-5.22S14.883.907 12 .907z"/>
  </svg>
);

// Trello Logo
export const TrelloLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <rect fill="#0079BF" width="24" height="24" rx="3"/>
    <rect fill="#fff" x="4" y="4" width="7" height="14" rx="1"/>
    <rect fill="#fff" x="13" y="4" width="7" height="9" rx="1"/>
  </svg>
);

// Notion Logo
export const NotionLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.373.466l1.822 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.493-.933l-4.577-7.186v6.952l1.446.327s0 .84-1.168.84l-3.22.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.454-.233 4.763 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933l3.225-.186zM2.456.933l13.076-.98C18.16-.14 18.766 0 19.705.7l3.361 2.334c.56.42.746.56.746 1.026v16.24c0 1.027-.373 1.634-1.68 1.727l-15.458.933c-.98.047-1.447-.093-1.96-.747L1.756 18.96c-.56-.747-.793-1.307-.793-1.96V2.62c0-.84.373-1.54 1.493-1.687z"/>
  </svg>
);

// Fireflies Logo (simple mic icon for meeting transcription)
export const FirefliesLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <circle fill="#7C3AED" cx="12" cy="12" r="12"/>
    <path fill="#fff" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z"/>
  </svg>
);

// Zoom Logo
export const ZoomLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <rect fill="#2D8CFF" width="24" height="24" rx="4"/>
    <path fill="#fff" d="M4 8h10v8H4z"/>
    <path fill="#fff" d="M15 10l5-3v10l-5-3z"/>
  </svg>
);

// LinkedIn Logo
export const LinkedInLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <rect fill="#0A66C2" width="24" height="24" rx="2"/>
    <path fill="#fff" d="M6.94 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-.5 4.5h3v9h-3v-9zm5 0h2.85v1.23h.04c.4-.75 1.37-1.54 2.82-1.54 3.02 0 3.58 1.99 3.58 4.57v5.24h-2.97v-4.65c0-1.1-.02-2.53-1.54-2.53-1.54 0-1.78 1.2-1.78 2.45v4.73h-3v-9.5z"/>
  </svg>
);

// HubSpot Logo
export const HubSpotLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#FF7A59" d="M17.69 12.97c-.36-.23-.78-.36-1.22-.38v-2.94c.6-.26 1.02-.85 1.02-1.55 0-.93-.75-1.68-1.68-1.68s-1.68.75-1.68 1.68c0 .7.42 1.29 1.02 1.55v2.94c-.43.02-.85.15-1.22.38l-4.34-3.37c.03-.12.05-.25.05-.38 0-.88-.71-1.59-1.59-1.59s-1.59.71-1.59 1.59.71 1.59 1.59 1.59c.3 0 .58-.08.82-.23l4.23 3.29c-.23.35-.37.77-.37 1.22 0 1.21.98 2.19 2.19 2.19s2.19-.98 2.19-2.19c0-.45-.14-.87-.37-1.22l4.23-3.29c.24.14.52.23.82.23.88 0 1.59-.71 1.59-1.59s-.71-1.59-1.59-1.59-1.59.71-1.59 1.59c0 .13.02.26.05.38l-4.34 3.37z"/>
  </svg>
);

// Jira Logo
export const JiraLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#2684FF" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84A.84.84 0 0 0 21.16 2H11.53z"/>
    <path fill="#2684FF" d="M6.77 6.8a4.362 4.362 0 0 0 4.34 4.38h1.8v1.7c0 2.4 1.93 4.35 4.33 4.37V7.63a.84.84 0 0 0-.83-.83H6.77z"/>
    <path fill="#2684FF" d="M2 11.6c0 2.4 1.96 4.35 4.35 4.35h1.78v1.72c0 2.4 1.95 4.33 4.35 4.33v-9.56a.84.84 0 0 0-.84-.84H2z"/>
  </svg>
);

// Salesforce Logo
export const SalesforceLogo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#00A1E0" d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.858 3.68 2.135a5.092 5.092 0 0 1 2.017-.415c2.828 0 5.121 2.291 5.121 5.117 0 2.825-2.293 5.116-5.121 5.116-.387 0-.763-.044-1.124-.126a3.74 3.74 0 0 1-3.347 2.064 3.74 3.74 0 0 1-1.631-.372 4.477 4.477 0 0 1-4.084 2.652 4.478 4.478 0 0 1-4.25-3.06 3.83 3.83 0 0 1-.682.061c-2.123 0-3.844-1.72-3.844-3.841 0-1.348.698-2.536 1.752-3.22A4.477 4.477 0 0 1 5.63 5.32a4.48 4.48 0 0 1 4.376.095z"/>
  </svg>
);

// Tool logo mapping
export const TOOL_LOGOS: Record<string, React.FC<LogoProps>> = {
  gmail: GmailLogo,
  'google-drive': GoogleDriveLogo,
  'google-calendar': GoogleCalendarLogo,
  calendar: GoogleCalendarLogo,
  slack: SlackLogo,
  github: GitHubLogo,
  asana: AsanaLogo,
  trello: TrelloLogo,
  notion: NotionLogo,
  fireflies: FirefliesLogo,
  zoom: ZoomLogo,
  linkedin: LinkedInLogo,
  hubspot: HubSpotLogo,
  jira: JiraLogo,
  salesforce: SalesforceLogo,
};

// Get tool logo by name (case insensitive, handles variations)
export const getToolLogo = (toolName: string): React.FC<LogoProps> | null => {
  const normalized = toolName.toLowerCase().replace(/[_\s]/g, '-');
  return TOOL_LOGOS[normalized] || null;
};

// Tool Logo component that renders the appropriate logo
interface ToolLogoComponentProps extends LogoProps {
  tool: string;
  fallbackEmoji?: string;
}

export const ToolLogo: React.FC<ToolLogoComponentProps> = ({ 
  tool, 
  size = 20, 
  className = '',
  fallbackEmoji = '🔧'
}) => {
  const Logo = getToolLogo(tool);
  
  if (Logo) {
    return <Logo size={size} className={className} />;
  }
  
  // Fallback to emoji or first letter
  return (
    <span 
      className={`inline-flex items-center justify-center text-xs ${className}`}
      style={{ width: size, height: size }}
    >
      {fallbackEmoji}
    </span>
  );
};

export default ToolLogo;
