/**
 * Quick Action Modal
 * 
 * Shows a preview of a quick action before running it.
 * Displays title, description, tools used, and expected outputs.
 */

import { QuickAction } from '../services/quickActionsService';
import { ToolLogo } from './ToolLogos';
import { ICONS } from '../constants';

interface QuickActionModalProps {
  action: QuickAction;
  isOpen: boolean;
  onClose: () => void;
  onRun: () => void;
}

export default function QuickActionModal({ action, isOpen, onClose, onRun }: QuickActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/10">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">{action.title}</h2>
            <p className="text-sm text-white/50">{action.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white/80 transition-colors"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[50vh]">
          {/* Tools Used */}
          {action.tools_used && action.tools_used.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2">
                Tools Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {action.tools_used.map((tool, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg"
                  >
                    <ToolLogo tool={tool} size={16} />
                    <span className="text-sm text-white/70 capitalize">{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What This Workflow Does */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2">
              What This Workflow Does
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>Analyzes target company website and digital presence</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>Estimates revenue, EBITDA, and valuation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>Identifies AI transformation opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>Generates investment memo and outreach scripts</span>
              </li>
            </ul>
          </div>

          {/* Expected Output */}
          <div>
            <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2">
              Expected Output
            </h3>
            <div className="bg-black/30 rounded-lg p-3 text-sm text-white/60 font-mono">
              <div className="text-accent mb-1">📊 Executive Summary</div>
              <div className="text-white/40 text-xs pl-4 mb-2">Company overview, key findings, recommendation</div>
              <div className="text-accent mb-1">💰 Financial Analysis</div>
              <div className="text-white/40 text-xs pl-4 mb-2">Revenue estimates, valuation range</div>
              <div className="text-accent mb-1">🤖 AI Opportunity Map</div>
              <div className="text-white/40 text-xs pl-4 mb-2">Transformation roadmap with ROI projections</div>
              <div className="text-accent mb-1">📝 Deal Package</div>
              <div className="text-white/40 text-xs pl-4">Investment memo, owner outreach scripts</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRun}
            className="px-5 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Run Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
