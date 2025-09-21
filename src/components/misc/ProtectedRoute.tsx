import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';


interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Pull in the new isLoading state along with isAuthenticated
  const { isAuthenticated, isLoading } = useAuth(); 
  const location = useLocation();

  // 1. Check if the initial authentication state is still loading.
  // We must wait for this check to complete before deciding to redirect or render content.
  if (isLoading) {
    // Render a lightweight loading indicator. Since App.tsx handles the full splash,
    // this can be a simple placeholder to prevent a flash of unauthenticated content.
    return <div className="p-8 text-center text-sm">Loading user session...</div>; 
  }

  // 2. Once loading is complete, check authentication status.
  if (!isAuthenticated) {
    // Redirect to login, saving current location for redirect after successful login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. User is authenticated and loading is complete, render the children.
  return children;
};

export default ProtectedRoute;