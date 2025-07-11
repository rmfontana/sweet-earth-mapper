
// Core TypeScript interfaces for the BRIX platform
export interface BrixDataPoint {
  id: string;
  latitude: number;
  longitude: number;
  brixLevel: number;
  cropType: string;
  variety?: string;
  measurementDate: string;
  submittedBy: string;
  submittedAt: string;
  verified: boolean;
  notes?: string;
  images?: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  joinDate: string;
  totalSubmissions: number;
  verifiedSubmissions: number;
  badges: Badge[];
  isAdmin?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  requirement: number;
  category: 'submissions' | 'accuracy' | 'diversity' | 'community';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface MapFilter {
  cropTypes: string[];
  brixRange: [number, number];
  dateRange: [string, string];
  verifiedOnly: boolean;
}
