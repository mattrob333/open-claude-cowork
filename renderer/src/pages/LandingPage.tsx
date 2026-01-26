/**
 * Landing Page
 * 
 * Public landing page for Get Shit Done Bot
 * "Get Shit Done." - The AI Agent That Takes Action.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/auth';
import { useState } from 'react';
import { 
  GmailLogo, 
  GoogleCalendarLogo, 
  AsanaLogo, 
  SlackLogo, 
  FirefliesLogo,
  TrelloLogo,
  NotionLogo
} from '../components/ToolLogos';

// Google icon SVG
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Sample workflow cards with real tool logos
const sampleWorkflows = [
  {
    title: 'Daily briefing',
    description: 'Send me a daily briefing based on my Google Calendar, Gmail, and Asana.',
    tools: [GoogleCalendarLogo, GmailLogo, AsanaLogo],
  },
  {
    title: 'Meeting recaps',
    description: 'After meetings, transcribe with Fireflies and send recap via Slack.',
    tools: [FirefliesLogo, SlackLogo, GmailLogo],
  },
  {
    title: 'Project sync',
    description: 'Sync tasks between Trello, Notion, and keep the team updated on Slack.',
    tools: [TrelloLogo, NotionLogo, SlackLogo],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (!isLoading && isAuthenticated) {
    navigate('/app');
    return null;
  }

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setIsSigningIn(false);
    }
  };

  const handleAdminBypass = () => {
    // For testing - bypass auth and go directly to app
    localStorage.setItem('admin_bypass', 'true');
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#e07a5f]">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <polyline points="9 11 12 14 22 4"></polyline>
          </svg>
          <span className="text-xl text-white/90 tracking-wide">GET SHIT <span className="font-bold">DONE.</span></span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Log in
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-[#e07a5f] text-sm mb-4 flex items-center justify-center gap-2">
            <span>✨</span> AI-powered automation for busy professionals
          </p>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Get Shit Done.
          </h1>
          <p className="text-lg text-white/50 mb-8">
            The AI Agent That Takes Action.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              {isSigningIn ? 'Signing in...' : 'Sign up free with Google'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 border border-white/20 rounded-lg font-medium hover:bg-white/5 transition-all"
            >
              Log in with email
            </button>
          </div>

          {error && (
            <p className="mt-4 text-red-400 text-sm">{error}</p>
          )}

          {/* Admin bypass for testing */}
          <button
            onClick={handleAdminBypass}
            className="mt-6 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            [Dev] Skip auth →
          </button>
        </div>

        {/* Example Automations Showcase */}
        <div className="w-full max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-center mb-6 text-white/60">
            Automate Your Workflows
          </h2>
          
          {/* Sample Workflow Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {sampleWorkflows.map((workflow) => (
              <div
                key={workflow.title}
                className="bg-[#1a1a1a] rounded-xl p-5 border border-white/10 hover:border-[#e07a5f]/30 transition-all cursor-pointer group"
              >
                {/* Tool Logos */}
                <div className="flex gap-2 mb-4">
                  {workflow.tools.map((ToolLogo, index) => (
                    <div 
                      key={index}
                      className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-white/10 transition-colors"
                    >
                      <ToolLogo size={18} />
                    </div>
                  ))}
                </div>
                
                <h3 className="font-semibold text-white/90 mb-2">{workflow.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {workflow.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-16 text-center">
          <p className="text-white/30 text-sm mb-4">
            Trusted by professionals at thousands of organizations
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-full text-xs text-white/40">
            <span>🔒</span> SOC 2 and GDPR compliance in progress
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 text-center text-xs text-white/30">
        © 2026 Get Shit Done Bot • Built for people who get shit done
      </footer>
    </div>
  );
}
