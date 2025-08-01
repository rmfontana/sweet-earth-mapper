import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '../integrations/supabase/client';

interface UserProfile {
  id: string;
  display_name: string | null;
  role: string | null;
  points?: number | null;
  submission_count?: number | null;
  last_submission?: string | null;
  email?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<boolean>;
  updateUsername: (newUsername: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (!userId) {
      console.error('[fetchUserProfile] No userId provided');
      return null;
    }

    console.log('[fetchUserProfile] Looking up user with ID:', userId);

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, role, points, submission_count, last_submission')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[fetchUserProfile] Supabase error:', error.message);
      return null;
    }

    if (!data) {
      console.warn('[fetchUserProfile] No user found for ID:', userId);
      return null;
    }

    console.log('[fetchUserProfile] Fetched user:', data);
    return data;
  } catch (err: any) {
    console.error('[fetchUserProfile] Unexpected error:', err.message || err);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      console.log('[Auth] Checking session...');
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Error getting session:', error.message);
        setAuthError(error.message);
        return;
      }

      if (session?.user) {
        const { id, email } = session.user;
        const profile = await fetchUserProfile(id);
        if (profile) {
          profile.email = email;
          setUser(profile);
          setIsAuthenticated(true);
        } else {
          console.warn('[Auth] No profile found for session user.');
          setAuthError('Profile not found.');
        }
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[Auth] Auth state changed:', _event);
    
        async function handleSession() {
          if (session?.user) {
            const { id, email } = session.user;
            const profile = await fetchUserProfile(id);
            if (profile) {
              profile.email = email;
              setUser(profile);
              setIsAuthenticated(true);
              setAuthError(null);
            } else {
              setUser(null);
              setIsAuthenticated(false);
              setAuthError('User profile not found.');
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
    
        // Call async function but don’t await here
        handleSession().catch((error) => {
          console.error('[Auth] Error handling session:', error);
          setUser(null);
          setIsAuthenticated(false);
          setAuthError('Error fetching user profile.');
        });
      }
    );
    

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    console.log('[LOGIN] Logging in with', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN] Error:', error.message);
      setAuthError(error.message);
      return false;
    }

    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        profile.email = data.user.email;
        setUser(profile);
        setIsAuthenticated(true);
        return true;
      } else {
        setAuthError('User profile not found after login.');
        return false;
      }
    }

    setAuthError('Login failed. No user returned.');
    return false;
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('[LOGOUT] Logging out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[LOGOUT] Error:', error.message);
        setAuthError(error.message);
      }
    } catch (err: any) {
      console.error('[LOGOUT] Unexpected error:', err.message || err);
      setAuthError('Unexpected error during logout.');
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    console.log('[REGISTER] Creating account for', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[REGISTER] Error:', error.message);
      setAuthError(error.message);
      return false;
    }

    if (!data.user && !data.session) {
      setAuthError('Account created, but you must verify your email.');
      return false;
    }

    return true;
  };

  const updateUsername = async (newUsername: string): Promise<boolean> => {
    if (!user) {
      setAuthError('Not authenticated.');
      return false;
    }

    const { error } = await supabase
      .from('users')
      .update({ display_name: newUsername })
      .eq('id', user.id);

    if (error) {
      console.error('[updateUsername] Error:', error.message);
      setAuthError(error.message);
      return false;
    }

    setUser((prev) => (prev ? { ...prev, display_name: newUsername } : null));
    return true;
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
