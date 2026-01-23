/**
 * Utility functions to extract and normalize service names from MCP tool names
 */

/**
 * Extract service name from MCP Composio tool name
 * e.g., "mcp_composio_GMAIL_SEND_EMAIL" → "GMAIL"
 * e.g., "mcp_composio_GOOGLE_DRIVE_CREATE_FOLDER" → "GOOGLE_DRIVE"
 */
export function extractServiceFromToolName(toolName: string): string | null {
  // Match mcp_composio_ prefix followed by service name (uppercase letters and underscores)
  // The pattern captures everything between mcp_composio_ and the last action part
  const composioMatch = toolName.match(/^mcp_composio_([A-Z][A-Z0-9_]*?)_[A-Z][A-Z0-9_]*$/);
  if (composioMatch) {
    return composioMatch[1];
  }

  // Also try to detect service from common tool name patterns
  const lowerName = toolName.toLowerCase();

  // Check for service keywords in tool name
  const servicePatterns: [RegExp, string][] = [
    [/gmail|send_email|email/i, 'GMAIL'],
    [/slack|send_message|channel/i, 'SLACK'],
    [/github|git_|repo|pull_request|issue/i, 'GITHUB'],
    [/google_drive|gdrive|drive_/i, 'GOOGLE_DRIVE'],
    [/google_docs|docs_/i, 'GOOGLE_DOCS'],
    [/google_sheets|sheets_|spreadsheet/i, 'GOOGLE_SHEETS'],
    [/notion/i, 'NOTION'],
    [/trello|board|card/i, 'TRELLO'],
    [/jira|ticket|sprint/i, 'JIRA'],
    [/asana|task/i, 'ASANA'],
    [/discord/i, 'DISCORD'],
    [/teams|microsoft_teams/i, 'MICROSOFT_TEAMS'],
    [/linkedin/i, 'LINKEDIN'],
    [/twitter|tweet/i, 'TWITTER'],
    [/calendar|event|schedule/i, 'GOOGLE_CALENDAR'],
    [/salesforce|crm/i, 'SALESFORCE'],
    [/hubspot/i, 'HUBSPOT'],
    [/fireflies|transcript/i, 'FIREFLIES'],
    [/otter/i, 'OTTER'],
    [/firecrawl|crawl|scrape/i, 'FIRECRAWL'],
    [/gitlab/i, 'GITLAB'],
  ];

  for (const [pattern, service] of servicePatterns) {
    if (pattern.test(lowerName)) {
      return service;
    }
  }

  return null;
}

/**
 * Normalize service name to kebab-case for logo file lookup
 * e.g., "GOOGLE_DRIVE" → "google-drive"
 * e.g., "GMAIL" → "gmail"
 */
export function normalizeServiceName(service: string): string {
  return service.toLowerCase().replace(/_/g, '-');
}

/**
 * Extract unique services from a system prompt by detecting service mentions
 */
export function extractServicesFromPrompt(systemPrompt: string): string[] {
  const services = new Set<string>();
  const lowerPrompt = systemPrompt.toLowerCase();

  const serviceKeywords: Record<string, string[]> = {
    'gmail': ['gmail', 'email', 'send email', 'compose email'],
    'slack': ['slack', 'slack message', 'slack channel'],
    'github': ['github', 'git', 'repository', 'pull request', 'pr', 'issue'],
    'google-drive': ['google drive', 'gdrive', 'drive'],
    'google-docs': ['google docs', 'google doc', 'document'],
    'google-sheets': ['google sheets', 'spreadsheet', 'sheet'],
    'notion': ['notion'],
    'trello': ['trello', 'kanban'],
    'jira': ['jira', 'ticket', 'sprint'],
    'asana': ['asana'],
    'discord': ['discord'],
    'microsoft-teams': ['teams', 'microsoft teams'],
    'linkedin': ['linkedin'],
    'twitter': ['twitter', 'tweet', 'x.com'],
    'google-calendar': ['calendar', 'event', 'meeting', 'schedule'],
    'salesforce': ['salesforce', 'crm'],
    'hubspot': ['hubspot'],
    'fireflies': ['fireflies', 'meeting notes', 'transcript'],
    'otter': ['otter', 'otter.ai'],
    'firecrawl': ['firecrawl', 'crawl', 'scrape', 'web scrape'],
    'gitlab': ['gitlab'],
  };

  for (const [service, keywords] of Object.entries(serviceKeywords)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        services.add(service);
        break;
      }
    }
  }

  return Array.from(services);
}
