/**
 * Settings Page
 * 
 * User settings including API key management.
 * Keys are stored encrypted in Supabase user_settings table.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SERVER_URL } from '../constants';

interface UserSettings {
  anthropic_api_key?: string;
  composio_api_key?: string;
  credits?: number;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  
  const [settings, setSettings] = useState<UserSettings>({});
  const [anthropicKey, setAnthropicKey] = useState('');
  const [composioKey, setComposioKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for admin bypass
  const hasAdminBypass = localStorage.getItem('admin_bypass') === 'true';

  useEffect(() => {
    if (!isAuthenticated && !hasAdminBypass) {
      navigate('/login');
      return;
    }
    loadSettings();
  }, [isAuthenticated, hasAdminBypass, navigate]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/user/settings`, {
        headers: {
          'Authorization': `Bearer ${user?.id || 'admin'}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        // Show masked keys if they exist
        if (data.has_anthropic_key) {
          setAnthropicKey('••••••••••••••••');
        }
        if (data.has_composio_key) {
          setComposioKey('••••••••••••••••');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const updates: Record<string, string> = {};
      
      // Only send keys if they've been changed (not masked)
      if (anthropicKey && !anthropicKey.includes('•')) {
        updates.anthropic_api_key = anthropicKey;
      }
      if (composioKey && !composioKey.includes('•')) {
        updates.composio_api_key = composioKey;
      }

      if (Object.keys(updates).length === 0) {
        setMessage({ type: 'error', text: 'No changes to save' });
        setIsSaving(false);
        return;
      }

      const response = await fetch(`${SERVER_URL}/api/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || 'admin'}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Mask the keys after saving
        if (updates.anthropic_api_key) {
          setAnthropicKey('••••••••••••••••');
        }
        if (updates.composio_api_key) {
          setComposioKey('••••••••••••••••');
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_bypass');
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to app
        </button>
        <button
          onClick={handleLogout}
          className="text-sm text-white/60 hover:text-red-400 transition-colors"
        >
          Log out
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-white/50 mb-8">
          Manage your API keys and account settings
        </p>

        {isLoading ? (
          <div className="text-white/50">Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Account Section */}
            <section className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold mb-4">Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Email</label>
                  <div className="px-4 py-3 bg-[#0d0d0d] border border-white/5 rounded-lg text-white/70">
                    {user?.email || (hasAdminBypass ? 'admin@local' : 'Not logged in')}
                  </div>
                </div>
                {settings.credits !== undefined && (
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Credits</label>
                    <div className="px-4 py-3 bg-[#0d0d0d] border border-white/5 rounded-lg text-[#e07a5f] font-medium">
                      {settings.credits} credits remaining
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* API Keys Section */}
            <section className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold mb-2">API Keys</h2>
              <p className="text-sm text-white/40 mb-6">
                Add your own API keys to use your own accounts. Keys are encrypted and stored securely.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Anthropic API Key
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-[#e07a5f] hover:text-[#e8917c]"
                    >
                      Get key →
                    </a>
                  </label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#e07a5f]/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Composio API Key
                    <a
                      href="https://app.composio.dev/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-[#e07a5f] hover:text-[#e8917c]"
                    >
                      Get key →
                    </a>
                  </label>
                  <input
                    type="password"
                    value={composioKey}
                    onChange={(e) => setComposioKey(e.target.value)}
                    placeholder="cmp_..."
                    className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#e07a5f]/50 transition-colors"
                  />
                </div>

                {message && (
                  <div className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message.text}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#e07a5f] text-black rounded-lg font-medium hover:bg-[#e8917c] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save API Keys'}
                </button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-[#1a1a1a] rounded-xl border border-red-500/20 p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
              <button
                onClick={handleLogout}
                className="px-6 py-3 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/10 transition-all"
              >
                Log out
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
