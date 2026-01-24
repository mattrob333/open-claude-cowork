import React from 'react';
import { ICONS } from '../../constants';

export type MobileView = 'chat' | 'workflows' | 'knowledge' | 'settings';

interface BottomNavigationProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeView,
  onViewChange
}) => {
  const navItems: { id: MobileView; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <ICONS.MessageSquare /> },
    { id: 'workflows', label: 'Workflows', icon: <ICONS.Wand /> },
    { id: 'knowledge', label: 'Knowledge', icon: <ICONS.Database /> },
    { id: 'settings', label: 'Settings', icon: <ICONS.Settings /> }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
              activeView === item.id
                ? 'text-accent'
                : 'text-secondaryText hover:text-primaryText'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
