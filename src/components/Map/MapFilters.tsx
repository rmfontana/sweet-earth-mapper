import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { ChevronDown, Check, Calendar, X } from 'lucide-react';
import { fetchCropTypes } from '@/lib/fetchCropTypes';
import { fetchBrands } from '@/lib/fetchBrands';
import { fetchStores } from '@/lib/fetchStores';
import { fetchCropCategories } from '@/lib/fetchCropCategories';

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Filters {
  cropTypes: string[];
  brixRange: [number, number];
  dateRange: [string, string];
  verifiedOnly: boolean;    // required
  submittedBy: string;
  nearbyOnly: boolean;
  store: string;
  brand: string;
  hasImage: boolean;
  category: string;
}

interface MapFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const MapFilters: React.FC<MapFiltersProps> = ({ filters, onFiltersChange }) => {
  // Data options for dropdowns
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Search queries for filtering dropdowns
  const [cropCategoryQuery, setCropCategoryQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [cropQuery, setCropQuery] = useState('');

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [crops, brands, stores, categories] = await Promise.all([
          fetchCropTypes(),
          fetchBrands(),
          fetchStores(),
          fetchCropCategories()
        ]);
        setAvailableCrops(crops);
        setAvailableBrands(brands);
        setAvailableStores(stores);
        setAvailableCategories(categories);
      } catch (err) {
        console.error('Failed to fetch filters:', err);
      }
    };
    loadFilters();
  }, []);

  // Memoize filtered dropdown items for performance
  const filteredCategories = useMemo(() =>
    availableCategories.filter(cat =>
      cat.toLowerCase().includes(cropCategoryQuery.toLowerCase())
    ), [availableCategories, cropCategoryQuery]);

  const filteredBrands = useMemo(() =>
    availableBrands.filter(brand =>
      brand.toLowerCase().includes(brandQuery.toLowerCase())
    ), [availableBrands, brandQuery]);

  const filteredStores = useMemo(() =>
    availableStores.filter(store =>
      store.toLowerCase().includes(storeQuery.toLowerCase())
    ), [availableStores, storeQuery]);

  const filteredCrops = useMemo(() =>
    availableCrops.filter(crop =>
      crop.toLowerCase().includes(cropQuery.toLowerCase())
    ), [availableCrops, cropQuery]);

  // Always ensure verifiedOnly is true, hide toggle from UI
  const updateFilters = (key: keyof Filters, value: any) => {
    if (key === 'verifiedOnly') {
      // Always true, ignore any attempts to change
      return;
    }
    onFiltersChange({ ...filters, [key]: value, verifiedOnly: true });
  };

  // Crop type add/remove helpers
  const addCropType = (crop: string) => {
    if (!filters.cropTypes.includes(crop)) {
      updateFilters('cropTypes', [...filters.cropTypes, crop]);
    }
  };
  const removeCropType = (crop: string) => {
    updateFilters('cropTypes', filters.cropTypes.filter(c => c !== crop));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      cropTypes: [],
      brixRange: [0, 30],
      dateRange: ['', ''],
      brand: '',
      store: '',
      category: '',
      hasImage: false,
      submittedBy: '',
      verifiedOnly: true, // enforced
      nearbyOnly: false,
    });
    // Clear search queries too
    setCropCategoryQuery('');
    setBrandQuery('');
    setStoreQuery('');
    setCropQuery('');
  };

  return (
    <Card className="h-fit shadow-md rounded-2xl border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Clear all filters"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Crop Types */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Crop Types</Label>
          {filters.cropTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3" aria-label="Selected crop types">
              {filters.cropTypes.map((crop) => (
                <Badge
                  key={crop}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                >
                  <span>{crop}</span>
                  <X
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove crop type ${crop}`}
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeCropType(crop)}
                    onKeyDown={(e) => e.key === 'Enter' && removeCropType(crop)}
                  />
                </Badge>
              ))}
            </div>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-sm" aria-haspopup="listbox">
                Select Crops
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search crops..."
                  className="h-9"
                  value={cropQuery}
                  onValueChange={setCropQuery}
                  aria-label="Search crops"
                />
                <CommandList>
                  <CommandEmpty>No crops found.</CommandEmpty>
                  {filteredCrops.map((crop) => {
                    const selected = filters.cropTypes.includes(crop);
                    return (
                      <CommandItem
                        key={crop}
                        onSelect={() => {
                          selected ? removeCropType(crop) : addCropType(crop);
                          setCropQuery('');
                        }}
                        className="flex justify-between items-center"
                        aria-selected={selected}
                        role="option"
                      >
                        <span>{crop}</span>
                        {selected && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">BRIX Range</Label>

          {/* Min Slider + Number */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={filters.brixRange[0]}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), filters.brixRange[1]);
                  updateFilters('brixRange', [val, filters.brixRange[1]]);
                }}
                id="min-brix-slider"
                className="w-full h-3 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(filters.brixRange[0] / 30) * 100}%, #e2e8f0 ${(filters.brixRange[0] / 30) * 100}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={filters.brixRange[0]}
                onChange={(e) => {
                  let val = Math.min(Number(e.target.value), filters.brixRange[1]);
                  if (isNaN(val)) val = 0;
                  updateFilters('brixRange', [val, filters.brixRange[1]]);
                }}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-sm font-medium text-gray-600">°Bx</span>
            </div>
          </div>

          {/* Max Slider + Number */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="range"
                min={filters.brixRange[0]}
                max={30}
                step={0.5}
                value={filters.brixRange[1]}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), filters.brixRange[0]);
                  updateFilters('brixRange', [filters.brixRange[0], val]);
                }}
                id="max-brix-slider"
                className="w-full h-3 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(filters.brixRange[1] / 30) * 100}%, #e2e8f0 ${(filters.brixRange[1] / 30) * 100}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={filters.brixRange[0]}
                max={30}
                step={0.5}
                value={filters.brixRange[1]}
                onChange={(e) => {
                  let val = Math.max(Number(e.target.value), filters.brixRange[0]);
                  if (isNaN(val)) val = 30;
                  updateFilters('brixRange', [filters.brixRange[0], val]);
                }}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-sm font-medium text-gray-600">°Bx</span>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Date Range
          </Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="start-date" className="text-xs">From</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.dateRange[0]}
                onChange={(e) =>
                  updateFilters('dateRange', [e.target.value, filters.dateRange[1]])
                }
                className="text-sm"
                aria-label="Start date"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs">To</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.dateRange[1]}
                onChange={(e) =>
                  updateFilters('dateRange', [filters.dateRange[0], e.target.value])
                }
                className="text-sm"
                aria-label="End date"
              />
            </div>
          </div>
        </div>

        {/* Crop Category */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Crop Category</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-sm"
                aria-haspopup="listbox"
              >
                {filters.category || 'Select Category'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search category..."
                  className="h-9"
                  value={cropCategoryQuery}
                  onValueChange={setCropCategoryQuery}
                  aria-label="Search crop categories"
                />
                <CommandList role="listbox" aria-label="Crop categories">
                  <CommandEmpty>No category found.</CommandEmpty>
                  {filteredCategories.map((category) => (
                    <CommandItem
                      key={category}
                      onSelect={() => {
                        updateFilters('category', category);
                        setCropCategoryQuery('');
                      }}
                      aria-selected={filters.category === category}
                      role="option"
                      className="flex justify-between items-center"
                    >
                      <span>{category}</span>
                      {filters.category === category && <Check className="h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Brand Name */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Brand Name</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-sm"
                aria-haspopup="listbox"
              >
                {filters.brand || 'Select Brand'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search brand..."
                  className="h-9"
                  value={brandQuery}
                  onValueChange={setBrandQuery}
                  aria-label="Search brands"
                />
                <CommandList role="listbox" aria-label="Brands">
                  <CommandEmpty>No brands found.</CommandEmpty>
                  {filteredBrands.map((brand) => (
                    <CommandItem
                      key={brand}
                      onSelect={() => {
                        updateFilters('brand', brand === filters.brand ? '' : brand);
                        setBrandQuery('');
                      }}
                      aria-selected={filters.brand === brand}
                      role="option"
                      className="flex justify-between items-center"
                    >
                      <span>{brand}</span>
                      {filters.brand === brand && <Check className="h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Store Name */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Store Name</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-sm"
                aria-haspopup="listbox"
              >
                {filters.store || 'Select Store'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search store..."
                  className="h-9"
                  value={storeQuery}
                  onValueChange={setStoreQuery}
                  aria-label="Search stores"
                />
                <CommandList role="listbox" aria-label="Stores">
                  <CommandEmpty>No stores found.</CommandEmpty>
                  {filteredStores.map((store) => (
                    <CommandItem
                      key={store}
                      onSelect={() => {
                        updateFilters('store', store === filters.store ? '' : store);
                        setStoreQuery('');
                      }}
                      aria-selected={filters.store === store}
                      role="option"
                      className="flex justify-between items-center"
                    >
                      <span>{store}</span>
                      {filters.store === store && <Check className="h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Has Image */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Has Image</Label>
          <Switch
            checked={filters.hasImage}
            onCheckedChange={(val) => updateFilters('hasImage', val)}
            aria-checked={filters.hasImage}
            role="switch"
            aria-label="Filter by measurements with images"
          />
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">Showing filtered measurements on map</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapFilters;
