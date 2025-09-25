import { MapFilter } from '../types';
import { DEFAULT_MAP_FILTERS } from '../contexts/FilterContext';

export interface LeaderboardFilters {
  crop?: string;
  brand?: string;
  place?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
  submittedBy?: string;
}

export const parseURLSearchParams = (searchParams: URLSearchParams): Partial<MapFilter> => {
  const filters: Partial<MapFilter> = {};

  // Parse crop types (can be comma-separated)
  const crop = searchParams.get('crop');
  if (crop) {
    filters.cropTypes = crop.split(',').map(c => c.trim()).filter(Boolean);
  }

  // Parse single-value filters
  const brand = searchParams.get('brand');
  if (brand) filters.brand = brand;

  const place = searchParams.get('place');
  if (place) filters.place = place;

  const category = searchParams.get('category');
  if (category) filters.category = category;

  const submittedBy = searchParams.get('submittedBy');
  if (submittedBy) filters.submittedBy = submittedBy;

  // Parse location (city, state, country into location field)
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const country = searchParams.get('country');
  if (city || state || country) {
    const locationParts = [city, state, country].filter(Boolean);
    filters.location = locationParts.join(', ');
  }

  // Parse brix range
  const brixMin = searchParams.get('brixMin');
  const brixMax = searchParams.get('brixMax');
  if (brixMin && brixMax) {
    const min = parseFloat(brixMin);
    const max = parseFloat(brixMax);
    if (!isNaN(min) && !isNaN(max)) {
      filters.brixRange = [min, max];
    }
  }

  return filters;
};

export const createURLSearchParams = (filters: LeaderboardFilters): URLSearchParams => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      params.set(key, value);
    }
  });

  return params;
};

export const mergeFiltersWithDefaults = (urlFilters: Partial<MapFilter>): MapFilter => {
  return {
    ...DEFAULT_MAP_FILTERS,
    ...urlFilters,
  };
};