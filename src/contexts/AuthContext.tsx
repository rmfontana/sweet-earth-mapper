import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../integrations/supabase/client";

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
  isLoading: boolean;       // session loading
  profileLoading: boolean;  // profile loading
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    location?: LocationData
  ) => Promise<boolean>;
  updateUsername: (newUsername: string) => Promise<boolean>;
  updateLocation: (location: LocationData) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  handleAuthCallback: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("users")
      .select(
        "id, display_name, role, points, submission_count, last_submission, country, state, city"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[fetchUserProfile] Supabase error:", error.message);
      return null;
    }

    return data as UserProfile;
  } catch (err: any) {
    console.error("[fetchUserProfile] Unexpected error:", err.message || err);
    return null;
  }
}

async function ensureProfileExists(
  userId: string,
  retries = 3
): Promise<UserProfile | null> {
  for (let i = 0; i < retries; i++) {
    const profile = await fetchUserProfile(userId);
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // session loading
  const [profileLoading, setProfileLoading] = useState(true); // 👈 new

  const isAdmin = user?.role === "admin";

  const handleSessionChange = async (session: any) => {
    if (session?.user) {
      const { id, email } = session.user;

      setIsAuthenticated(true);
      setAuthError(null);
      setProfileLoading(true); // 👈 start profile loading

      try {
        const profile = await ensureProfileExists(id);
        if (profile) {
          if (email) profile.email = email;
          setUser(profile);
        } else {
          setAuthError("User profile not found. Please contact support.");
        }
      } catch (err: any) {
        setAuthError("Error fetching user profile.");
      } finally {
        setProfileLoading(false); // 👈 done loading
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setProfileLoading(false);
    }
  };

  const loadSession = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setAuthError(error.message);
        return;
      }

      await handleSessionChange(session);
    } catch (err: any) {
      setAuthError("Unexpected error loading session.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleSessionChange(session);
    });

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
        display_name: displayName.trim() || email.split("@")[0],
        ...location,
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setAuthError(error.message);
        return false;
      }

      if (!data.user) {
        setAuthError("Registration failed - no user returned");
        return false;
      }

      return true;
    } catch (err: any) {
      setAuthError("Unexpected error during registration.");
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
        console.error('Login error:', error);
        
        // Parse specific error messages for better UX
        let userFriendlyMessage = error.message;
        
        if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please verify your email address before logging in. Check your inbox for the verification link.';
        } else if (error.message.includes('Invalid login credentials')) {
          userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyMessage = 'Too many login attempts. Please wait a moment before trying again.';
        }
        
        setAuthError(userFriendlyMessage);
        return false;
      }

      if (data.user) return true;

      setAuthError("Login failed. No user returned.");
      return false;
    } catch (err: any) {
      setAuthError("Unexpected error during login.");
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setAuthError(error.message);
    } catch (err: any) {
      setAuthError("Unexpected error during logout.");
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
    }
  };

  const updateUsername = async (newUsername: string): Promise<boolean> => {
    if (!user) {
      setAuthError("Not authenticated.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ display_name: newUsername })
        .eq("id", user.id);

      if (error) {
        setAuthError(error.message);
        return false;
      }

      const refreshedProfile = await fetchUserProfile(user.id);
      if (refreshedProfile) {
        setUser({ ...refreshedProfile, email: user.email });
      }

      return true;
    } catch (err: any) {
      setAuthError("Unexpected error updating username.");
      return false;
    }
  };

  const updateLocation = async (location: LocationData): Promise<boolean> => {
    if (!user) {
      setAuthError("Not authenticated.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          country: location.country,
          state: location.state,
          city: location.city,
        })
        .eq("id", user.id);

      if (error) {
        setAuthError(error.message);
        return false;
      }

      const refreshedProfile = await fetchUserProfile(user.id);
      if (refreshedProfile) {
        setUser({ ...refreshedProfile, email: user.email });
      }

      return true;
    } catch (err: any) {
      setAuthError("Unexpected error updating location.");
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        setAuthError(error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      setAuthError("Failed to send password reset email");
      return false;
    }
  };

  const updatePassword = async (password: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        setAuthError(error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      setAuthError("Failed to update password");
      return false;
    }
  };

  const handleAuthCallback = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setAuthError(error.message);
        return false;
      }

      if (session?.user) {
        const profile = await ensureProfileExists(session.user.id);
        if (profile) {
          if (session.user.email) profile.email = session.user.email;
          setUser(profile);
          setIsAuthenticated(true);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      setAuthError("Authentication verification failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        profileLoading,
        authError,
        login,
        logout,
        register,
        updateUsername,
        updateLocation,
        resetPassword,
        updatePassword,
        handleAuthCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};