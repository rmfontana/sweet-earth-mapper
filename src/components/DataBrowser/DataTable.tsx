// src/components/DataBrowser/DataTable.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrixDataPoint, MapFilter } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Calendar,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Check, ChevronDown, X
} from 'lucide-react';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters, DEFAULT_MAP_FILTERS } from '../../contexts/FilterContext';
import { applyFilters, getFilterSummary } from '../../lib/filterUtils';
import SubmissionTableRow from '../common/SubmissionTableRow';
import { useAuth } from '../../contexts/AuthContext';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Range, getTrackBackground } from 'react-range';
import DataPointDetailModal from '../common/DataPointDetailModal';
import { useStaticData } from '../../hooks/useStaticData';
import { fetchCropCategories } from '../../lib/fetchCropCategories';
import { parseURLSearchParams, mergeFiltersWithDefaults } from '../../lib/urlFilterUtils';

// Constants for Brix Range Slider
const STEP = 0.5;
const MIN_BRIX = 0;
const MAX_BRIX = 100;

const BrixRangeSlider = ({
  brixRange,
  onChange,
}: {
  brixRange: [number, number];
  onChange: (range: [number, number]) => void;
}) => {
  return (
    <Range
      values={brixRange}
      step={STEP}
      min={MIN_BRIX}
      max={MAX_BRIX}
      onChange={(values) => onChange([values[0], values[1]])}
      renderTrack={({ props, children }) => (
        <div
          {...props}
          style={{
            ...props.style,
            height: '6px',
            width: '100%',
            background: getTrackBackground({
              values: brixRange,
              colors: ['#ccc', '#3b82f6', '#ccc'],
              min: MIN_BRIX,
              max: MAX_BRIX,
            }),
            borderRadius: '4px',
          }}
        >
          {children}
        </div>
      )}
      renderThumb={({ props, index }) => (
        <div
          {...props}
          style={{
            ...props.style,
            height: '24px',
            width: '24px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 0 2px #00000044',
          }}
        >
          <span style={{ color: '#fff', fontSize: '12px' }}>
            {brixRange[index].toFixed(1)}
          </span>
        </div>
      )}
    />
  );
};

