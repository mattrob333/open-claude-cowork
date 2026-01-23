import React, { useState } from 'react';

interface BrowserPreviewProps {
  /** Base64-encoded image data */
  imageData?: string;
  /** URL being displayed */
  url?: string;
  /** Page title */
  title?: string;
  /** Whether the browser is currently loading */
  isLoading?: boolean;
  /** Callback when close is clicked */
  onClose?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * BrowserPreview Component
 *
 * Displays browser screenshots with a realistic browser chrome frame.
 * Includes address bar, navigation buttons, and page title.
 */
const BrowserPreview: React.FC<BrowserPreviewProps> = ({
  imageData,
  url = '',
  title = 'Browser Preview',
  isLoading = false,
  onClose,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format URL for display (truncate if too long)
  const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;

  // Extract domain for favicon placeholder
  const domain = url ? new URL(url).hostname : '';

  return (
    <div className={`browser-preview rounded-lg overflow-hidden shadow-xl border border-white/10 ${
      isExpanded ? 'fixed inset-4 z-50' : ''
    } ${compact ? 'max-w-md' : 'w-full'}`}>
      {/* Browser Chrome - Title Bar */}
      <div className="bg-[#2d2d2d] h-8 flex items-center px-3 gap-2">
        {/* Traffic Lights */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors"
            title="Close"
          />
          <button
            className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors"
            title="Minimize"
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors"
            title={isExpanded ? 'Exit Fullscreen' : 'Fullscreen'}
          />
        </div>

        {/* Page Title */}
        <div className="flex-1 text-center">
          <span className="text-[11px] text-white/60 font-medium truncate block px-4">
            {title}
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-12" />
      </div>

      {/* Address Bar */}
      <div className="bg-[#3d3d3d] h-10 flex items-center px-3 gap-2 border-b border-black/20">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
            title="Back"
            disabled
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
            title="Forward"
            disabled
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className={`p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors ${
              isLoading ? 'animate-spin' : ''
            }`}
            title="Refresh"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center bg-[#1a1a1a] rounded-md px-3 py-1.5 gap-2">
          {/* Lock Icon (HTTPS indicator) */}
          {url.startsWith('https') && (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor">
              <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
            </svg>
          )}

          {/* Favicon placeholder */}
          {domain && (
            <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-[8px] text-white/60 uppercase font-bold">
                {domain.charAt(0)}
              </span>
            </div>
          )}

          {/* URL */}
          <span className="text-[12px] text-white/70 truncate flex-1 font-mono">
            {displayUrl || 'about:blank'}
          </span>

          {/* Loading indicator */}
          {isLoading && (
            <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
            title="Share"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`bg-white relative ${compact ? 'h-48' : 'h-64'} ${isExpanded ? 'flex-1 h-auto' : ''}`}>
        {imageData ? (
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={`Screenshot of ${title}`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
            <div className="flex flex-col items-center gap-3 text-white/20">
              <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span className="text-sm">
                {isLoading ? 'Loading page...' : 'No screenshot available'}
              </span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && imageData && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-xs text-white/80">Loading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar (optional) */}
      {!compact && (
        <div className="bg-[#2d2d2d] h-6 flex items-center px-3 border-t border-black/20">
          <span className="text-[10px] text-white/40">
            {isLoading ? 'Loading...' : url ? `Viewing: ${domain}` : 'Ready'}
          </span>
        </div>
      )}

      {/* Expanded Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

/**
 * Compact browser preview for tool logs
 */
export const BrowserPreviewCompact: React.FC<{
  imageData: string;
  url?: string;
  onClick?: () => void;
}> = ({ imageData, url, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="browser-preview-compact rounded-md overflow-hidden border border-white/10 cursor-pointer hover:border-accent/50 transition-colors group"
    >
      {/* Mini Chrome */}
      <div className="bg-[#2d2d2d] h-5 flex items-center px-2 gap-1.5">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
          <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
          <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-[#1a1a1a] rounded h-3 mx-2">
          <span className="text-[8px] text-white/40 px-1.5 truncate block leading-3">
            {url || 'about:blank'}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="h-24 bg-white relative">
        <img
          src={`data:image/png;base64,${imageData}`}
          alt="Browser screenshot"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Click to expand
          </span>
        </div>
      </div>
    </div>
  );
};

export default BrowserPreview;
