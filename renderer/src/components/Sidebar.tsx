
import React from 'react';
import { Session, KnowledgeAsset } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  assets: KnowledgeAsset[];
  onToggleAsset: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, activeId, onSelect, onCreate, assets, onToggleAsset }) => {
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
          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-accent transition-colors cursor-pointer group">
            <div className="text-secondaryText group-hover:text-accent transition-colors"><ICONS.UploadCloud /></div>
            <span className="text-[10px] text-secondaryText text-center font-medium">Drop PDFs/Docs to Embed</span>
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
