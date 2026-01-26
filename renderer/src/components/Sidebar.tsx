import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Session, KnowledgeAsset } from '../types';
import { ICONS } from '../constants';
import { DocumentCard } from './DocumentPreview';

// Allowed file types and max size
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

interface SidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onDeleteSession?: (id: string) => void;
  assets: KnowledgeAsset[];
  onToggleAsset: (id: string) => void;
  onDeleteAsset?: (id: string) => void;
  onUploadFile?: (file: File) => Promise<void>;
  onViewDocument?: (asset: KnowledgeAsset) => void;
  onOpenKnowledgeBase?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onRenameSession,
  onDeleteSession,
  assets,
  onToggleAsset,
  onDeleteAsset,
  onUploadFile,
  onViewDocument,
  onOpenKnowledgeBase
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // Handle rename
  const handleStartRename = (session: Session) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setOpenMenuId(null);
  };

  const handleSaveRename = () => {
    if (editingSessionId && editingTitle.trim() && onRenameSession) {
      onRenameSession(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (onDeleteSession) {
      onDeleteSession(id);
    }
    setOpenMenuId(null);
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadProgress({ fileName: file.name, progress: 0, status: 'error', error });
      setTimeout(() => setUploadProgress(null), 3000);
      return;
    }

    setUploadProgress({ fileName: file.name, progress: 10, status: 'uploading' });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev || prev.status !== 'uploading') return prev;
          const newProgress = Math.min(prev.progress + 20, 80);
          return { ...prev, progress: newProgress };
        });
      }, 200);

      if (onUploadFile) {
        await onUploadFile(file);
      } else {
        // Simulate upload delay if no handler provided
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      clearInterval(progressInterval);
      setUploadProgress({ fileName: file.name, progress: 100, status: 'done' });
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (err) {
      setUploadProgress({
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed'
      });
      setTimeout(() => setUploadProgress(null), 3000);
    }
  }, [onUploadFile]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Click to upload
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileUpload]);

  return (
    <aside className="h-full bg-panel border-r border-border flex flex-col overflow-hidden">
      {/* Zone A: Sessions (70%) */}
      <div className="flex-[7] flex flex-col overflow-hidden">
        <div className="h-[60px] flex items-center justify-between px-5 border-border border-b shrink-0">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <polyline points="9 11 12 14 22 4"></polyline>
            </svg>
            <span className="text-base text-primaryText tracking-wide">GET SHIT <span className="font-bold">DONE.</span></span>
          </div>
          <button
            onClick={onCreate}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-all"
          >
            <ICONS.Plus />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 scrollbar-hide">
          {sessions.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs italic text-secondaryText opacity-50">No active notebooks</div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`group relative flex items-center gap-2.5 mx-3 my-1 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm
                  ${activeId === session.id
                    ? 'bg-card text-primaryText border border-border shadow-md'
                    : 'text-secondaryText hover:bg-hover hover:text-primaryText'}`}
              >
                {editingSessionId === session.id ? (
                  // Inline edit mode
                  <>
                    <ICONS.MessageSquare />
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveRename}
                      className="flex-1 bg-transparent border-b border-accent outline-none text-primaryText font-medium"
                    />
                  </>
                ) : (
                  // Normal display mode
                  <>
                    <div 
                      className="flex-1 flex items-start gap-2.5" 
                      onClick={() => onSelect(session.id)}
                      title={session.title}
                    >
                      <span className="shrink-0 mt-0.5"><ICONS.MessageSquare /></span>
                      <span className="flex-1 font-medium line-clamp-2 leading-tight">{session.title}</span>
                    </div>

                    {/* Three-dot menu button */}
                    <div className="relative" ref={openMenuId === session.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === session.id ? null : session.id);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all"
                      >
                        <ICONS.MoreVertical />
                      </button>

                      {/* Dropdown menu */}
                      {openMenuId === session.id && (
                        <div className="absolute right-0 top-full mt-1 bg-[#2a2a2a] border border-border rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(session);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-primaryText hover:bg-hover flex items-center gap-2"
                          >
                            <ICONS.Edit />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(session.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-hover flex items-center gap-2"
                          >
                            <ICONS.Trash />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="h-[1px] bg-border w-full" />

      {/* Zone B: Knowledge Base (30%) */}
      <div className="flex-[3] bg-[#1a1a1a] flex flex-col overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onOpenKnowledgeBase}
          >
            <span className="text-[11px] font-bold uppercase text-secondaryText tracking-widest">Knowledge Base</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>
          <button
            onClick={onOpenKnowledgeBase}
            className="text-secondaryText hover:text-primaryText transition-colors"
            title="View all documents"
          >
            <ICONS.Database />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Upload Area with Drag & Drop */}
          <div
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group
              ${isDragging
                ? 'border-accent bg-accent/10 scale-[1.02]'
                : 'border-border hover:border-accent'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />

            {uploadProgress ? (
              <div className="w-full flex flex-col items-center gap-2">
                <span className="text-[10px] text-secondaryText truncate max-w-full">
                  {uploadProgress.fileName}
                </span>
                {uploadProgress.status === 'error' ? (
                  <span className="text-[9px] text-red-400">{uploadProgress.error}</span>
                ) : (
                  <>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-secondaryText">
                      {uploadProgress.status === 'done' ? 'Complete!' : 'Uploading...'}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={`text-secondaryText transition-colors ${isDragging ? 'text-accent' : 'group-hover:text-accent'}`}>
                  <ICONS.UploadCloud />
                </div>
                <span className="text-[10px] text-secondaryText text-center font-medium">
                  {isDragging ? 'Drop to upload' : 'Drop PDFs/Docs to Embed'}
                </span>
              </>
            )}
          </div>

          {/* Asset List */}
          <div className="flex flex-col gap-2">
            {assets.map(asset => (
              <DocumentCard
                key={asset.id}
                name={asset.name}
                type={asset.type}
                size={asset.size ? parseInt(asset.size) : undefined}
                isActive={asset.isActive}
                onClick={() => onViewDocument?.(asset)}
                onToggle={() => onToggleAsset(asset.id)}
                onDelete={onDeleteAsset ? () => onDeleteAsset(asset.id) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
