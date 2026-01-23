/**
 * Service name to logo key mapping
 * Maps various service identifiers to their corresponding logo file names
 */

export const SERVICE_LOGO_MAP: Record<string, string> = {
  // Gmail / Email
  'gmail': 'gmail',
  'email': 'gmail',
  'mail': 'gmail',

  // Slack
  'slack': 'slack',

  // GitHub
  'github': 'github',
  'git': 'github',

  // GitLab
  'gitlab': 'gitlab',

  // Google Drive
  'google-drive': 'google-drive',
  'googledrive': 'google-drive',
  'gdrive': 'google-drive',
  'drive': 'google-drive',

  // Google Docs
  'google-docs': 'google-docs',
  'googledocs': 'google-docs',
  'docs': 'google-docs',
  'document': 'google-docs',

  // Google Sheets
  'google-sheets': 'google-sheets',
  'googlesheets': 'google-sheets',
  'sheets': 'google-sheets',
  'spreadsheet': 'google-sheets',

  // Google Calendar
  'google-calendar': 'google-calendar',
  'googlecalendar': 'google-calendar',
  'calendar': 'google-calendar',
  'gcal': 'google-calendar',

  // Notion
  'notion': 'notion',

  // Trello
  'trello': 'trello',

  // Asana
  'asana': 'asana',

  // Jira
  'jira': 'jira',

  // Discord
  'discord': 'discord',

  // Microsoft Teams
  'microsoft-teams': 'microsoft-teams',
  'microsoftteams': 'microsoft-teams',
  'teams': 'microsoft-teams',
  'msteams': 'microsoft-teams',

  // LinkedIn
  'linkedin': 'linkedin',

  // Twitter/X
  'twitter': 'twitter',
  'x': 'twitter',

  // Salesforce
  'salesforce': 'salesforce',
  'crm': 'salesforce',

  // HubSpot
  'hubspot': 'hubspot',

  // Fireflies
  'fireflies': 'fireflies',

  // Otter
  'otter': 'otter',

  // Firecrawl
  'firecrawl': 'firecrawl',
  'crawl': 'firecrawl',
  'scrape': 'firecrawl',
};

/**
 * Get the logo key for a service name
 * Returns 'default' if no matching logo is found
 */
export function getLogoKey(serviceName: string): string {
  const normalized = serviceName.toLowerCase().replace(/_/g, '-');
  return SERVICE_LOGO_MAP[normalized] || 'default';
}

/**
 * List of all available service logo keys
 */
export const AVAILABLE_LOGOS = [
  'gmail',
  'slack',
  'github',
  'gitlab',
  'google-drive',
  'google-docs',
  'google-sheets',
  'google-calendar',
  'notion',
  'trello',
  'asana',
  'jira',
  'discord',
  'microsoft-teams',
  'linkedin',
  'twitter',
  'salesforce',
  'hubspot',
  'fireflies',
  'otter',
  'firecrawl',
  'default',
] as const;

export type ServiceLogoKey = typeof AVAILABLE_LOGOS[number];
