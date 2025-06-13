
import { BrixDataPoint, Badge } from '../types';

// Mock Brix data points for demonstration
export const mockBrixData: BrixDataPoint[] = [
  {
    id: '1',
    latitude: 40.7128,
    longitude: -74.0060,
    brixLevel: 12.5,
    cropType: 'Apple',
    variety: 'Honeycrisp',
    measurementDate: '2024-06-10',
    submittedBy: 'farmerjohn',
    submittedAt: '2024-06-10T14:30:00Z',
    verified: true,
    notes: 'Perfect ripeness, great weather conditions',
    images: ['apple1.jpg']
  },
  {
    id: '2',
    latitude: 40.7589,
    longitude: -73.9851,
    brixLevel: 18.2,
    cropType: 'Grapes',
    variety: 'Cabernet Sauvignon',
    measurementDate: '2024-06-12',
    submittedBy: 'vineyardmary',
    submittedAt: '2024-06-12T10:15:00Z',
    verified: true,
    notes: 'Excellent sugar content for harvest',
    images: ['grapes1.jpg', 'grapes2.jpg']
  },
  {
    id: '3',
    latitude: 40.6892,
    longitude: -74.0445,
    brixLevel: 8.7,
    cropType: 'Tomato',
    variety: 'Roma',
    measurementDate: '2024-06-08',
    submittedBy: 'gardenerpete',
    submittedAt: '2024-06-08T16:45:00Z',
    verified: false,
    notes: 'Still developing, needs more time'
  },
  {
    id: '4',
    latitude: 40.7831,
    longitude: -73.9712,
    brixLevel: 15.3,
    cropType: 'Strawberry',
    variety: 'Albion',
    measurementDate: '2024-06-14',
    submittedBy: 'berryfarm',
    submittedAt: '2024-06-14T08:20:00Z',
    verified: true,
    notes: 'Peak sweetness achieved'
  },
  {
    id: '5',
    latitude: 40.7282,
    longitude: -73.7949,
    brixLevel: 22.1,
    cropType: 'Watermelon',
    variety: 'Sugar Baby',
    measurementDate: '2024-06-13',
    submittedBy: 'farmerjohn',
    submittedAt: '2024-06-13T12:00:00Z',
    verified: true,
    notes: 'Exceptionally sweet, perfect for harvest'
  }
];

// Available crop types for filtering
export const cropTypes = [
  'Apple', 'Grapes', 'Tomato', 'Strawberry', 'Watermelon', 
  'Orange', 'Peach', 'Cherry', 'Corn', 'Carrot'
];

// Achievement badges for gamification
export const availableBadges: Badge[] = [
  {
    id: 'first-submission',
    name: 'First Steps',
    description: 'Made your first Brix measurement submission',
    icon: '🌱',
    requirement: 1,
    category: 'submissions'
  },
  {
    id: 'ten-submissions',
    name: 'Growing Strong',
    description: 'Submitted 10 Brix measurements',
    icon: '🌿',
    requirement: 10,
    category: 'submissions'
  },
  {
    id: 'dedicated-farmer',
    name: 'Dedicated Farmer',
    description: 'Submitted 25 Brix measurements',
    icon: '🚜',
    requirement: 25,
    category: 'submissions'
  },
  {
    id: 'sweet-expert',
    name: 'Sweet Expert',
    description: 'Measured 50 different crops',
    icon: '🍯',
    requirement: 50,
    category: 'diversity'
  },
  {
    id: 'accurate-measurer',
    name: 'Accurate Measurer',
    description: '90% of submissions verified',
    icon: '🎯',
    requirement: 90,
    category: 'accuracy'
  },
  {
    id: 'community-helper',
    name: 'Community Helper',
    description: 'Helped verify 20 other submissions',
    icon: '🤝',
    requirement: 20,
    category: 'community'
  }
];
