import React, { useState, useEffect } from 'react';
import { Skill } from '../types';
import { getSkills, getSkillContent } from '../services/skillsService';
import { ICONS } from '../constants';

interface SkillsPanelProps {
  activeSkillIds: string[];
  onToggleSkill: (skillId: string) => void;
  onActivateSkill: (skillId: string) => void;
  className?: string;
}

// Source badge colors
const SOURCE_COLORS: Record<string, string> = {
  builtin: 'bg-blue-500/20 text-blue-400',
  project: 'bg-green-500/20 text-green-400',
  user: 'bg-purple-500/20 text-purple-400',
  plugin: 'bg-orange-500/20 text-orange-400',
};

const SkillsPanel: React.FC<SkillsPanelProps> = ({
  activeSkillIds,
  onToggleSkill,
  onActivateSkill,
  className = '',
}) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Load skills on mount
  useEffect(() => {
    const loadSkillsList = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getSkills();
        setSkills(response.skills);
      } catch (err) {
        console.error('Error loading skills:', err);
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setIsLoading(false);
      }
    };

    loadSkillsList();
  }, []);

  // Load skill content when expanded
  const handleExpandSkill = async (skillId: string) => {
    if (expandedSkillId === skillId) {
      setExpandedSkillId(null);
      setSkillContent(null);
      return;
    }

    setExpandedSkillId(skillId);
    setLoadingContent(true);

    try {
      const data = await getSkillContent(skillId);
      setSkillContent(data.content);
    } catch (err) {
      console.error('Error loading skill content:', err);
      setSkillContent('Failed to load skill content');
    } finally {
      setLoadingContent(false);
    }
  };

  // Filter skills by search query
  const filteredSkills = skills.filter(skill => {
    const query = searchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      skill.triggers.some(t => t.toLowerCase().includes(query))
    );
  });

  // Group skills by source
  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const source = skill.source;
    if (!acc[source]) acc[source] = [];
    acc[source].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const sourceOrder = ['user', 'project', 'plugin', 'builtin'];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <ICONS.Loader />
        <span className="ml-2 text-sm text-secondaryText">Loading skills...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <ICONS.AlertCircle />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-5 border-b border-border shrink-0">
        <span className="text-sm font-semibold tracking-wider text-primaryText uppercase opacity-70">
          Skills
        </span>
        <span className="text-xs text-secondaryText">
          {activeSkillIds.length} active
        </span>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primaryText placeholder-secondaryText focus:outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-secondaryText hover:text-primaryText"
            >
              <ICONS.X />
            </button>
          )}
        </div>
      </div>

      {/* Skills List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filteredSkills.length === 0 ? (
          <div className="text-center text-secondaryText text-sm py-8">
            {searchQuery ? 'No skills match your search' : 'No skills available'}
          </div>
        ) : (
          sourceOrder.map(source => {
            const sourceSkills = groupedSkills[source];
            if (!sourceSkills || sourceSkills.length === 0) return null;

            return (
              <div key={source}>
                <h3 className="text-[10px] font-bold uppercase text-secondaryText tracking-wider mb-2">
                  {source === 'builtin' ? 'Built-in' : source.charAt(0).toUpperCase() + source.slice(1)}
                </h3>
                <div className="space-y-2">
                  {sourceSkills.map(skill => {
                    const isActive = activeSkillIds.includes(skill.id);
                    const isExpanded = expandedSkillId === skill.id;

                    return (
                      <div
                        key={skill.id}
                        className={`bg-card border rounded-lg overflow-hidden transition-all ${
                          isActive ? 'border-accent/50' : 'border-border'
                        }`}
                      >
                        {/* Skill Header */}
                        <div
                          className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => handleExpandSkill(skill.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-primaryText truncate">
                                  {skill.name}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${SOURCE_COLORS[skill.source]}`}>
                                  v{skill.version}
                                </span>
                              </div>
                              <p className="text-xs text-secondaryText mt-1 line-clamp-2">
                                {skill.description}
                              </p>
                              {skill.triggers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {skill.triggers.slice(0, 3).map((trigger, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-secondaryText"
                                    >
                                      "{trigger}"
                                    </span>
                                  ))}
                                  {skill.triggers.length > 3 && (
                                    <span className="text-[10px] text-secondaryText">
                                      +{skill.triggers.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSkill(skill.id);
                              }}
                              className={`shrink-0 w-10 h-5 rounded-full transition-colors relative ${
                                isActive ? 'bg-accent' : 'bg-white/10'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-border p-3 bg-black/20 animate-in fade-in duration-200">
                            {loadingContent ? (
                              <div className="flex items-center justify-center py-4">
                                <ICONS.Loader />
                              </div>
                            ) : (
                              <>
                                <pre className="text-[11px] text-secondaryText font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {skillContent?.substring(0, 1000)}
                                  {skillContent && skillContent.length > 1000 && '...'}
                                </pre>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => onActivateSkill(skill.id)}
                                    className="flex-1 px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors"
                                  >
                                    Use Skill
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Skills Summary */}
      {activeSkillIds.length > 0 && (
        <div className="border-t border-border p-3 bg-accent/5">
          <div className="text-[10px] font-bold uppercase text-accent tracking-wider mb-2">
            Active Skills
          </div>
          <div className="flex flex-wrap gap-1">
            {activeSkillIds.map(id => {
              const skill = skills.find(s => s.id === id);
              return skill ? (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-accent/20 text-accent rounded"
                >
                  {skill.name}
                  <button
                    onClick={() => onToggleSkill(id)}
                    className="hover:text-white"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsPanel;
