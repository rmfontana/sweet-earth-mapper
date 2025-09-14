import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '../integrations/supabase/client';
import { getSupabaseUrl } from "@/lib/utils.ts";

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

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, role, points, submission_count, last_submission, country, state, city')
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

    return data as UserProfile;
  } catch (err: any) {
    console.error('[fetchUserProfile] Unexpected error:', err.message || err);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Async handler for session changes - called without await inside onAuthStateChange
  const handleSessionChangeAsync = async (session: any) => {
    if (session?.user) {
      try {
        const { id, email } = session.user;
        const profile = await fetchUserProfile(id);
        if (profile) {
          if (email) {
            profile.email = email;
          }
          setUser(profile);
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError('User profile not found.');
        }
      } catch (err: any) {
        console.error('[Auth] Error fetching profile:', err.message || err);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError('Error fetching user profile.');
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Initial session load (awaiting is fine here)
  const loadSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Error getting session:', error.message);
        setAuthError(error.message);
        return;
      }

      await handleSessionChangeAsync(session);
    } catch (err: any) {
      console.error('[Auth] Unexpected error loading session:', err.message || err);
      setAuthError('Unexpected error loading session.');
    }
  };

  useEffect(() => {
    loadSession(); // Initial load

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // No await here — fire and forget async call to avoid deadlocks
      handleSessionChangeAsync(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          if (data.user.email) {
            profile.email = data.user.email;
          }
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
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    displayName: string, 
    location?: LocationData
  ): Promise<boolean> => {
    setAuthError(null);
    
    try {
      // The `data` option in `supabase.auth.signUp` is for `auth.users` metadata.
      // We'll include location data in the metadata and let the trigger handle it
      const userMetadata: any = {
        display_name: displayName.trim() || email.split('@')[0],
      };

      // Add location data to metadata if provided
      if (location) {
        userMetadata.country = location.country;
        userMetadata.state = location.state;
        userMetadata.city = location.city;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata
        },
      });

      if (error) {
        console.error('[REGISTER] Error:', error.message);
        setAuthError(error.message);
        return false;
      }

      // If email confirmation is required, user won't be logged in immediately
      if (data.user && !data.session) {
        // Registration successful, needs email confirmation
        return true;
      }

      // If user is immediately logged in (email confirmation disabled)
      if (data.user && data.session) {
        // Wait a moment for the trigger/hook to create the profile
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Try to fetch the profile a few times in case of timing issues
        let profile = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!profile && attempts < maxAttempts) {
          profile = await fetchUserProfile(data.user.id);
          if (!profile) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        if (profile) {
          if (data.user.email) {
            profile.email = data.user.email;
          }
          setUser(profile);
          setIsAuthenticated(true);
          
          // If location wasn't set during signup, update it now
          if (location && (!profile.country || !profile.state || !profile.city)) {
            await updateLocation(location);
          }
          
          return true;
        } else {
          console.warn('[REGISTER] Profile not found after multiple attempts');
          setAuthError('Account created but profile setup is still in progress. Please try refreshing or logging in again.');
          return false;
        }
      }

      return true;
    } catch (err: any) {
      console.error('[REGISTER] Unexpected error:', err.message || err);
      setAuthError('Unexpected error during registration.');
      return false;
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
      // Check if location columns exist by attempting the update
      const { error } = await supabase
        .from('users')
        .update({ 
          country: location.country,
          state: location.state,
          city: location.city
        })
        .eq('id', user.id);
  
      if (error) {
        // If the error is about missing columns, the migration hasn't been run yet
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.error('[updateLocation] Location columns do not exist. Please run the database migration.');
          setAuthError('Location feature is not available. Please contact support.');
          return false;
        }
        
        console.error('[updateLocation] Error:', error.message);
        setAuthError(error.message);
        return false;
      }
  
      // Re-fetch the profile to get the latest from DB
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