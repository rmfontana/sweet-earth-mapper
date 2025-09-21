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
  country?: string | null;
  state?: string | null;
  city?: string | null;
}

interface LocationData {
  country: string;
  state: string;
  city: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string, displayName: string, location?: LocationData) => Promise<boolean>;
  updateUsername: (newUsername: string) => Promise<boolean>;
  updateLocation: (location: LocationData) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (!userId) {
      console.error('[fetchUserProfile] No userId provided');
      return null;
    }

    console.log('[fetchUserProfile] Fetching profile for user:', userId);

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, role, points, submission_count, last_submission, country, state, city')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[fetchUserProfile] Supabase error:', error.message, error);
      return null;
    }

    if (!data) {
      console.warn('[fetchUserProfile] No user found for ID:', userId);
      return null;
    }

    console.log('[fetchUserProfile] Profile found:', data);
    return data as UserProfile;
  } catch (err: any) {
    console.error('[fetchUserProfile] Unexpected error:', err.message || err);
    return null;
  }
}

async function ensureProfileExists(userId: string, retries = 3): Promise<UserProfile | null> {
  for (let i = 0; i < retries; i++) {
    const profile = await fetchUserProfile(userId);
    if (profile) {
      return profile;
    }
    console.log(`[ensureProfileExists] Retry ${i + 1}/${retries} for user ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // exponential backoff
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  // Handle session changes synchronously to avoid race conditions
  const handleSessionChange = (session: any) => {
    if (session?.user) {
      const { id, email } = session.user;
      console.log('[Auth] Session established for user:', id);

      setIsAuthenticated(true);
      setAuthError(null);

      // Defer DB calls to fetch the full profile in the background
      setTimeout(async () => {
        try {
          const profile = await ensureProfileExists(id);
          if (profile) {
            if (email) {
              profile.email = email;
            }
            // Update user state with full profile data
            setUser(profile);
            console.log('[Auth] Profile loaded successfully for user:', id);
          } else {
            console.error('[Auth] Profile not found after retries for user:', id);
            // User is authenticated but we don't have their profile. Keep them authenticated for now.
            setAuthError('User profile not found. Please contact support.');
          }
        } catch (err: any) {
          console.error('[Auth] Error fetching profile:', err.message || err);
          setAuthError('Error fetching user profile.');
        }
      }, 0);
    } else {
      console.log('[Auth] No session found');
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
    }
  };

  const loadSession = async () => {
    setIsLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Error getting session:', error.message);
        setAuthError(error.message);
        return;
      }

      handleSessionChange(session);
    } catch (err: any) {
      console.error('[Auth] Unexpected error loading session:', err.message || err);
      setAuthError('Unexpected error loading session.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up listener first to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Auth state change:', event);
      handleSessionChange(session);
      // NOTE: We do NOT set isLoading(false) here, as this is for auth *changes*, 
      // not the initial load. loadSession handles the initial isLoading=false.
    });

    // Then load initial session
    loadSession();

    return () => subscription.unsubscribe();
  }, []);

  const register = async (
    email: string,
    password: string,
    displayName: string,
    location?: LocationData
  ): Promise<boolean> => {
    setAuthError(null);
    try {
      const userMetadata: any = {
        display_name: displayName.trim() || email.split('@')[0],
        ...location,
      };

      console.log('[REGISTER] Attempting registration with metadata:', userMetadata);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('[REGISTER] Supabase auth error:', error.message);
        setAuthError(error.message);
        return false;
      }

      if (!data.user) {
        setAuthError('Registration failed - no user returned');
        return false;
      }

      console.log('[REGISTER] Auth user created:', data.user.id);

      // The database trigger will now automatically create the user profile.
      // We don't need to call the Edge Function from the client.

      if (data.session) {
        // A session means email confirmation is not required,
        // profile will be loaded via onAuthStateChange
        console.log('[REGISTER] Session created, profile will be loaded automatically');
        return true;
      }

      // No session means email confirmation is needed, so just return true for now.
      return true;
    } catch (err: any) {
      console.error('[REGISTER] Unexpected error:', err.message || err);
      setAuthError('Unexpected error during registration.');
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    try {
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
        // Profile will be loaded via onAuthStateChange which now correctly sets 
        // isAuthenticated immediately, preventing the race condition.
        console.log('[LOGIN] User authenticated, profile will be loaded automatically');
        return true;
      }

      setAuthError('Login failed. No user returned.');
      return false;
    } catch (err: any) {
      console.error('[LOGIN] Unexpected error:', err.message || err);
      setAuthError('Unexpected error during login.');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[LOGOUT] Error:', error.message);
        setAuthError(error.message);
      }
    } catch (err: any) {
      console.error('[LOGOUT] Unexpected error:', err.message || err);
      setAuthError('Unexpected error during logout.');
    } finally {
      // The onAuthStateChange listener will ultimately handle setting the state to null/false
      // but we do this here for immediate responsiveness.
      setUser(null); 
      setIsAuthenticated(false);
      setAuthError(null); 
    }
  };

  const updateUsername = async (newUsername: string): Promise<boolean> => {
    if (!user) {
      setAuthError('Not authenticated.');
      return false;
    }

    try {
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
    } catch (err: any) {
      console.error('[updateUsername] Unexpected error:', err.message || err);
      setAuthError('Unexpected error updating username.');
      return false;
    }
  };

  const updateLocation = async (location: LocationData): Promise<boolean> => {
    if (!user) {
      console.warn('[updateLocation] Skipped: user is null');
      setAuthError('Not authenticated.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          country: location.country,
          state: location.state,
          city: location.city,
        })
        .eq('id', user.id);

      if (error) {
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.error('[updateLocation] Location columns do not exist. Please run the database migration.');
          setAuthError('Location feature is not available. Please contact support.');
          return false;
        }

        console.error('[updateLocation] Error:', error.message);
        setAuthError(error.message);
        return false;
      }

      // Re-fetch profile to get the latest data
      const refreshedProfile = await fetchUserProfile(user.id);
      if (refreshedProfile) {
        setUser({ ...refreshedProfile, email: user.email });
      }

      return true;
    } catch (err: any) {
      console.error('[updateLocation] Unexpected error:', err.message || err);
      setAuthError('Unexpected error updating location.');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        authError,
        login,
        logout,
        register,
        updateUsername,
        updateLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth was called outside of AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};