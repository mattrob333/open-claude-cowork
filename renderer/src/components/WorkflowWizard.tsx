import React, { useState } from 'react';
import { ICONS } from '../constants';
import { WorkflowVariable } from '../types';
import { saveWorkflow } from '../services/chatService';
import { extractServicesFromPrompt } from '../utils/serviceExtractor';
import { WorkflowServiceLogosInline } from './WorkflowServiceLogos';

interface WorkflowWizardProps {
  onClose: () => void;
  onSave: (name: string) => void;
  initialPrompt?: string;
}

const WorkflowWizard: React.FC<WorkflowWizardProps> = ({ onClose, onSave, initialPrompt = '' }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(initialPrompt);
  const [variables, setVariables] = useState<WorkflowVariable[]>([
    { name: 'topic', label: 'Topic', type: 'text', placeholder: 'Enter the topic...', required: true },
    { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Casual', 'Technical'], required: false }
  ]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<WorkflowVariable['type']>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariable = () => {
    if (!newVarName.trim()) return;
    const varName = newVarName.toLowerCase().replace(/\s+/g, '_');
    if (variables.some(v => v.name === varName)) {
      setError('Variable name already exists');
      return;
    }
    setVariables(prev => [
      ...prev,
      {
        name: varName,
        label: newVarName,
        type: newVarType,
        placeholder: `Enter ${newVarName.toLowerCase()}...`,
        required: false
      }
    ]);
    setNewVarName('');
    setError(null);
  };

  const removeVariable = (name: string) => {
    setVariables(prev => prev.filter(v => v.name !== name));
  };

  const toggleRequired = (name: string) => {
    setVariables(prev =>
      prev.map(v => v.name === name ? { ...v, required: !v.required } : v)
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      setError('Name and system prompt are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Auto-detect services from the system prompt
      const detectedServices = extractServicesFromPrompt(systemPrompt);

      await saveWorkflow({
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        variables,
        icon: 'chat',
        usedServices: detectedServices
      });
      onSave(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="h-full bg-panel border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="h-[60px] flex items-center justify-between px-5 border-border border-b shrink-0">
        <span className="text-sm font-bold tracking-wider text-accent uppercase tracking-tighter">Create Workflow</span>
        <button onClick={onClose} className="p-2 text-secondaryText hover:text-primaryText"><ICONS.X /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step >= s ? 'bg-accent text-canvas' : 'bg-white/10 text-secondaryText'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-accent' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-primaryText">Step 1: Basic Info</h3>
              <p className="text-xs text-secondaryText leading-relaxed">Name and describe your workflow template.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Name *</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Content Generator"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none resize-none"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="mt-4 w-full py-3 bg-accent text-canvas rounded-xl text-sm font-bold hover:bg-accentHover transition-colors disabled:opacity-50"
            >
              Continue to Prompt
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-primaryText">Step 2: System Prompt</h3>
              <p className="text-xs text-secondaryText leading-relaxed">
                Define the instructions. Use {'{{variable_name}}'} for dynamic values.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">System Prompt *</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={`You are a helpful assistant that generates content about {{topic}} in a {{tone}} style.

Please create content that is engaging and informative.`}
                rows={8}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-primaryText focus:border-accent outline-none resize-none font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-white/5 text-secondaryText rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!systemPrompt.trim()}
                className="flex-1 py-3 bg-accent text-canvas rounded-xl text-sm font-bold hover:bg-accentHover transition-colors disabled:opacity-50"
              >
                Continue to Variables
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-primaryText">Step 3: Variables</h3>
              <p className="text-xs text-secondaryText leading-relaxed">Define the input fields users will fill when running this workflow.</p>
            </div>

            {/* Add new variable */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="Variable name"
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-primaryText focus:border-accent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && addVariable()}
              />
              <select
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value as WorkflowVariable['type'])}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-primaryText focus:border-accent outline-none"
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="number">Number</option>
              </select>
              <button
                onClick={addVariable}
                className="px-4 py-2 bg-accent text-canvas rounded-lg text-sm font-bold hover:bg-accentHover transition-colors"
              >
                Add
              </button>
            </div>

            {/* Variable list */}
            <div className="flex flex-col gap-2">
              {variables.map(v => (
                <div
                  key={v.name}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-accent">{`{{${v.name}}}`}</span>
                    <span className="text-xs text-secondaryText">{v.type}</span>
                    {v.required && <span className="text-[9px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">Required</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRequired(v.name)}
                      className="text-xs text-secondaryText hover:text-primaryText"
                    >
                      {v.required ? 'Optional' : 'Required'}
                    </button>
                    <button
                      onClick={() => removeVariable(v.name)}
                      className="text-secondaryText hover:text-red-400"
                    >
                      <ICONS.X />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Detected Services Preview */}
            {systemPrompt && (() => {
              const detectedServices = extractServicesFromPrompt(systemPrompt);
              if (detectedServices.length > 0) {
                return (
                  <div className="flex flex-col gap-2 p-3 bg-card/50 border border-border rounded-lg">
                    <span className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Detected Services</span>
                    <WorkflowServiceLogosInline services={detectedServices} size={16} />
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-white/5 text-secondaryText rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-accent text-canvas rounded-xl text-sm font-bold shadow-xl hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default WorkflowWizard;
