/**
 * EmailTemplateEditor Component
 *
 * Specialized editor for creating email templates with:
 * - Subject line input
 * - Rich text body using TipTap
 * - HTML preview mode
 * - Save/load template functionality
 */

import React, { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';
import { ICONS } from '../../constants';
import { SERVER_URL } from '../../constants';

// ============================================================
// TYPES
// ============================================================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailTemplateEditorProps {
  initialTemplate?: Partial<EmailTemplate>;
  onSave?: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose?: () => void;
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  initialTemplate,
  onSave,
  onClose,
  className = ''
}) => {
  // State
  const [name, setName] = useState(initialTemplate?.name || '');
  const [subject, setSubject] = useState(initialTemplate?.subject || '');
  const [body, setBody] = useState(initialTemplate?.body || '');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load saved templates
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/email-templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) return;

    setIsSaving(true);
    try {
      const template = { name: name.trim(), subject: subject.trim(), body };

      const response = await fetch(`${SERVER_URL}/api/email-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        onSave?.(template);
        loadTemplates(); // Refresh templates list
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template: EmailTemplate) => {
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setShowTemplateSelector(false);
  };

  // Generate HTML preview
  const generateHtmlPreview = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin: 1em 0; }
    a { color: #0066cc; }
    ul, ol { padding-left: 2em; }
    blockquote {
      border-left: 3px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
  };

  // Copy HTML to clipboard
  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(generateHtmlPreview());
  };

  return (
    <div className={`flex flex-col h-full bg-panel ${className}`}>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
            <ICONS.Mail />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-primaryText">Email Template</span>
            <span className="text-[10px] text-secondaryText uppercase tracking-wider">Editor</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Template Selector Button */}
          <button
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className="px-3 py-1.5 text-sm text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-colors flex items-center gap-2"
          >
            <ICONS.FolderOpen />
            Templates
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-colors"
            >
              <ICONS.X />
            </button>
          )}
        </div>
      </div>

      {/* Template Selector Dropdown */}
      {showTemplateSelector && (
        <div className="absolute top-14 right-4 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-border">
            <span className="text-xs font-semibold text-secondaryText uppercase tracking-wider">
              Saved Templates
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isLoadingTemplates ? (
              <div className="p-4 text-center text-secondaryText">
                <ICONS.Loader />
                <span className="ml-2">Loading...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-secondaryText text-sm">
                No saved templates yet
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full px-4 py-3 text-left hover:bg-hover transition-colors border-b border-border last:border-0"
                >
                  <div className="text-sm font-medium text-primaryText">{template.name}</div>
                  <div className="text-xs text-secondaryText truncate">{template.subject}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Template Name */}
      <div className="px-4 pt-4">
        <label className="block text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">
          Template Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Follow-up Email"
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primaryText placeholder:text-secondaryText focus:border-accent outline-none transition-all"
        />
      </div>

      {/* Subject Line */}
      <div className="px-4 pt-4">
        <label className="block text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primaryText placeholder:text-secondaryText focus:border-accent outline-none transition-all"
        />
      </div>

      {/* View Toggle */}
      <div className="px-4 pt-4 flex items-center gap-2">
        <button
          onClick={() => setShowPreview(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !showPreview
              ? 'bg-accent text-canvas'
              : 'text-secondaryText hover:text-primaryText hover:bg-hover'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showPreview
              ? 'bg-accent text-canvas'
              : 'text-secondaryText hover:text-primaryText hover:bg-hover'
          }`}
        >
          Preview HTML
        </button>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto p-4">
        {showPreview ? (
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b">
              <span className="text-xs font-medium text-gray-600">HTML Preview</span>
              <button
                onClick={handleCopyHtml}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <ICONS.Copy />
                Copy HTML
              </button>
            </div>
            <iframe
              srcDoc={generateHtmlPreview()}
              title="Email Preview"
              className="w-full h-96 border-0"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Write your email body..."
            className="min-h-[300px]"
          />
        )}
      </div>

      {/* Footer */}
      <div className="h-16 flex items-center justify-between px-4 border-t border-border shrink-0 bg-white/[0.02]">
        <div className="text-xs text-secondaryText">
          {body.length > 0 && (
            <span>{body.replace(/<[^>]*>/g, '').length} characters</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-secondaryText hover:text-primaryText transition-colors"
          >
            <ICONS.Copy />
            Copy HTML
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !subject.trim()}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent hover:bg-accent/90 text-canvas text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <ICONS.Loader /> : <ICONS.Save />}
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
