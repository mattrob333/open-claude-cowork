/**
 * UserProfileMenu Component
 *
 * Shows user profile with dropdown menu for settings and logout.
 * Displays avatar (initials) and user email.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileMenuProps {
  onOpenProfile?: () => void;
  onOpenContextFile?: () => void;
  onOpenAuth?: () => void;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onOpenProfile,
  onOpenContextFile,
  onOpenAuth,
}) => {
  const { user, profile, isAuthenticated, logout, isLoading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Get user initials for avatar
  const getInitials = () => {
    if (profile?.displayName) {
      return profile.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return '?';
  };

  // If not authenticated, show sign in button
  if (!isAuthenticated) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-sm font-semibold text-accent hover:bg-accent hover:text-canvas transition-all"
      >
        <ICONS.User />
        Sign In
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-1 pr-3 bg-card border border-border rounded-full hover:border-accent transition-all"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold">
          {getInitials()}
        </div>
        <span className="text-sm text-primaryText max-w-[120px] truncate">
          {profile?.displayName || user?.email?.split('@')[0]}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-secondaryText transition-transform ${showMenu ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User Info */}
          <div className="p-3 border-b border-border">
            <div className="text-sm font-semibold text-primaryText truncate">
              {profile?.displayName || 'User'}
            </div>
            <div className="text-xs text-secondaryText truncate">
              {user?.email}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-1">
            <button
              onClick={() => {
                setShowMenu(false);
                onOpenProfile?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primaryText hover:bg-hover rounded-lg transition-all"
            >
              <ICONS.User />
              Profile Settings
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                onOpenContextFile?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primaryText hover:bg-hover rounded-lg transition-all"
            >
              <ICONS.FileText />
              Personal Context File
            </button>

            <div className="my-1 border-t border-border" />

            <button
              onClick={async () => {
                setShowMenu(false);
                await logout();
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <ICONS.LogOut />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;
