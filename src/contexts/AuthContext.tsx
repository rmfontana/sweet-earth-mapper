
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demonstration - In production, this would come from a secure backend
const mockUsers: User[] = [
  {
    id: '1',
    username: 'farmerjohn',
    email: 'john@farm.com',
    joinDate: '2024-01-15',
    totalSubmissions: 45,
    verifiedSubmissions: 42,
    badges: [
      { id: '1', name: 'First Steps', description: 'Made your first submission', icon: '🌱', unlockedAt: '2024-01-16', requirement: 1, category: 'submissions' },
      { id: '2', name: 'Dedicated Farmer', description: 'Made 25 submissions', icon: '🚜', unlockedAt: '2024-02-20', requirement: 25, category: 'submissions' }
    ]
  }
];

// Simple password hashing simulation (In production, use bcrypt or similar on backend)
const hashPassword = (password: string): string => {
  // This is a simple hash for demo purposes - use proper bcrypt in production
  return btoa(password + 'salt_key_12345');
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

// Generate a more secure mock token
const generateSecureToken = (userId: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return btoa(`${userId}.${timestamp}.${randomString}`);
};

// Token validation with expiration
const validateToken = (token: string): boolean => {
  try {
    const decoded = atob(token);
    const [userId, timestamp] = decoded.split('.');
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return tokenAge < maxAge && userId;
  } catch {
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  useEffect(() => {
    // Check for stored auth token on app load with validation
    const storedToken = sessionStorage.getItem('brix_token');
    const storedUser = sessionStorage.getItem('brix_user');
    
    if (storedToken && storedUser && validateToken(storedToken)) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          token: storedToken
        });
      } catch (error) {
        // Clear invalid stored data
        sessionStorage.removeItem('brix_token');
        sessionStorage.removeItem('brix_user');
      }
    } else {
      // Clear expired or invalid tokens
      sessionStorage.removeItem('brix_token');
      sessionStorage.removeItem('brix_user');
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Input validation
    if (!email || !password) {
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Simulate rate limiting (in production, implement server-side)
    const lastAttempt = sessionStorage.getItem('last_login_attempt');
    if (lastAttempt && Date.now() - parseInt(lastAttempt) < 1000) {
      return false; // Rate limit: 1 second between attempts
    }
    sessionStorage.setItem('last_login_attempt', Date.now().toString());

    // Mock authentication - In production, this would call your secure backend
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Simulate password verification (in production, compare with hashed password from database)
    if (user && password === 'password') {
      const secureToken = generateSecureToken(user.id);
      
      // Create user object with proper boolean type for isAdmin
      const authenticatedUser: User = {
        ...user,
        isAdmin: user.username === 'farmerjohn' // This ensures boolean type
      };
      
      setAuthState({
        isAuthenticated: true,
        user: authenticatedUser,
        token: secureToken
      });
      
      // Use sessionStorage instead of localStorage for better security
      sessionStorage.setItem('brix_token', secureToken);
      sessionStorage.setItem('brix_user', JSON.stringify(authenticatedUser));
      
      return true;
    }
    
    return false;
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    // Input validation
    if (!username || !email || !password) {
      return false;
    }

    // Username validation (alphanumeric and underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Password strength validation
    if (password.length < 8) {
      return false;
    }

    // Check if user already exists
    const existingUser = mockUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase() || 
      u.username.toLowerCase() === username.toLowerCase()
    );
    
    if (existingUser) {
      return false;
    }

    // Mock registration - In production, hash password and store in secure database
    const newUser: User = {
      id: crypto.getRandomValues(new Uint32Array(1))[0].toString(),
      username,
      email,
      joinDate: new Date().toISOString().split('T')[0],
      totalSubmissions: 0,
      verifiedSubmissions: 0,
      badges: [],
      isAdmin: false // Explicitly set as boolean
    };
    
    const secureToken = generateSecureToken(newUser.id);
    
    setAuthState({
      isAuthenticated: true,
      user: newUser,
      token: secureToken
    });
    
    // Use sessionStorage for better security
    sessionStorage.setItem('brix_token', secureToken);
    sessionStorage.setItem('brix_user', JSON.stringify(newUser));
    
    return true;
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    
    // Clear all stored authentication data
    sessionStorage.removeItem('brix_token');
    sessionStorage.removeItem('brix_user');
    sessionStorage.removeItem('last_login_attempt');
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
