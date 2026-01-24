import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../constants';
import { getDocuments, deleteDocument, DocumentInfo } from '../services/chatService';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
  onViewDocument?: (doc: DocumentInfo) => void;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  onUploadClick,
  onViewDocument
}) => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch documents when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  }, [deletingId]);

  // Filter documents by search query
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get file type badge color
  const getTypeBadgeClass = (type: string): string => {
    const typeMap: Record<string, string> = {
      pdf: 'bg-red-500/20 text-red-400',
      docx: 'bg-blue-500/20 text-blue-400',
      doc: 'bg-blue-500/20 text-blue-400',
      txt: 'bg-gray-500/20 text-gray-400',
      md: 'bg-purple-500/20 text-purple-400',
      json: 'bg-yellow-500/20 text-yellow-400',
      csv: 'bg-green-500/20 text-green-400'
    };
    return typeMap[type.toLowerCase()] || 'bg-gray-500/20 text-gray-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-panel border border-border w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <ICONS.Database />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primaryText">Knowledge Base</h2>
              <p className="text-xs text-secondaryText">{documents.length} documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-xl transition-all"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-border flex items-center gap-3 shrink-0">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-card border border-border rounded-xl px-4 py-2.5 pl-10 text-sm text-primaryText placeholder:text-secondaryText focus:border-accent outline-none transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondaryText">
              <ICONS.Filter />
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => {
              onClose();
              onUploadClick();
            }}
            className="px-4 py-2.5 bg-accent text-canvas rounded-xl text-sm font-semibold hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <ICONS.UploadCloud />
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <ICONS.Loader />
              <span className="ml-2 text-sm text-secondaryText">Loading documents...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ICONS.AlertCircle />
              <p className="mt-2 text-sm text-red-400">{error}</p>
              <button
                onClick={loadDocuments}
                className="mt-4 px-4 py-2 text-sm text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ICONS.FileText />
              <p className="mt-2 text-sm text-secondaryText">
                {searchQuery ? 'No documents match your search' : 'No documents yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    onClose();
                    onUploadClick();
                  }}
                  className="mt-4 px-4 py-2 text-sm text-accent hover:underline"
                >
                  Upload your first document
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-secondaryText uppercase tracking-wider">
                  <th className="pb-3 pl-3">Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Added</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="group hover:bg-hover/50 transition-colors"
                  >
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center text-secondaryText">
                          <ICONS.FileText />
                        </div>
                        <span className="text-sm text-primaryText font-medium truncate max-w-[200px]">
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase ${getTypeBadgeClass(doc.type)}`}>
                        {doc.type}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-secondaryText">
                      {formatSize(doc.size)}
                    </td>
                    <td className="py-3 text-sm text-secondaryText">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="py-3">
                      {doc.status === 'ready' ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <ICONS.CheckCircle /> Ready
                        </span>
                      ) : doc.status === 'processing' ? (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs">
                          <ICONS.Loader /> Processing
                        </span>
                      ) : doc.status === 'error' ? (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <ICONS.AlertCircle /> Error
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-secondaryText text-xs">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onViewDocument && (
                          <button
                            onClick={() => onViewDocument(doc)}
                            className="p-2 text-secondaryText hover:text-primaryText hover:bg-white/10 rounded-lg transition-all"
                            title="View"
                          >
                            <ICONS.Eye />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="p-2 text-secondaryText hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === doc.id ? <ICONS.Loader /> : <ICONS.Trash />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-secondaryText shrink-0">
          <span>Showing {filteredDocuments.length} of {documents.length} documents</span>
          <button
            onClick={loadDocuments}
            className="flex items-center gap-1 hover:text-primaryText transition-colors"
          >
            <ICONS.RefreshCw /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;
