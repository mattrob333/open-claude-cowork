import React, { useState, useRef, useEffect } from 'react';
import { ICONS, MODELS } from '../../constants';
import { ModelOption } from '../../types';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  onRightAction?: () => void;
  rightActionIcon?: React.ReactNode;
  currentModel?: ModelOption;
  onModelChange?: (model: ModelOption) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
  onRightAction,
  rightActionIcon,
  currentModel,
  onModelChange
}) => {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-panel border-b border-border z-50 flex items-center justify-between px-3">
      {/* Hamburger Menu */}
      <button
        onClick={onMenuClick}
        className="w-10 h-10 flex items-center justify-center text-secondaryText hover:text-primaryText rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Center - Model Selector (like Claude app) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowModelPicker(!showModelPicker)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-primaryText hover:bg-hover rounded-lg transition-colors"
        >
          <span className="text-sm font-medium">{currentModel?.name || subtitle || 'Sonnet 4.5'}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform ${showModelPicker ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Model Dropdown */}
        {showModelPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange?.(model);
                  setShowModelPicker(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  currentModel?.id === model.id 
                    ? 'text-accent bg-accent/10 font-medium' 
                    : 'text-primaryText hover:bg-hover'
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Action */}
      {onRightAction ? (
        <button
          onClick={onRightAction}
          className="w-10 h-10 flex items-center justify-center text-secondaryText hover:text-primaryText rounded-lg transition-colors"
        >
          {rightActionIcon || <ICONS.Plus />}
        </button>
      ) : (
        <div className="w-10" />
      )}
    </header>
  );
};

export default MobileHeader;
