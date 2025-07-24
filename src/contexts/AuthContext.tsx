import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface UserProfile {
  id: string;
  display_name: string;
  role: string; // 'admin', 'contributor', 'user'
  points?: number;
  submission_count?: number;
  last_submission?: string | null;
  email?: string; // from auth user
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  authError: string | null; // holds error messages for UI
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<boolean>;  // Removed username param here
  updateUsername: (newUsername: string) => Promise<boolean>;         // Added method
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fetches user profile; returns null if none found
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, role, points, submission_count, last_submission')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }

  return data;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error.message);
        return;
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          profile.email = session.user.email ?? undefined;
          setUser(profile);
          setIsAuthenticated(true);
        }
      }
    }
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          profile.email = session.user.email ?? undefined;
          setUser(profile);
          setIsAuthenticated(true);
          setAuthError(null);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
      setAuthError(error.message);
      return false;
    }
    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        profile.email = data.user.email ?? undefined;
        setUser(profile);
        setIsAuthenticated(true);
        return true;
      }
      setAuthError('User profile not found.');
      return false;
    }
    setAuthError('Login failed.');
    return false;
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
      return false;
    }

    // If no user/session was returned, the email is likely already registered
    if (!data.user && !data.session) {
      setAuthError("That email is already registered. Try signing in instead.");
      return false;
    }
    
    // Supabase trigger will create user profile automatically, so no manual insert here

    return true;
  };

  // New method to update username/display_name on users table
  const updateUsername = async (newUsername: string): Promise<boolean> => {
    if (!user) {
      setAuthError('No user logged in');
      return false;
    }

    const { error } = await supabase
      .from('users')
      .update({ display_name: newUsername })
      .eq('id', user.id);

    if (error) {
      setAuthError(error.message);
      return false;
    }

    // Update local state
    setUser(prev => prev ? { ...prev, display_name: newUsername } : null);
    return true;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      setAuthError(error.message);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        authError,
        login,
        logout,
        register,
        updateUsername,       
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
