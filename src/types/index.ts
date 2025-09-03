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
  locationName: string; // Human-readable location (e.g., "Whole Foods Market")
  placeName: string; // Human-readable place (e.g., "123 Main St, Anytown")
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
  name_normalized?: string; // Added the name_normalized field here
  purchaseDate: string | null; // ISO timestamp

  // NEW/UPDATED FIELDS
  locationId: string;
  cropId: string;
  placeId: string;
  brandId: string;
  verifiedByUserId: string;
}

// Data format returned from Supabase, aligned with BrixDataPoint
export interface FormattedSubmission {
  id: string;
  brixLevel: number;
  verified: boolean;
  verifiedAt: string | null;
  label: string;
  cropType: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  placeName: string;
  brandName: string;
  submittedBy: string;
  verifiedBy: string;
  submittedAt: string;
  images: string[];
  notes: string | null;
  place: { id: string; label: string; latitude: number | null; longitude: number | null; } | null;
  crop: { id: string; name: string; category: string; excellent_brix: number | null; good_brix: number | null; average_brix: number | null; } | null;
  location: { id: string; name: string; } | null;
  brand: { id: string; name: string; } | null;
  user: { id: string; display_name: string; } | null;
  verifier: { id: string; display_name: string; } | null;
  excellentBrix: number | null;
  goodBrix: number | null;
  averageBrix: number | null;
  poorBrix: number | null;
  userId: string;
  outlier_notes: string | null;
  variety: string | null;
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
  place: string;
  brand: string;
  hasImage: boolean;
  category: string;
}