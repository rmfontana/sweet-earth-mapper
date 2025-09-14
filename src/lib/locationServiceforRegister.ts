import { getGeonamesUsername } from './getGeonamesUsername';

export interface Country {
  code: string;
  name: string;
  flag?: string;
}

export interface State {
  geonameId: number;
  name: string;
  adminCode1: string;
}

export interface City {
  geonameId: number;
  name: string;
  adminName1: string; // State name
  population?: number;
}

export interface LocationData {
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  city: string;
  cityId?: number;
}

/**
 * Location service using REST Countries API and GeoNames API
 * * REST Countries: Free, no API key required
 * GeoNames: Free with registration (up to 30,000 requests/day)
 * * Register at: http://www.geonames.org/login
 */
export class LocationService {
  private static instance: LocationService;
  private geonamesUsername: string | null = null;
  private geonamesUsernamePromise: Promise<string> | null = null;
  private readonly REST_COUNTRIES_BASE_URL = 'https://restcountries.com/v3.1';
  private readonly GEONAMES_BASE_URL = 'http://api.geonames.org';

  // Cache for performance
  private countriesCache: Country[] | null = null;
  private statesCache: Map<string, State[]> = new Map();
  private citiesCache: Map<string, City[]> = new Map();

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Ensures the GeoNames username is loaded before any API call is made.
   * This is a self-initializing mechanism.
   */
  private async ensureUsernameIsLoaded(): Promise<string> {
    if (this.geonamesUsername) {
      return this.geonamesUsername;
    }

    if (this.geonamesUsernamePromise) {
      return this.geonamesUsernamePromise;
    }

    this.geonamesUsernamePromise = getGeonamesUsername().then(username => {
      if (!username) {
        throw new Error('Failed to load GeoNames username from Supabase Edge Function.');
      }
      this.geonamesUsername = username;
      return username;
    });

    return this.geonamesUsernamePromise;
  }

  /**
   * Get all countries from REST Countries API
   */
  async getCountries(): Promise<Country[]> {
    if (this.countriesCache) {
      return this.countriesCache;
    }

    try {
      const response = await fetch(`${this.REST_COUNTRIES_BASE_URL}/all?fields=name,cca2,flag`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const countries: Country[] = data
        .map((country: any) => ({
          code: country.cca2,
          name: country.name.common,
          flag: country.flag
        }))
        .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

      this.countriesCache = countries;
      return countries;
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw new Error('Failed to load countries. Please check your internet connection.');
    }
  }

  /**
   * Get states/provinces for a specific country using GeoNames API
   */
  async getStates(countryCode: string): Promise<State[]> {
    const cacheKey = countryCode;
    
    if (this.statesCache.has(cacheKey)) {
      return this.statesCache.get(cacheKey)!;
    }

    const username = await this.ensureUsernameIsLoaded();

    try {
      const url = `${this.GEONAMES_BASE_URL}/childrenJSON?geonameId=${await this.getCountryGeonameId(countryCode)}&username=${username}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status) {
        throw new Error(data.status.message || 'GeoNames API error');
      }
      
      const states: State[] = (data.geonames || [])
        .filter((item: any) => item.fclName === 'country, state, region,...')
        .map((state: any) => ({
          geonameId: state.geonameId,
          name: state.name,
          adminCode1: state.adminCode1 || state.adminCodes1?.ISO3166_2 || ''
        }))
        .sort((a: State, b: State) => a.name.localeCompare(b.name));

      this.statesCache.set(cacheKey, states);
      return states;
    } catch (error) {
      console.error('Error fetching states:', error);
      throw new Error('Failed to load states/provinces. Please try again.');
    }
  }

  /**
   * Get cities for a specific state using GeoNames API
   */
  async getCities(countryCode: string, stateCode: string): Promise<City[]> {
    const cacheKey = `${countryCode}-${stateCode}`;
    
    if (this.citiesCache.has(cacheKey)) {
      return this.citiesCache.get(cacheKey)!;
    }

    const username = await this.ensureUsernameIsLoaded();

    try {
      // Get cities with population > 1000 for better relevance
      const url = `${this.GEONAMES_BASE_URL}/searchJSON?country=${countryCode}&adminCode1=${stateCode}&featureClass=P&maxRows=1000&username=${username}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status) {
        throw new Error(data.status.message || 'GeoNames API error');
      }
      
      const cities: City[] = (data.geonames || [])
        .map((city: any) => ({
          geonameId: city.geonameId,
          name: city.name,
          adminName1: city.adminName1,
          population: city.population || 0
        }))
        .sort((a: City, b: City) => {
          // Sort by population desc, then by name
          if (b.population !== a.population) {
            return (b.population || 0) - (a.population || 0);
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, 500); // Limit to top 500 cities for performance

      this.citiesCache.set(cacheKey, cities);
      return cities;
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw new Error('Failed to load cities. Please try again.');
    }
  }

  /**
   * Search cities by name across a country (for autocomplete)
   */
  async searchCities(countryCode: string, query: string, maxResults: number = 20): Promise<City[]> {
    if (!query || query.length < 2) return [];
    
    const username = await this.ensureUsernameIsLoaded();

    try {
      const url = `${this.GEONAMES_BASE_URL}/searchJSON?country=${countryCode}&name_startsWith=${encodeURIComponent(query)}&featureClass=P&maxRows=${maxResults}&username=${username}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status) {
        throw new Error(data.status.message || 'GeoNames API error');
      }
      
      return (data.geonames || [])
        .map((city: any) => ({
          geonameId: city.geonameId,
          name: city.name,
          adminName1: city.adminName1,
          population: city.population || 0
        }))
        .sort((a: City, b: City) => (b.population || 0) - (a.population || 0));
    } catch (error) {
      console.error('Error searching cities:', error);
      throw new Error('Failed to search cities. Please try again.');
    }
  }

  /**
   * Get country GeoName ID for API calls
   */
  private async getCountryGeonameId(countryCode: string): Promise<number> {
    const username = await this.ensureUsernameIsLoaded();
    
    try {
      const url = `${this.GEONAMES_BASE_URL}/countryInfoJSON?country=${countryCode}&username=${username}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.geonames && data.geonames.length > 0) {
        return data.geonames[0].geonameId;
      }
      
      throw new Error('Country not found');
    } catch (error) {
      console.error('Error getting country geonameId:', error);
      throw new Error('Failed to get country information.');
    }
  }

  /**
   * Get user's approximate location using browser geolocation and reverse geocoding
   */
  async getUserLocation(): Promise<LocationData | null> {
    const username = await this.ensureUsernameIsLoaded();
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const url = `${this.GEONAMES_BASE_URL}/findNearbyPlaceNameJSON?lat=${latitude}&lng=${longitude}&username=${username}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.geonames && data.geonames.length > 0) {
              const place = data.geonames[0];
              resolve({
                country: place.countryName,
                countryCode: place.countryCode,
                state: place.adminName1 || '',
                stateCode: place.adminCode1 || '',
                city: place.name,
                cityId: place.geonameId
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            resolve(null);
          }
        },
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Clear all caches (useful for testing or if data becomes stale)
   */
  clearCache(): void {
    this.countriesCache = null;
    this.statesCache.clear();
    this.citiesCache.clear();
  }

  /**
   * Validate GeoNames username configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      const username = await this.ensureUsernameIsLoaded();
      const url = `${this.GEONAMES_BASE_URL}/countryInfoJSON?username=${username}`;
      const response = await fetch(url);
      const data = await response.json();
      
      return !data.status; // If there's no status object, it's valid
    } catch (error) {
      return false;
    }
  }
}

export const locationService = LocationService.getInstance();
