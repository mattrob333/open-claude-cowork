import React, { useState, useCallback, useRef } from 'react';
import { Session, KnowledgeAsset } from '../types';
import { ICONS } from '../constants';

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
  assets: KnowledgeAsset[];
  onToggleAsset: (id: string) => void;
  onUploadFile?: (file: File) => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeId,
  onSelect,
  onCreate,
  assets,
  onToggleAsset,
  onUploadFile
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <span className="text-sm font-semibold tracking-wider text-primaryText uppercase opacity-70">Notebooks</span>
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
                onClick={() => onSelect(session.id)}
                className={`flex items-center gap-2.5 mx-3 my-1 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm
                  ${activeId === session.id
                    ? 'bg-card text-primaryText border border-border shadow-md'
                    : 'text-secondaryText hover:bg-hover hover:text-primaryText'}`}
              >
                <ICONS.MessageSquare />
                <span className="truncate flex-1 font-medium">{session.title}</span>
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-secondaryText tracking-widest">Knowledge Base</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>
          <button className="text-secondaryText hover:text-primaryText"><ICONS.Database /></button>
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
              <div
                key={asset.id}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group relative overflow-hidden
                  ${asset.isActive ? 'bg-accent/10 border-l-2 border-accent' : 'bg-white/[0.03] hover:bg-white/[0.05]'}`}
                onClick={() => onToggleAsset(asset.id)}
              >
                <div className="flex items-center justify-center p-1">
                  <input
                    type="checkbox"
                    checked={asset.isActive}
                    onChange={() => {}}
                    className="w-3 h-3 accent-accent cursor-pointer"
                  />
                </div>
                <div className="text-accent/60 group-hover:text-accent"><ICONS.FileText /></div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-medium truncate transition-colors ${asset.isActive ? 'text-accent' : 'text-secondaryText'}`}>
                    {asset.name}
                  </span>
                  <span className="text-[9px] text-white/20">{asset.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
