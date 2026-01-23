
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface WorkflowWizardProps {
  onClose: () => void;
  onSave: (name: string) => void;
}

const WorkflowWizard: React.FC<WorkflowWizardProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [variables, setVariables] = useState([
    { id: '1', name: 'Topic', selected: true },
    { id: '2', name: 'Recipient Name', selected: true },
    { id: '3', name: 'Target Length', selected: false },
    { id: '4', name: 'Source Data', selected: false }
  ]);

  const toggleVar = (id: string) => {
    setVariables(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v));
  };

  return (
    <aside className="h-full bg-panel border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="h-[60px] flex items-center justify-between px-5 border-border border-b shrink-0">
        <span className="text-sm font-bold tracking-wider text-accent uppercase tracking-tighter">Crystallize Workflow</span>
        <button onClick={onClose} className="p-2 text-secondaryText hover:text-primaryText"><ICONS.X /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        {step === 1 ? (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-primaryText">Step 1: Identity</h3>
              <p className="text-xs text-secondaryText leading-relaxed">Name this workflow template based on the current context.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Workflow Name</label>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Content Engine"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none"
              />
            </div>

            <button 
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="mt-4 w-full py-3 bg-accent text-canvas rounded-xl text-sm font-bold hover:bg-accentHover transition-colors disabled:opacity-50"
            >
              Continue to Extraction
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-primaryText">Step 2: Variable Extraction</h3>
              <p className="text-xs text-secondaryText leading-relaxed">Gemini detected these dynamic fields from your chat history.</p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Dynamic Parameters</label>
              <div className="flex flex-col gap-2">
                {variables.map(v => (
                  <div 
                    key={v.id}
                    onClick={() => toggleVar(v.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group
                      ${v.selected ? 'bg-accent/5 border-accent text-accent' : 'bg-card border-border text-secondaryText'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${v.selected ? 'bg-accent border-accent' : 'border-border'}`}>
                        {v.selected && <div className="w-1.5 h-1.5 bg-canvas rounded-full" />}
                      </div>
                      <span className="text-xs font-bold mono">{v.name}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ICONS.Wand />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <button 
                onClick={() => onSave(name)}
                className="w-full py-3 bg-accent text-canvas rounded-xl text-sm font-bold shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
              >
                Save to Library
              </button>
              <button 
                onClick={() => setStep(1)}
                className="w-full py-3 bg-white/5 text-secondaryText rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            </div>
            
            <p className="text-[9px] text-center text-white/20 uppercase tracking-widest px-4">
              Crystallization creates a parametric template based on active RAG context.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default WorkflowWizard;
