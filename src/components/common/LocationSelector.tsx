import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { locationService, Country, State, City, LocationData } from '../../lib/locationServiceforRegister';

interface LocationSelectorProps {
  value: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
  };
  onChange: (location: {
    country: string;
    countryCode: string; 
    state: string;
    stateCode: string;
    city: string;
  }) => void;
  disabled?: boolean;
  required?: boolean;
  showAutoDetect?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  showAutoDetect = true
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false,
    autoDetect: false
  });
  
  const [error, setError] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);

  // Load countries on mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (value.countryCode && value.countryCode !== '') {
      loadStates(value.countryCode);
    } else {
      setStates([]);
      setCities([]);
    }
  }, [value.countryCode]);

  // Load cities when state changes
  useEffect(() => {
    if (value.countryCode && value.stateCode) {
      loadCities(value.countryCode, value.stateCode);
    } else {
      setCities([]);
    }
  }, [value.countryCode, value.stateCode]);

  const loadCountries = async () => {
    setLoading(prev => ({ ...prev, countries: true }));
    setError(null);
    
    try {
      const countriesData = await locationService.getCountries();
      setCountries(countriesData);
    } catch (err) {
      setError('Failed to load countries. Please refresh the page.');
      console.error('Error loading countries:', err);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadStates = async (countryCode: string) => {
    setLoading(prev => ({ ...prev, states: true }));
    
    try {
      const statesData = await locationService.getStates(countryCode);
      setStates(statesData);
      
      // Reset state and city if current selections are invalid
      if (value.state && !statesData.find(s => s.name === value.state)) {
        onChange({
          ...value,
          state: '',
          stateCode: '',
          city: ''
        });
      }
    } catch (err) {
      console.error('Error loading states:', err);
      setStates([]);
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadCities = async (countryCode: string, stateCode: string) => {
    setLoading(prev => ({ ...prev, cities: true }));
    
    try {
      const citiesData = await locationService.getCities(countryCode, stateCode);
      setCities(citiesData);
      
      // Reset city if current selection is invalid
      if (value.city && !citiesData.find(c => c.name === value.city)) {
        onChange({
          ...value,
          city: ''
        });
      }
    } catch (err) {
      console.error('Error loading cities:', err);
      setCities([]);
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const handleAutoDetectLocation = async () => {
    setLoading(prev => ({ ...prev, autoDetect: true }));
    setError(null);
    
    try {
      const detectedLocation = await locationService.getUserLocation();
      
      if (detectedLocation) {
        onChange({
          country: detectedLocation.country,
          countryCode: detectedLocation.countryCode,
          state: detectedLocation.state,
          stateCode: detectedLocation.stateCode,
          city: detectedLocation.city
        });
      } else {
        setError('Unable to detect your location. Please select manually.');
      }
    } catch (err) {
      setError('Failed to detect location. Please select manually.');
      console.error('Error detecting location:', err);
    } finally {
      setLoading(prev => ({ ...prev, autoDetect: false }));
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const selectedCountry = countries.find(c => c.code === countryCode);
    if (selectedCountry) {
      onChange({
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        state: '',
        stateCode: '',
        city: ''
      });
    }
  };

  const handleStateChange = (stateName: string) => {
    const selectedState = states.find(s => s.name === stateName);
    if (selectedState) {
      onChange({
        ...value,
        state: selectedState.name,
        stateCode: selectedState.adminCode1,
        city: ''
      });
    }
  };

  const handleCityChange = (cityName: string) => {
    onChange({
      ...value,
      city: cityName
    });
    setCityPopoverOpen(false);
    setCitySearch('');
  };

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase())
  ).slice(0, 100); // Limit results for performance

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showAutoDetect && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoDetectLocation}
            disabled={disabled || loading.autoDetect}
            className="text-sm"
          >
            {loading.autoDetect ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            {loading.autoDetect ? 'Detecting...' : 'Auto-detect my location'}
          </Button>
        </div>
      )}

      {/* Country Selection */}
      <div>
        <Label htmlFor="country">
          Country {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value.countryCode}
          onValueChange={handleCountryChange}
          disabled={disabled || loading.countries}
          required={required}
        >
          <SelectTrigger className="w-full mt-1">
            <SelectValue placeholder={loading.countries ? "Loading countries..." : "Select country"} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <div className="flex items-center">
                  {country.flag && <span className="mr-2">{country.flag}</span>}
                  {country.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State/Province Selection */}
      {value.countryCode && (
        <div>
          <Label htmlFor="state">
            State/Province {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={value.state}
            onValueChange={handleStateChange}
            disabled={disabled || loading.states || states.length === 0}
            required={required}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue 
                placeholder={
                  loading.states 
                    ? "Loading states..." 
                    : states.length === 0 
                      ? "No states available"
                      : "Select state/province"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={`${state.geonameId}-${state.adminCode1}`} value={state.name}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* City Selection with Search */}
      {value.countryCode && value.state && (
        <div>
          <Label htmlFor="city">
            City {required && <span className="text-red-500">*</span>}
          </Label>
          <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={cityPopoverOpen}
                className="w-full mt-1 justify-between font-normal"
                disabled={disabled || loading.cities || cities.length === 0}
              >
                {value.city || (
                  loading.cities 
                    ? "Loading cities..." 
                    : cities.length === 0
                      ? "No cities available"
                      : "Select city"
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Search cities..."
                  value={citySearch}
                  onValueChange={setCitySearch}
                />
                <CommandList>
                  <CommandEmpty>No cities found.</CommandEmpty>
                  <CommandGroup>
                    {filteredCities.map((city) => (
                      <CommandItem
                        key={city.geonameId}
                        value={city.name}
                        onSelect={handleCityChange}
                      >
                        <div className="flex flex-col">
                          <span>{city.name}</span>
                          {city.population && city.population > 0 && (
                            <span className="text-xs text-gray-500">
                              Population: {city.population.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;