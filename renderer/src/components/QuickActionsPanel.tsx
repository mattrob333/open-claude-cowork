/**
 * Quick Actions Panel
 * 
 * Displays quick actions in a Tasklet.ai-style interface with
 * category tabs and tool logo badges.
 */

import { useState, useEffect } from 'react';
import { getQuickActions, deleteQuickAction, QuickAction } from '../services/quickActionsService';
import { ToolLogo } from './ToolLogos';

// Category definitions
const CATEGORIES = [
  { id: 'comms', label: 'Comms' },
  { id: 'operations', label: 'Operations' },
  { id: 'admin', label: 'Admin' },
  { id: 'growth', label: 'Growth' },
  { id: 'insights', label: 'Insights' },
] as const;

// Tool icons are now handled by ToolLogos component

interface QuickActionsPanelProps {
  onSelectAction: (action: QuickAction) => void;
}

export default function QuickActionsPanel({ onSelectAction }: QuickActionsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuickActions();
  }, [activeCategory, isMobile]);

  const loadQuickActions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // On mobile, load all actions (empty category). On desktop, filter by category.
      const categoryToLoad = isMobile ? '' : activeCategory;
      const actions = await getQuickActions(categoryToLoad);
      setQuickActions(actions);
    } catch (err) {
      console.error('Error loading quick actions:', err);
      setError('Failed to load quick actions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteQuickAction(id);
      setQuickActions(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting quick action:', err);
    }
  };

  // Render tool logo
  const renderToolLogo = (tool: string) => {
    return <ToolLogo tool={tool} size={14} />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white/80">Quick Actions</h2>
        <p className="text-xs text-white/40 mt-0.5">One-click automations</p>
      </div>

      {/* Category Tabs - Hidden on mobile for cleaner UI */}
      <div className="hidden md:flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-[#e07a5f]/20 text-[#e07a5f]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Actions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center text-white/40 text-sm py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-400 text-sm py-8">{error}</div>
        ) : quickActions.length === 0 ? (
          <div className="text-center text-white/30 text-sm py-8">
            <p className="mb-2">No quick actions yet</p>
            <p className="text-xs text-white/20">
              Chat with the AI and save successful<br />workflows as quick actions
            </p>
          </div>
        ) : (
          quickActions.map((action) => (
            <div
              key={action.id}
              onClick={() => onSelectAction(action)}
              className="group bg-[#1a1a1a] rounded-lg p-3 border border-white/5 hover:border-[#e07a5f]/30 transition-all cursor-pointer"
            >
              {/* Title & Tools */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-medium text-white/90 line-clamp-1">
                  {action.title}
                </h3>
                <div className="flex gap-1 shrink-0">
                  {action.tools_used.slice(0, 3).map((tool, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 bg-white/5 rounded flex items-center justify-center"
                      title={tool}
                    >
                      {renderToolLogo(tool)}
                    </div>
                  ))}
                  {action.tools_used.length > 3 && (
                    <span className="text-xs text-white/40 ml-1">
                      +{action.tools_used.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                {action.description || action.system_prompt.substring(0, 100)}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <button className="text-xs text-[#e07a5f] hover:text-[#e8917c] transition-colors">
                  Run now
                </button>
                <button
                  onClick={(e) => handleDelete(action.id, e)}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Placeholder cards for demo */}
      {quickActions.length === 0 && !isLoading && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-xs text-white/30 text-center mb-2">Example quick actions:</div>
          {[
            { title: 'Daily briefing', desc: 'Send me a daily briefing based on my Google Calendar, Gmail, and Asana.', tools: ['gmail', 'calendar', 'asana'] },
            { title: 'Meeting recaps', desc: 'When I receive a transcript, create tasks and email a recap.', tools: ['fireflies', 'clickup', 'gmail'] },
          ].map((demo, i) => (
            <div
              key={i}
              className="bg-[#1a1a1a]/50 rounded-lg p-3 border border-white/5 opacity-50"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-medium text-white/60">{demo.title}</h3>
                <div className="flex gap-1">
                  {demo.tools.map((tool, j) => (
                    <div key={j} className="w-5 h-5 bg-white/5 rounded flex items-center justify-center">
                      {renderToolLogo(tool)}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/40 line-clamp-2">{demo.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
