// src/components/DataBrowser/DataTable.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { BrixDataPoint, MapFilter } from '../../types'; // Import MapFilter
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label'; // Added Label for new filter inputs
import { Badge } from '../ui/badge'; // Added Badge for selected crop types
import { Switch } from '../ui/switch'; // Added Switch for boolean filters
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Calendar,
  User,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye, Edit, Trash2, // Existing imports
  Check, ChevronDown, X // **ADDED THESE ICONS**
} from 'lucide-react';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters, DEFAULT_MAP_FILTERS } from '../../contexts/FilterContext';
import { applyFilters, getFilterSummary } from '../../lib/filterUtils';
import SubmissionTableRow from '../common/SubmissionTableRow';
import { useAuth } from '../../contexts/AuthContext'; // NEW: Import useAuth

// New imports for the expanded filter UI (from shadcn/ui and react-range)
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Range, getTrackBackground } from 'react-range'; // For Brix Range Slider

import DataPointDetailModal from '../common/DataPointDetailModal'; // NEW: Import the modal

// Constants for Brix Range Slider
const STEP = 0.5;
const MIN_BRIX = 0;
const MAX_BRIX = 100;

// Re-defining BrixRangeSlider component locally for DataTable or import it from MapFilters.tsx if it's generic enough
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


// Assuming these fetch functions exist and are correct paths:
import { fetchCropTypes } from '../../lib/fetchCropTypes';
import { fetchBrands } from '../../lib/fetchBrands';
import { fetchStores } from '../../lib/fetchStores';
import { fetchCropCategories } from '../../lib/fetchCropCategories';


const DataTable: React.FC = () => {
  const { filters, setFilters, isAdmin, setFilteredCount } = useFilters();
  const { user } = useAuth(); // NEW: Get the current user from auth context

  const [data, setData] = useState<BrixDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<keyof BrixDataPoint>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // States for filter dropdown search queries
  const [cropCategoryQuery, setCropCategoryQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [cropQuery, setCropQuery] = useState('');


  // Data options for dropdowns, similar to MapFilters
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<BrixDataPoint | null>(null);


  // Fetch submissions and filter options on mount
  useEffect(() => {
    const loadDataAndFilters = async () => {
      setLoading(true);
      try {
        const submissions = await fetchFormattedSubmissions();
        setData(submissions);

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

        setError(null);
      } catch (err) {
        console.error('Error fetching submissions or filter options:', err);
        setError('Failed to load data or filter options');
        setData([]);
        setAvailableCrops([]);
        setAvailableBrands([]);
        setAvailableStores([]);
        setAvailableCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndFilters();
  }, []);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const filteredAndSortedData = useMemo(() => {
    // The `applyFilters` utility should be smart enough to handle all properties of MapFilter
    let filtered = applyFilters(data, filters, isAdmin);

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((point) => {
        const matches =
          (point.cropType && point.cropType.toLowerCase().includes(searchLower)) ||
          (point.submittedBy && point.submittedBy.toLowerCase().includes(searchLower)) ||
          (point.locationName && point.locationName.toLowerCase().includes(searchLower)) ||
          (point.storeName && point.storeName.toLowerCase().includes(searchLower)) ||
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

  // Pagination logic
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
      setSortOrder('desc'); // Default sort order when changing column
    }
  };

  // Generic handler for filter changes
  const handleFilterChange = (filterName: keyof MapFilter, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // Crop type add/remove helpers (for multi-select dropdown)
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
    setFilters(DEFAULT_MAP_FILTERS); // Reset to predefined defaults
    setSearchTerm('');
    // Also clear internal search queries for dropdowns
    setCropCategoryQuery('');
    setBrandQuery('');
    setStoreQuery('');
    setCropQuery('');
  };

  // Memoized filtered dropdown items for performance
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


  // Helper for filter summary: IMPORTANT to correctly show active vs. default
  // This assumes getFilterSummary in ../../lib/filterUtils.ts is updated
  // to compare current filters against DEFAULT_MAP_FILTERS
  const filterSummary = getFilterSummary(filters, isAdmin);


  // The handleDelete function here is just a placeholder.
  // In a real application, you'd likely want to lift this state up
  // or use a global state management solution if deletions from
  // this general browser should also optimistically update the main data.
  // For now, it will just log. If you want full deletion from here,
  // we'd need to expand this, possibly introducing a confirmation modal here as well.
  const handleOpenModal = (dataPoint: BrixDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDataPoint(null);
  };

  const handleDeleteSuccess = (deletedId: string) => {
    // Update local state after a successful delete
    setData(currentData => currentData.filter(dp => dp.id !== deletedId));
    handleCloseModal(); // Close modal after delete
  };

  if (loading) {
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

      {/* Search and Filter Section */}
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
            {/* Crop Types Filter */}
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

            {/* Brix Range Filter */}
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

            {/* Date Range Filter */}
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

            {/* Crop Category Filter */}
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

            {/* Brand Name Filter */}
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
                          key={brand}
                          onSelect={() => {
                            handleFilterChange('brand', brand === filters.brand ? '' : brand);
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

            {/* Store Name Filter */}
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
                      aria-label="Search store"
                    />
                    <CommandList role="listbox" aria-label="Stores">
                      <CommandEmpty>No stores found.</CommandEmpty>
                      {filteredStores.map((store) => (
                        <CommandItem
                          key={store}
                          onSelect={() => {
                            handleFilterChange('store', store === filters.store ? '' : store);
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

            {/* Has Image Filter */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Has Image</Label>
              <Switch
                checked={filters.hasImage}
                onCheckedChange={(val) => handleFilterChange('hasImage', val)}
                aria-checked={filters.hasImage}
                role="switch"
                aria-label="Filter by measurements with images"
              />
            </div>

            {/* Verified Only Filter - only for admins */}
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

      {/* Changed conditional rendering to check if filterSummary is not "No active filters" */}
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
                    Crop / Variety / Brand / Store{' '}
                    {sortBy === 'cropType' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer"
                    onClick={() => handleSort('brixLevel')}
                  >
                    BRIX{' '}
                    {sortBy === 'brixLevel' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('locationName')}
                  >
                    Location / Notes{' '}
                    {sortBy === 'locationName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="whitespace-nowrap cursor-pointer"
                    onClick={() => handleSort('submittedAt')}
                  >
                    Assessment Date{' '}
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
                    // Determine if the current user is the owner of THIS submission
                    const isOwner = user?.id === submission.userId;
                    // Determine if the current user (owner) can delete this submission based on RLS
                    // An admin can delete any, a regular user can only delete unverified owned submissions
                    const canDeleteByOwner = (isOwner && !submission.verified) || isAdmin;

                    return (
                      <SubmissionTableRow
                        key={submission.id}
                        submission={submission}
                        onDelete={handleDeleteSuccess}
                        isOwner={isOwner}
                        canDeleteByOwner={canDeleteByOwner} // Pass the newly calculated prop
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

      {/* Pagination */}
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

      {/* The Modal Component */}
      <DataPointDetailModal
        dataPoint={selectedDataPoint}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDeleteSuccess={handleDeleteSuccess}
      /> 
    </div>
  );
};

export default DataTable;