const DataTable: React.FC = () => {
  const { filters, setFilters, isAdmin, setFilteredCount } = useFilters();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlFiltersApplied, setUrlFiltersApplied] = useState(false);

  // Corrected destructuring: useStaticData hook returns 'locations' not 'stores'.
  const { crops, brands, locations, isLoading: isLoadingStaticData } = useStaticData();

  // Re-added local state for categories since the hook doesn't provide it.
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // State for data submissions
  const [data, setData] = useState<BrixDataPoint[]>([]);
  // Local loading state for fetching submissions and categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<keyof BrixDataPoint>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Queries for searching within filter popovers
  const [cropCategoryQuery, setCropCategoryQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  // Refactored state from 'storeQuery' to 'locationQuery'
  const [locationQuery, setLocationQuery] = useState('');
  const [cropQuery, setCropQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<BrixDataPoint | null>(null);
  const [fromLeaderboard, setFromLeaderboard] = useState(false);

  // Apply URL filters on component mount
  useEffect(() => {
    if (!urlFiltersApplied && searchParams.toString()) {
      const urlFilters = parseURLSearchParams(searchParams);
      if (Object.keys(urlFilters).length > 0) {
        const mergedFilters = mergeFiltersWithDefaults(urlFilters);
        setFilters(mergedFilters);
        setUrlFiltersApplied(true);
        setFromLeaderboard(true);
        // Clear URL params after applying to prevent re-application on re-renders
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, urlFiltersApplied, setFilters, setSearchParams]);

  // Use a single useEffect to fetch submissions and categories
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [submissions, categories] = await Promise.all([
          fetchFormattedSubmissions(),
          fetchCropCategories()
        ]);
        setData(submissions);
        setAvailableCategories(categories);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data.');
        setData([]);
        setAvailableCategories([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Reset to first page whenever filters or search terms change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = applyFilters(data, filters, isAdmin);

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((point) => {
        const matches =
          (point.cropType && point.cropType.toLowerCase().includes(searchLower)) ||
          (point.submittedBy && point.submittedBy.toLowerCase().includes(searchLower)) ||
          // Refactored search term from `storeName` to `locationName`
          (point.locationName && point.locationName.toLowerCase().includes(searchLower)) ||
          (point.brandName && point.brandName.toLowerCase().includes(searchLower)) ||
          (point.outlier_notes && point.outlier_notes.toLowerCase().includes(searchLower));
        return matches;
      });
    }

    setFilteredCount(filtered.length);

    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [data, filters, isAdmin, searchTerm, sortBy, sortOrder, setFilteredCount]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSort = (column: keyof BrixDataPoint) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleFilterChange = (filterName: keyof MapFilter, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const addCropType = (crop: string) => {
    setFilters(prev => {
      if (!prev.cropTypes.includes(crop)) {
        return { ...prev, cropTypes: [...prev.cropTypes, crop] };
      }
      return prev;
    });
  };
  const removeCropType = (crop: string) => {
    setFilters(prev => ({
      ...prev,
      cropTypes: prev.cropTypes.filter(c => c !== crop)
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_MAP_FILTERS);
    setSearchTerm('');
    setCropCategoryQuery('');
    setBrandQuery('');
    // Refactored state from 'setStoreQuery' to 'setLocationQuery'
    setLocationQuery('');
    setCropQuery('');
    setFromLeaderboard(false);
  };

  const filteredCategories = useMemo(() =>
    availableCategories.filter(cat =>
      cat.toLowerCase().includes(cropCategoryQuery.toLowerCase())
    ), [availableCategories, cropCategoryQuery]);

  const filteredBrands = useMemo(() =>
    brands.filter(brand =>
      brand.name.toLowerCase().includes(brandQuery.toLowerCase())
    ), [brands, brandQuery]);

  // Refactored memoized filter from `filteredStores` to `filteredLocations`
  const filteredLocations = useMemo(() =>
    locations.filter(location =>
      location.name.toLowerCase().includes(locationQuery.toLowerCase())
    ), [locations, locationQuery]);

  const filteredCrops = useMemo(() =>
    crops.filter(crop =>
      crop.name.toLowerCase().includes(cropQuery.toLowerCase())
    ), [crops, cropQuery]);

  const filterSummary = getFilterSummary(filters, isAdmin);

  const handleOpenModal = (dataPoint: BrixDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDataPoint(null);
  };

  const handleUpdateSuccess = (updatedData: BrixDataPoint) => {
    setData(currentData =>
      currentData.map(item => (item.id === updatedData.id ? updatedData : item))
    );
    setSelectedDataPoint(updatedData);
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setData(currentData => currentData.filter(dp => dp.id !== deletedId));
    handleCloseModal();
  };

  if (loading || isLoadingStaticData) {
    return (
      <div className="text-center py-12 text-gray-600">Loading data...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">Error: {error}</div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">All Submissions</h2>

      {fromLeaderboard && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-blue-800 text-sm">
              Showing filtered results from leaderboard selection
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setFromLeaderboard(false);
                window.history.back();
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Leaderboard
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by crop, submitter, location, notes..."
            className="pl-9 pr-3 py-2 rounded-md border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2"
        >
          <Filter className="w-4 h-4" />
          <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
        </Button>
        {filterSummary !== 'No active filters' && (
          <Button variant="ghost" onClick={clearFilters} className="text-red-600">
            Clear Filters ({filterSummary.split(', ').filter(f => f !== 'None').length})
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                        const selected = filters.cropTypes.includes(crop.name);
                        return (
                          <CommandItem
                            key={crop.id}
                            onSelect={() => {
                              selected ? removeCropType(crop.name) : addCropType(crop.name);
                              setCropQuery('');
                            }}
                            className="flex justify-between items-center"
                            aria-selected={selected}
                            role="option"
                          >
                            <span>{crop.name}</span>
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
              <BrixRangeSlider
                brixRange={filters.brixRange}
                onChange={(newRange) => {
                  if (newRange[0] <= newRange[1]) {
                    handleFilterChange('brixRange', newRange);
                  }
                }}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="start-date-data" className="text-xs">From</Label>
                  <Input
                    id="start-date-data"
                    type="date"
                    value={filters.dateRange[0]}
                    onChange={(e) =>
                      handleFilterChange('dateRange', [e.target.value, filters.dateRange[1]])
                    }
                    className="text-sm"
                    aria-label="Start date"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date-data" className="text-xs">To</Label>
                  <Input
                    id="end-date-data"
                    type="date"
                    value={filters.dateRange[1]}
                    onChange={(e) =>
                      handleFilterChange('dateRange', [filters.dateRange[0], e.target.value])
                    }
                    className="text-sm"
                    aria-label="End date"
                  />
                </div>
              </div>
            </div>

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
                            handleFilterChange('category', category);
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
                      aria-label="Search brand"
                    />
                    <CommandList role="listbox" aria-label="Brands">
                      <CommandEmpty>No brands found.</CommandEmpty>
                      {filteredBrands.map((brand) => (
                        <CommandItem
                          key={brand.id}
                          onSelect={() => {
                            handleFilterChange('brand', brand.name === filters.brand ? '' : brand.name);
                            setBrandQuery('');
                          }}
                          aria-selected={filters.brand === brand.name}
                          role="option"
                          className="flex justify-between items-center"
                        >
                          <span>{brand.name}</span>
                          {filters.brand === brand.name && <Check className="h-4 w-4" />}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Location Name</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-sm"
                    aria-haspopup="listbox"
                  >
                    {filters.place || 'Select Location'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search location..."
                      className="h-9"
                      value={locationQuery}
                      onValueChange={setLocationQuery}
                      aria-label="Search location"
                    />
                    <CommandList role="listbox" aria-label="Locations">
                      <CommandEmpty>No locations found.</CommandEmpty>
                      {filteredLocations.map((location) => (
                        <CommandItem
                          key={location.id}
                          onSelect={() => {
                            handleFilterChange('place', location.name === filters.place ? '' : location.name);
                            setLocationQuery('');
                          }}
                          aria-selected={filters.place === location.name}
                          role="option"
                          className="flex justify-between items-center"
                        >
                          <span>{location.name}</span>
                          {filters.place === location.name && <Check className="h-4 w-4" />}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium">Has Image</Label>
              <Switch
                checked={filters.hasImage}
                onCheckedChange={(val) => handleFilterChange('hasImage', val)}
                aria-checked={filters.hasImage}
                role="switch"
                aria-label="Filter by measurements with images"
              />
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Verified Only</Label>
                <Switch
                  checked={filters.verifiedOnly}
                  onCheckedChange={(val) => handleFilterChange('verifiedOnly', val)}
                  aria-checked={filters.verifiedOnly}
                  role="switch"
                  aria-label="Show only verified measurements"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filterSummary !== 'No active filters' && (
        <p className="text-sm text-gray-600 mb-4">
          Applying filters: <span className="font-semibold">{filterSummary}</span>
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('cropType')}
                  >
                    Crop / Variety / Brand / Location
                    {sortBy === 'cropType' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer"
                    onClick={() => handleSort('brixLevel')}
                  >
                    BRIX
                    {sortBy === 'brixLevel' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('locationName')}
                  >
                    Place / Notes
                    {sortBy === 'locationName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="whitespace-nowrap cursor-pointer"
                    onClick={() => handleSort('submittedAt')}
                  >
                    Assessment Date
                    {sortBy === 'submittedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-center">Verified?</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No data found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((submission) => {
                    const isOwner = user?.id === submission.userId;
                    const canDeleteByOwner = (isOwner && !submission.verified) || isAdmin;

                    return (
                      <SubmissionTableRow
                        key={submission.id}
                        submission={submission}
                        onDelete={handleDeleteSuccess}
                        isOwner={isOwner}
                        canDeleteByOwner={canDeleteByOwner}
                        onOpenModal={handleOpenModal}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <DataPointDetailModal
        dataPoint={selectedDataPoint}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDeleteSuccess={handleDeleteSuccess}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </div>
  );
};

export default DataTable;