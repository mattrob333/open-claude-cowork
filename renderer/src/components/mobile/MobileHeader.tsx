import React from 'react';
import { ICONS } from '../../constants';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  onRightAction?: () => void;
  rightActionIcon?: React.ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
  onRightAction,
  rightActionIcon
}) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-panel border-b border-border z-50 flex items-center justify-between px-4">
      {/* Hamburger Menu */}
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 text-secondaryText hover:text-primaryText rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
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

      {/* Title */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-primaryText truncate max-w-[180px]">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-accent font-medium uppercase tracking-wider">
            {subtitle}
          </span>
        )}
      </div>

      {/* Right Action */}
      {onRightAction ? (
        <button
          onClick={onRightAction}
          className="p-2 -mr-2 text-secondaryText hover:text-primaryText rounded-lg transition-colors"
        >
          {rightActionIcon || <ICONS.Plus />}
        </button>
      ) : (
        <div className="w-10" /> // Spacer for centering
      )}
    </header>
  );
};

export default MobileHeader;
