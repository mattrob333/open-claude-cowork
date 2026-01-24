import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import RichTextEditor from './editor/RichTextEditor';

interface CanvasDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onCopy?: (content: string) => void;
  onExport?: (content: string, format: 'html' | 'text') => void;
}

const CanvasDrawer: React.FC<CanvasDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Document',
  initialContent = '',
  onSave,
  onCopy,
  onExport
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML for plain text copy
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(content);
  };

  const handleExport = (format: 'html' | 'text') => {
    const exportContent = format === 'html' ? content : content.replace(/<[^>]*>/g, '');
    const blob = new Blob([exportContent], {
      type: format === 'html' ? 'text/html' : 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.${format === 'html' ? 'html' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExport?.(exportContent, format);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-panel border-l border-border z-50 flex flex-col shadow-2xl transform transition-transform duration-300">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
              <ICONS.FileText />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-primaryText">{title}</span>
              <span className="text-[10px] text-secondaryText uppercase tracking-wider">Canvas Editor</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-colors"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start editing your document..."
            className="min-h-full"
          />
        </div>

        {/* Footer */}
        <div className="h-16 flex items-center justify-between px-4 border-t border-border shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            {/* Export dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-secondaryText hover:text-primaryText transition-colors">
                <ICONS.Download />
                Export
                <ICONS.ChevronDown />
              </button>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                <div className="bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button
                    onClick={() => handleExport('html')}
                    className="w-full px-4 py-2 text-left text-sm text-primaryText hover:bg-hover"
                  >
                    Export as HTML
                  </button>
                  <button
                    onClick={() => handleExport('text')}
                    className="w-full px-4 py-2 text-left text-sm text-primaryText hover:bg-hover"
                  >
                    Export as Text
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-secondaryText hover:text-primaryText transition-colors"
            >
              {copied ? <ICONS.CheckCircle /> : <ICONS.Copy />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent hover:bg-accent/90 text-canvas text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? <ICONS.Loader /> : <ICONS.Save />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default CanvasDrawer;
