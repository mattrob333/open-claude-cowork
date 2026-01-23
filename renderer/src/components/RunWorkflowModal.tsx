
import React, { useState } from 'react';
import { WorkflowTemplate } from '../types';
import { ICONS } from '../constants';

interface RunWorkflowModalProps {
  workflow: WorkflowTemplate;
  onClose: () => void;
  onRun: (data: { topic: string, tone: string, instructions: string }) => void;
}

const RunWorkflowModal: React.FC<RunWorkflowModalProps> = ({ workflow, onClose, onRun }) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [instructions, setInstructions] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-panel border border-border w-full max-w-lg rounded-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                {workflow.icon === 'Wand' ? <ICONS.Wand /> : <ICONS.Tool />}
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-primaryText tracking-tight">{workflow.name}</h2>
                <p className="text-xs text-secondaryText font-medium opacity-60 uppercase tracking-widest">Workflow Engine</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-xl transition-all"
            >
              <ICONS.X />
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-secondaryText uppercase tracking-widest ml-1">Topic / Subject</label>
              <input 
                autoFocus
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this post about?"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-secondaryText uppercase tracking-widest ml-1">Tone</label>
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none transition-all appearance-none cursor-pointer"
              >
                <option>Professional</option>
                <option>Casual</option>
                <option>Viral / Hype</option>
                <option>Academic</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-secondaryText uppercase tracking-widest ml-1">Additional Instructions</label>
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Any specific constraints or styles?"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-white/[0.02] border-t border-border flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-bold text-secondaryText hover:text-primaryText transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onRun({ topic, tone, instructions })}
            disabled={!topic.trim()}
            className="px-8 py-2.5 bg-accent text-canvas rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
          >
            Run Workflow
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunWorkflowModal;
