/**
 * ContextChips Component
 *
 * Displays ephemeral documents as chips above the chat input.
 * Supports drag-and-drop to add files for immediate context.
 * Exposes triggerFileSelect via ref for external triggering.
 */

import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ICONS } from '../constants';
import { EphemeralDocument } from '../types';
import { extractTextContent, isSupportedFileType, validateFileSize, getFileTypeDescription } from '../utils/fileExtractor';

interface ContextChipsProps {
  documents: EphemeralDocument[];
  onAdd: (doc: EphemeralDocument) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export interface ContextChipsHandle {
  triggerFileSelect: () => void;
}

const ContextChips = forwardRef<ContextChipsHandle, ContextChipsProps>(({
  documents,
  onAdd,
  onRemove,
  onToggle,
  disabled = false
}, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose triggerFileSelect method via ref
  useImperativeHandle(ref, () => ({
    triggerFileSelect: () => {
      fileInputRef.current?.click();
    }
  }), []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!isSupportedFileType(file.name)) {
      setExtractError(`Unsupported file type: ${file.name.split('.').pop()}`);
      setTimeout(() => setExtractError(null), 3000);
      return;
    }

    // Validate file size (5MB max for ephemeral)
    if (!validateFileSize(file, 5)) {
      setExtractError('File too large (max 5MB for ephemeral context)');
      setTimeout(() => setExtractError(null), 3000);
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const content = await extractTextContent(file);

      const newDoc: EphemeralDocument = {
        id: `ephemeral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() || 'txt',
        content,
        isActive: true,
        addedAt: Date.now()
      };

      onAdd(newDoc);
    } catch (error) {
      console.error('File extraction error:', error);
      setExtractError(error instanceof Error ? error.message : 'Failed to extract file content');
      setTimeout(() => setExtractError(null), 5000);
    } finally {
      setIsExtracting(false);
    }
  }, [onAdd]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isExtracting) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Process only the first file for now
    await processFile(files[0]);
  }, [disabled, isExtracting, processFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processFile(files[0]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      pdf: '📄',
      docx: '📝',
      doc: '📝',
      txt: '📃',
      md: '📋',
      json: '🗃️',
      csv: '📊',
      js: '⚡',
      ts: '🔷',
      jsx: '⚛️',
      tsx: '⚛️',
      py: '🐍',
      html: '🌐',
      css: '🎨'
    };
    return iconMap[type] || '📄';
  };

  // Don't render anything if no documents and not dragging
  const hasContent = documents.length > 0 || isDragOver || isExtracting || extractError;

  if (!hasContent) {
    return (
      <>
        {/* Hidden file input - always render for external trigger */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".txt,.md,.json,.csv,.pdf,.docx,.doc,.js,.ts,.jsx,.tsx,.py,.html,.css,.xml,.yaml,.yml"
        />
      </>
    );
  }

  return (
    <div className="w-full">
      {/* Error message */}
      {extractError && (
        <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <ICONS.AlertCircle />
          {extractError}
        </div>
      )}

      {/* Chips container - also serves as drop zone */}
      <div
        className={`flex flex-wrap items-center gap-2 min-h-[36px] px-2 py-1 rounded-xl transition-all ${
          isDragOver
            ? 'bg-accent/10 border-2 border-dashed border-accent'
            : documents.length > 0
            ? 'bg-white/5'
            : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Document chips */}
        {documents.map(doc => (
          <div
            key={doc.id}
            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              doc.isActive
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-white/10 text-secondaryText border border-white/10'
            }`}
            onClick={() => onToggle(doc.id)}
            title={`${doc.isActive ? 'Click to disable' : 'Click to enable'} - ${getFileTypeDescription(doc.name)}`}
          >
            <span className="text-sm">{getFileIcon(doc.type)}</span>
            <span className="max-w-[120px] truncate font-medium">{doc.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(doc.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-0.5"
              title="Remove from context"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}

        {/* Extracting indicator */}
        {isExtracting && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs">
            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span>Extracting...</span>
          </div>
        )}

        {/* Drop zone hint when dragging */}
        {isDragOver && !isExtracting && (
          <span className="text-xs text-accent">Drop file here</span>
        )}
      </div>

      {/* Context size indicator */}
      {documents.length > 0 && (
        <div className="mt-1 px-2 text-[10px] text-secondaryText/60">
          {documents.filter(d => d.isActive).length} of {documents.length} files active in context
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".txt,.md,.json,.csv,.pdf,.docx,.doc,.js,.ts,.jsx,.tsx,.py,.html,.css,.xml,.yaml,.yml"
      />
    </div>
  );
});

ContextChips.displayName = 'ContextChips';

export default ContextChips;
