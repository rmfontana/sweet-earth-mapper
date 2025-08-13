
// Core TypeScript interfaces for the BRIX platform
export interface BrixDataPoint {
  id: string;
  brixLevel: number;
  verified: boolean;
  verifiedAt: string | null; // ISO timestamp
  variety: string; // Specific variety of the crop (e.g., Roma for Tomato)
  cropType: string; // General crop type (e.g., Tomato)
  category: string; // Category of the crop (e.g., vegetable, fruit)
  latitude: number | null;
  longitude: number | null;
  locationName: string; // Human-readable location
  storeName: string;
  brandName: string;
  submittedBy: string; // Display name of the user who submitted it
  userId?: string; // Add userId for internal filtering/linking to users
  verifiedBy: string; // Display name of the user who verified it
  submittedAt: string; // ISO timestamp of assessment date
  outlier_notes: string;
  images: string[]; // Array of image URLs/paths
  poorBrix: number | null;
  averageBrix: number | null;
  goodBrix: number | null;
  excellentBrix: number | null;
}

export interface BrixThresholds {
  excellent: number;
  good: number;
  average: number;
  poor: number;
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
  cropTypes: string[]; // Consistent array for selected crop types
  brixRange: [number, number];
  dateRange: [string, string];
  verifiedOnly: boolean;
  submittedBy: string;
  store: string;
  brand: string;
  hasImage: boolean;
  category: string;
}

