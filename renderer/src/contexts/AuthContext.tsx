/**
 * Auth Context
 *
 * Provides authentication state and functions to the entire app.
 * Uses Supabase Auth for user management.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  signIn,
  signUp,
  signOut,
  getSession,
  onAuthStateChange,
  updateUserMetadata
} from '../lib/auth';

interface UserProfile {
  displayName?: string;
  contextFile?: string; // User's personal context that persists
  preferences?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<{ error: string | null }>;
  updateContextFile: (content: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { session: currentSession } = await getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Load profile from user metadata
        if (currentSession?.user) {
          const metadata = currentSession.user.user_metadata;
          setProfile({
            displayName: metadata?.displayName,
            contextFile: metadata?.contextFile,
            preferences: metadata?.preferences,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const subscription = onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const metadata = newSession.user.user_metadata;
        setProfile({
          displayName: metadata?.displayName,
          contextFile: metadata?.contextFile,
          preferences: metadata?.preferences,
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: 'Not authenticated' };
    }

    try {
      const newProfile = { ...profile, ...updates };
      const { error } = await updateUserMetadata(newProfile);

      if (error) {
        return { error: error.message };
      }

      setProfile(newProfile);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [user, profile]);

  const updateContextFile = useCallback(async (content: string) => {
    return updateProfile({ contextFile: content });
  }, [updateProfile]);

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    updateContextFile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
