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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
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
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          profile.email = session.user.email ?? undefined;
          setUser(profile);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
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
    }
    return false;
  };

  const register = async (email: string, password: string, username?: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('Registration error:', error.message);
      return false;
    }
    if (data.user) {
      if (username) {
        // Insert user profile with username into your users table
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ id: data.user.id, display_name: username, role: 'contributor' }]);
        if (insertError) {
          console.error('Error inserting user profile:', insertError.message);
          return false;
        }
      }
  
      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        profile.email = data.user.email ?? undefined;
        setUser(profile);
        setIsAuthenticated(true);
        return true;
      }
    }
    return false;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error.message);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
