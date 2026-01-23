import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface DocumentPreviewProps {
  /** Document name */
  name: string;
  /** Document type (pdf, docx, txt, etc.) */
  type: string;
  /** Signed URL to fetch the document */
  url?: string;
  /** File size in bytes */
  size?: number;
  /** Whether the document is loading */
  isLoading?: boolean;
  /** Callback when close is clicked */
  onClose: () => void;
  /** Callback to download the document */
  onDownload?: () => void;
}

/**
 * DocumentPreview Component
 *
 * Displays documents in a modal canvas with support for PDFs, images, and text files.
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  name,
  type,
  url,
  size,
  isLoading = false,
  onClose,
  onDownload
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file type icon
  const getTypeIcon = () => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            <path d="M8 12h8v1H8zm0 2h8v1H8zm0 2h5v1H8z"/>
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
          </svg>
        );
      case 'txt':
      case 'md':
        return <ICONS.FileText />;
      case 'json':
      case 'csv':
        return <ICONS.Database />;
      default:
        return <ICONS.File />;
    }
  };

  // Check if document type is previewable
  const isPreviewable = () => {
    const previewableTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt', 'md', 'json', 'csv'];
    return previewableTypes.includes(type.toLowerCase());
  };

  // Check if it's an image
  const isImage = () => {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(type.toLowerCase());
  };

  // Check if it's a text-based file
  const isText = () => {
    return ['txt', 'md', 'json', 'csv'].includes(type.toLowerCase());
  };

  // Load text content for text-based files
  useEffect(() => {
    if (url && isText()) {
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load document');
          return res.text();
        })
        .then(text => setTextContent(text))
        .catch(err => setLoadError(err.message));
    }
  }, [url, type]);

  // Render content based on type
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-10 h-10 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-secondaryText">Loading document...</span>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-red-400">
          <ICONS.AlertTriangle />
          <span className="text-sm">{loadError}</span>
        </div>
      );
    }

    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-secondaryText">
          <ICONS.FileText />
          <span className="text-sm">No preview available</span>
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-accent text-canvas rounded-lg text-sm font-medium hover:bg-accentHover transition-colors"
            >
              Download to view
            </button>
          )}
        </div>
      );
    }

    // PDF preview
    if (type.toLowerCase() === 'pdf') {
      return (
        <iframe
          src={`${url}#toolbar=1&navpanes=0`}
          className="w-full h-full border-0"
          title={name}
        />
      );
    }

    // Image preview
    if (isImage()) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-[#0a0a0a]">
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={() => setLoadError('Failed to load image')}
          />
        </div>
      );
    }

    // Text preview
    if (isText() && textContent !== null) {
      return (
        <div className="w-full h-full overflow-auto p-6 bg-[#0a0a0a]">
          <pre className="text-sm text-primaryText font-mono whitespace-pre-wrap break-words leading-relaxed">
            {textContent}
          </pre>
        </div>
      );
    }

    // Fallback - download button
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-secondaryText">
        <div className="text-6xl opacity-20">{getTypeIcon()}</div>
        <span className="text-lg font-medium text-primaryText">{name}</span>
        <span className="text-sm">Preview not available for this file type</span>
        {onDownload && (
          <button
            onClick={onDownload}
            className="px-6 py-3 bg-accent text-canvas rounded-xl text-sm font-bold hover:bg-accentHover transition-colors flex items-center gap-2"
          >
            <ICONS.Download />
            Download File
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-panel rounded-2xl overflow-hidden shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header - Document Chrome */}
        <div className="bg-[#2d2d2d] flex items-center justify-between px-4 py-3 border-b border-black/20">
          <div className="flex items-center gap-3">
            {/* Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors"
                title="Close"
              />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>

            {/* Document info */}
            <div className="flex items-center gap-2 ml-2">
              <div className="text-accent/80">{getTypeIcon()}</div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-primaryText truncate max-w-[300px]">
                  {name}
                </span>
                <span className="text-[10px] text-secondaryText uppercase">
                  {type.toUpperCase()} {size && `• ${formatSize(size)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-secondaryText hover:text-primaryText hover:bg-white/5 rounded-lg transition-colors"
                title="Download"
              >
                <ICONS.Download />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-secondaryText hover:text-primaryText hover:bg-white/5 rounded-lg transition-colors"
              title="Close"
            >
              <ICONS.X />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#1a1a1a] overflow-hidden">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="bg-[#2d2d2d] px-4 py-2 border-t border-black/20 flex items-center justify-between">
          <span className="text-[10px] text-secondaryText">
            {isPreviewable() ? 'Viewing document' : 'Download to view full document'}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-secondaryText">
            <span>Press ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact document card for lists
 */
export const DocumentCard: React.FC<{
  name: string;
  type: string;
  size?: number;
  status?: 'pending' | 'processing' | 'ready' | 'error';
  isActive?: boolean;
  onClick?: () => void;
  onToggle?: () => void;
}> = ({ name, type, size, status = 'ready', isActive = false, onClick, onToggle }) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" title="Pending" />;
      case 'processing':
        return <div className="w-2 h-2 rounded-full bg-accent animate-pulse" title="Processing" />;
      case 'error':
        return <div className="w-2 h-2 rounded-full bg-red-500" title="Error" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-green-500" title="Ready" />;
    }
  };

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group relative overflow-hidden
        ${isActive ? 'bg-accent/10 border-l-2 border-accent' : 'bg-white/[0.03] hover:bg-white/[0.05]'}`}
    >
      {/* Checkbox */}
      {onToggle && (
        <div className="flex items-center justify-center p-1" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => {}}
            className="w-3 h-3 accent-accent cursor-pointer"
          />
        </div>
      )}

      {/* Click area for preview */}
      <div
        className="flex items-center gap-2 flex-1 min-w-0"
        onClick={onClick}
      >
        <div className="text-accent/60 group-hover:text-accent">
          <ICONS.FileText />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium truncate transition-colors ${isActive ? 'text-accent' : 'text-secondaryText group-hover:text-primaryText'}`}>
              {name}
            </span>
            {getStatusIndicator()}
          </div>
          <span className="text-[9px] text-white/20">
            {type.toUpperCase()} {size && `• ${formatSize(size)}`}
          </span>
        </div>

        {/* View indicator on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-accent text-[9px] font-medium">
          View
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
