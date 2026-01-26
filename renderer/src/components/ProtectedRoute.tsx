/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication.
 * Redirects to login if not authenticated.
 * Supports admin bypass for testing.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Check for admin bypass (for testing)
  const hasAdminBypass = localStorage.getItem('admin_bypass') === 'true';

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-white/50 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  // Allow access if authenticated OR has admin bypass
  if (isAuthenticated || hasAdminBypass) {
    return <>{children}</>;
  }

  // Redirect to login
  return <Navigate to="/login" replace />;
}
