
// Core TypeScript interfaces for the BRIX platform
export interface BrixDataPoint {
  id: string;
  brixLevel: number; // Mapped from brix_value
  verified: boolean;
  verifiedAt?: string; // Mapped from verified_at
  variety: string;
  cropType: string; // Mapped from crop.name
  category?: string; // Mapped from crop.category
  latitude: number; // Mapped from location.latitude
  longitude: number; // Mapped from location.longitude
  locationName: string; // Mapped from location.name
  storeName?: string; // Mapped from store.name
  brandName?: string; // Mapped from brand.name
  submittedBy: string; // Mapped from user.display_name
  verifiedBy?: string; // Mapped from verifier.display_name
  submittedAt: string; // Mapped from assessment_date
  outlier_notes?: string;
  images: string[]; // Array of image URLs, mapped from submission_images.image_url

  // Direct properties from `crop` join for Brix thresholds, making them directly available
  poorBrix?: number;
  averageBrix?: number;
  goodBrix?: number;
  excellentBrix?: number;
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

