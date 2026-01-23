import React from 'react';
import { getLogoKey, ServiceLogoKey } from '../assets/logos/serviceMapping';
import { extractServiceFromToolName, normalizeServiceName } from '../utils/serviceExtractor';

// Inline SVG components for each service logo
const GmailLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
  </svg>
);

const SlackLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
    <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
    <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
    <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

const GithubLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#8B949E" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const GoogleDriveLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#4285F4" d="M6.6 21.8L1 12l5.6-9.8h5.6L6.6 12l5.6 9.8z"/>
    <path fill="#FBBC05" d="M23 12l-5.6 9.8H6.6L12.2 12H23z"/>
    <path fill="#34A853" d="M12.2 2.2h10.6L17.2 12H6.6l5.6-9.8z"/>
  </svg>
);

const GoogleDocsLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#4285F4" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
    <path fill="#A1C2FA" d="M14 2v6h6"/>
    <path fill="#FFFFFF" d="M7 13h10v1H7zm0 2h10v1H7zm0 2h7v1H7z"/>
  </svg>
);

const GoogleSheetsLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#0F9D58" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
    <path fill="#87CEAC" d="M14 2v6h6"/>
    <path fill="#FFFFFF" d="M7 12h10v8H7v-8zm1 1v2h3v-2H8zm4 0v2h4v-2h-4zm-4 3v2h3v-2H8zm4 0v2h4v-2h-4z"/>
  </svg>
);

const GoogleCalendarLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
    <path fill="#FFFFFF" d="M5 9h14v11H5z"/>
    <path fill="#EA4335" d="M9 13h2v2H9zm4 0h2v2h-2zm-4 4h2v2H9zm4 0h2v2h-2z"/>
  </svg>
);

const NotionLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM2.361 1.407L16.087.26c1.681-.14 2.1.093 2.801.606l3.876 2.75c.467.327.607.747.607 1.307v17.2c0 1.026-.373 1.633-1.68 1.726l-15.458.934c-.98.046-1.448-.094-1.961-.747L1.02 20.07c-.56-.746-.793-1.306-.793-1.96V2.94c0-.84.373-1.493 2.134-1.533z"/>
  </svg>
);

const TrelloLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#0079BF" d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .795-.645 1.44-1.44 1.44h-4.44c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/>
  </svg>
);

const AsanaLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#F06A6A" d="M18.78 12.653c-2.882 0-5.22 2.335-5.22 5.217 0 2.882 2.338 5.217 5.22 5.217 2.88 0 5.218-2.335 5.218-5.217 0-2.882-2.337-5.217-5.218-5.217zM5.218 12.653C2.337 12.653 0 14.988 0 17.87c0 2.882 2.337 5.217 5.218 5.217 2.882 0 5.22-2.335 5.22-5.217 0-2.882-2.338-5.217-5.22-5.217zM17.218 5.217c0 2.882-2.337 5.217-5.218 5.217-2.882 0-5.22-2.335-5.22-5.217C6.78 2.335 9.118 0 12 0c2.88 0 5.218 2.335 5.218 5.217z"/>
  </svg>
);

const JiraLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#2684FF" d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

const GitlabLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#FC6D26" d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.386 9.45.044 13.587a.924.924 0 00.331 1.023L12 23.054l11.625-8.443a.92.92 0 00.33-1.024"/>
    <path fill="#E24329" d="M12 23.054L16.418 9.45H7.582L12 23.054z"/>
    <path fill="#FC6D26" d="M12 23.054L7.582 9.45H1.386L12 23.054zM12 23.054l4.418-13.604h6.196L12 23.054z"/>
  </svg>
);

const DiscordLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#5865F2" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
  </svg>
);

const MicrosoftTeamsLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#5059C9" d="M20.625 8.5h-6.25a.625.625 0 00-.625.625v6.25c0 .345.28.625.625.625h6.25c.345 0 .625-.28.625-.625v-6.25a.625.625 0 00-.625-.625z"/>
    <circle fill="#5059C9" cx="17.5" cy="5" r="2.5"/>
    <path fill="#7B83EB" d="M12.5 7H6.25A.625.625 0 005.625 7.625v9.375a.625.625 0 00.625.625H12.5a.625.625 0 00.625-.625V7.625A.625.625 0 0012.5 7z"/>
    <circle fill="#7B83EB" cx="9.375" cy="4" r="3"/>
  </svg>
);

const LinkedinLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TwitterLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const SalesforceLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#00A1E0" d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.16 2.37 5.16 5.28s-2.31 5.28-5.16 5.28c-.45 0-.9-.06-1.35-.165a3.94 3.94 0 0 1-3.51 2.175c-.51 0-.99-.105-1.44-.27A4.71 4.71 0 0 1 8.16 21c-1.68 0-3.15-.9-3.99-2.25-.42.09-.84.135-1.29.135-2.58 0-4.68-2.1-4.68-4.695 0-2.595 2.1-4.695 4.68-4.695.6 0 1.17.12 1.695.33A4.47 4.47 0 0 1 8.7 5.01a4.47 4.47 0 0 1 1.306.405z"/>
  </svg>
);

const HubspotLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#FF7A59" d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066a2.2 2.2 0 00-2.2-2.2h-.065a2.2 2.2 0 00-2.2 2.2v.066c0 .9.543 1.67 1.32 2.01v2.818a5.91 5.91 0 00-2.548 1.2L6.986 3.938a2.528 2.528 0 00.072-.584A2.527 2.527 0 004.53.826a2.527 2.527 0 00-2.528 2.528 2.527 2.527 0 002.528 2.527c.382 0 .74-.092 1.063-.248l6.636 5.132a5.876 5.876 0 00-.642 2.67 5.91 5.91 0 00.702 2.79l-2.1 2.1a2.178 2.178 0 00-.632-.098 2.19 2.19 0 100 4.38 2.19 2.19 0 002.19-2.19c0-.225-.036-.44-.098-.647l2.06-2.06a5.897 5.897 0 103.455-9.78zm-.014 8.652a2.742 2.742 0 110-5.484 2.742 2.742 0 010 5.484z"/>
  </svg>
);

const FirefliesLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#6C3BF5" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 4a2 2 0 110 4 2 2 0 010-4zm0 12a6 6 0 01-5.196-3h10.392A6 6 0 0112 18zm3.5-6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
  </svg>
);

const OtterLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#1877F2" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm-2 15a2 2 0 110-4 2 2 0 010 4zm4 0a2 2 0 110-4 2 2 0 010 4zm3-7H7V8a5 5 0 0110 0v2z"/>
  </svg>
);

const FirecrawlLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#FF6B35" d="M12 2c-3.5 0-6 3.5-6 7 0 2.5 1 4.5 2 6 1 1.5 2 3 2 5 0 1 .5 2 2 2s2-1 2-2c0-2 1-3.5 2-5 1-1.5 2-3.5 2-6 0-3.5-2.5-7-6-7z"/>
    <path fill="#FF8C5A" d="M12 6c-1.5 0-3 1.5-3 3.5 0 1.5 1 2.5 2 3.5.5.5 1 1.5 1 2.5"/>
  </svg>
);

const DefaultLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M6 9L9 12L6 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Logo component map
const LOGO_COMPONENTS: Record<ServiceLogoKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'gmail': GmailLogo,
  'slack': SlackLogo,
  'github': GithubLogo,
  'gitlab': GitlabLogo,
  'google-drive': GoogleDriveLogo,
  'google-docs': GoogleDocsLogo,
  'google-sheets': GoogleSheetsLogo,
  'google-calendar': GoogleCalendarLogo,
  'notion': NotionLogo,
  'trello': TrelloLogo,
  'asana': AsanaLogo,
  'jira': JiraLogo,
  'discord': DiscordLogo,
  'microsoft-teams': MicrosoftTeamsLogo,
  'linkedin': LinkedinLogo,
  'twitter': TwitterLogo,
  'salesforce': SalesforceLogo,
  'hubspot': HubspotLogo,
  'fireflies': FirefliesLogo,
  'otter': OtterLogo,
  'firecrawl': FirecrawlLogo,
  'default': DefaultLogo,
};

interface ServiceLogoProps {
  /** Service name (e.g., 'gmail', 'GMAIL', 'google-drive') */
  service: string;
  /** Size in pixels or Tailwind class (default: 16) */
  size?: number | string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate (pulse effect) */
  animate?: boolean;
}

/**
 * ServiceLogo - Renders a branded logo for a service
 */
export const ServiceLogo: React.FC<ServiceLogoProps> = ({
  service,
  size = 16,
  className = '',
  animate = false,
}) => {
  const logoKey = getLogoKey(service) as ServiceLogoKey;
  const LogoComponent = LOGO_COMPONENTS[logoKey] || LOGO_COMPONENTS['default'];

  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : {};
  const sizeClass = typeof size === 'string' ? size : '';

  return (
    <LogoComponent
      style={sizeStyle}
      className={`${sizeClass} ${className} ${animate ? 'animate-pulse' : ''}`}
    />
  );
};

interface ServiceLogoFromToolProps {
  /** Full tool name (e.g., 'mcp_composio_GMAIL_SEND_EMAIL') */
  toolName: string;
  /** Size in pixels (default: 16) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate */
  animate?: boolean;
}

/**
 * ServiceLogoFromTool - Extracts service from tool name and renders logo
 */
export const ServiceLogoFromTool: React.FC<ServiceLogoFromToolProps> = ({
  toolName,
  size = 16,
  className = '',
  animate = false,
}) => {
  const service = extractServiceFromToolName(toolName);
  const normalizedService = service ? normalizeServiceName(service) : 'default';

  return (
    <ServiceLogo
      service={normalizedService}
      size={size}
      className={className}
      animate={animate}
    />
  );
};

export default ServiceLogo;
