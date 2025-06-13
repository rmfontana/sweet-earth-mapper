
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demonstration
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  useEffect(() => {
    // Check for stored auth token on app load
    const storedToken = localStorage.getItem('brix_token');
    const storedUser = localStorage.getItem('brix_user');
    
    if (storedToken && storedUser) {
      setAuthState({
        isAuthenticated: true,
        user: JSON.parse(storedUser),
        token: storedToken
      });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app, this would call your backend
    const user = mockUsers.find(u => u.email === email);
    
    if (user && password === 'password') {
      const mockToken = 'mock_jwt_token_' + Date.now();
      
      setAuthState({
        isAuthenticated: true,
        user,
        token: mockToken
      });
      
      localStorage.setItem('brix_token', mockToken);
      localStorage.setItem('brix_user', JSON.stringify(user));
      
      return true;
    }
    
    return false;
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    // Mock registration
    const newUser: User = {
      id: Date.now().toString(),
      username,
      email,
      joinDate: new Date().toISOString().split('T')[0],
      totalSubmissions: 0,
      verifiedSubmissions: 0,
      badges: []
    };
    
    const mockToken = 'mock_jwt_token_' + Date.now();
    
    setAuthState({
      isAuthenticated: true,
      user: newUser,
      token: mockToken
    });
    
    localStorage.setItem('brix_token', mockToken);
    localStorage.setItem('brix_user', JSON.stringify(newUser));
    
    return true;
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    
    localStorage.removeItem('brix_token');
    localStorage.removeItem('brix_user');
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
