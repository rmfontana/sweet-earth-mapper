import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BrixDataPoint, MapFilter } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
  Calendar,
  User,
  MapPin,
  CheckCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

const DataTable: React.FC = () => {
  // --- State ---
  const [data, setData] = useState<BrixDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortBy, setSortBy] = useState<keyof BrixDataPoint>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [cropTypes, setCropTypes] = useState<string[]>([]);

  const [filters, setFilters] = useState<MapFilter>({
    cropTypes: [],
    brixRange: [0, 30],
    dateRange: ['2024-01-01', '2024-12-31'],
    verifiedOnly: false,
  });

  // --- Fetch data on mount ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const submissions = await fetchFormattedSubmissions();
        setData(submissions);

        const uniqueCropTypes = Array.from(
          new Set(submissions.map((s) => s.cropType).filter(Boolean))
        ).sort();
        setCropTypes(uniqueCropTypes);

        setError(null);
      } catch (err) {
        setError('Failed to load data');
        setData([]);
        setCropTypes([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearchTerm]);

  // --- Filter + Sort data ---
  const filteredData = useMemo(() => {
    let filtered = data.filter((point) => {
      // Search across multiple fields (cropType, submittedBy, storeName)
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const match =
          point.cropType.toLowerCase().includes(searchLower) ||
          point.submittedBy.toLowerCase().includes(searchLower) ||
          (point.storeName?.toLowerCase().includes(searchLower) ?? false);
        if (!match) return false;
      }

      // Crop types filter
      if (
        filters.cropTypes.length > 0 &&
        !filters.cropTypes.includes(point.cropType)
      ) {
        return false;
      }

      // Brix range filter
      if (
        point.brixLevel < filters.brixRange[0] ||
        point.brixLevel > filters.brixRange[1]
      ) {
        return false;
      }

      // Date range filter
      const submittedDate = new Date(point.submittedAt).getTime();
      const startDate = new Date(filters.dateRange[0]).getTime();
      const endDate = new Date(filters.dateRange[1]).getTime();
      if (submittedDate < startDate || submittedDate > endDate) {
        return false;
      }

      // Verified only filter
      if (filters.verifiedOnly && !point.verified) {
        return false;
      }

      return true;
    });

    // Sort
    filtered = [...filtered];
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [data, filters, debouncedSearchTerm, sortBy, sortOrder]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  // Clamp current page if it goes out of range due to filtering
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // --- Event Handlers ---
  const handleSort = (column: keyof BrixDataPoint) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Crop Types Select All / Clear
  const selectAllCrops = () => setFilters((prev) => ({ ...prev, cropTypes: [...cropTypes] }));
  const clearAllCrops = () => setFilters((prev) => ({ ...prev, cropTypes: [] }));
  const clearFilters = () =>
    setFilters({
      cropTypes: [],
      brixRange: [0, 30],
      dateRange: ['2024-01-01', '2024-12-31'],
      verifiedOnly: false,
    });

  // Brix color helper
  const getBrixColor = (brixLevel: number) => {
    if (brixLevel < 10) return 'bg-red-100 text-red-800';
    if (brixLevel < 15) return 'bg-orange-100 text-orange-800';
    if (brixLevel < 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  // --- Helper Components ---
  // Pagination button with accessibility props
  const PageButton: React.FC<{
    page: number;
    active: boolean;
    onClick: () => void;
  }> = ({ page, active, onClick }) => (
    <Button
      onClick={onClick}
      variant={active ? 'default' : 'outline'}
      size="sm"
      aria-current={active ? 'page' : undefined}
      aria-label={`Page ${page}`}
      className="rounded-none"
    >
      {page}
    </Button>
  );

  // Render pagination with ellipsis logic
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];

    // Always show first and last
    // Show current page ±1
    // Insert ellipsis if gap > 1

    for (let page = 1; page <= totalPages; page++) {
      if (
        page === 1 ||
        page === totalPages ||
        (page >= currentPage - 1 && page <= currentPage + 1)
      ) {
        pages.push(page);
      } else if (
        page === 2 && currentPage > 4 ||
        page === totalPages - 1 && currentPage < totalPages - 3
      ) {
        pages.push('ellipsis');
      }
    }

    // Remove duplicates and sort
    const uniquePages = [...new Set(pages)].sort((a, b) => {
      if (a === 'ellipsis') return 1;
      if (b === 'ellipsis') return -1;
      return (a as number) - (b as number);
    });

    // Render buttons and ellipsis
    return uniquePages.map((page, i) =>
      page === 'ellipsis' ? (
        <span key={`ellipsis-${i}`} className="px-2 select-none">
          ...
        </span>
      ) : (
        <PageButton
          key={page}
          page={page as number}
          active={currentPage === page}
          onClick={() => setCurrentPage(page as number)}
        />
      )
    );
  };

  // --- Render ---

  // Loading / Error
  if (loading) {
    return (
      <div className="py-12 text-center text-gray-600" role="status" aria-live="polite">
        Loading data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle>Brix Data Browser</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search crops, submitters, or stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                  aria-label="Search data table"
                />
              </div>

              {/* Filters toggle with badge */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
                aria-pressed={showFilters}
                aria-label="Toggle filters panel"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {Object.values(filters).some((val) =>
                  Array.isArray(val) ? val.length > 0 : val
                ) && (
                  <Badge className="ml-1 bg-blue-100 text-blue-800">Active</Badge>
                )}
              </Button>

              {/* Clear all filters */}
              {showFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="ml-2"
                  size="sm"
                  aria-label="Clear all filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Filters Panel */}
        {showFilters && (
          <CardContent className="border-t bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Crop Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Crop Types</label>
                <div className="flex space-x-2 mb-2">
                  <Button size="sm" variant="outline" onClick={selectAllCrops} aria-label="Select all crop types">
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearAllCrops} aria-label="Clear all crop types">
                    Clear
                  </Button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto border p-2 rounded bg-white">
                  {cropTypes.map((crop) => (
                    <div key={crop} className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.cropTypes.includes(crop)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters((prev) => ({
                              ...prev,
                              cropTypes: [...prev.cropTypes, crop],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              cropTypes: prev.cropTypes.filter((c) => c !== crop),
                            }));
                          }
                        }}
                        id={`crop-${crop}`}
                      />
                      <label htmlFor={`crop-${crop}`} className="text-sm cursor-pointer">
                        {crop}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brix Range Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Brix Range</label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Min Brix"
                    value={filters.brixRange[0]}
                    min={0}
                    max={30}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        brixRange: [Number(e.target.value), prev.brixRange[1]],
                      }))
                    }
                    aria-label="Minimum Brix level"
                  />
                  <Input
                    type="number"
                    placeholder="Max Brix"
                    value={filters.brixRange[1]}
                    min={0}
                    max={30}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        brixRange: [prev.brixRange[0], Number(e.target.value)],
                      }))
                    }
                    aria-label="Maximum Brix level"
                  />
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={filters.dateRange[0]}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: [e.target.value, prev.dateRange[1]],
                      }))
                    }
                    aria-label="Start date"
                  />
                  <Input
                    type="date"
                    value={filters.dateRange[1]}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: [prev.dateRange[0], e.target.value],
                      }))
                    }
                    aria-label="End date"
                  />
                </div>
              </div>

              {/* Verified Only */}
              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({
                        ...prev,
                        verifiedOnly: !!checked,
                      }))
                    }
                    id="verified-only"
                  />
                  <label htmlFor="verified-only" className="text-sm cursor-pointer">
                    Verified only
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[
                    { label: 'Crop Type', key: 'cropType' },
                    { label: 'Brix Level', key: 'brixLevel' },
                    { label: 'Date', key: 'submittedAt' },
                    { label: 'Submitted By', key: 'submittedBy' },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort(key as keyof BrixDataPoint)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSort(key as keyof BrixDataPoint);
                        }
                      }}
                      role="button"
                      aria-sort={
                        sortBy === key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                      aria-label={`Sort by ${label}`}
                    >
                      {label}
                      {sortBy === key && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500 text-lg">
                      No data matches your filters or search.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((point) => (
                    <tr key={point.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{point.cropType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getBrixColor(point.brixLevel)}>
                          {point.brixLevel}
                          </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(point.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {point.submittedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {point.verified ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Verified</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPoint(point)}
                          aria-label={`View details for ${point.cropType} submitted by ${point.submittedBy}`}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                aria-label="Previous page"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                aria-label="Next page"
              >
                Next
              </Button>
            </div>

            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{filteredData.length === 0 ? 0 : startIndex + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, filteredData.length)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{filteredData.length}</span>
                  {' '}results
                </p>
              </div>

              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-l-md"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {renderPaginationButtons()}

                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-r-md"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedPoint && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle id="modal-title" className="flex items-center space-x-2">
                    <span>{selectedPoint.cropType}</span>
                    {selectedPoint.verified && (
                      <CheckCircle className="w-5 h-5 text-green-600" aria-label="Verified" />
                    )}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPoint(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close details modal"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Brix Level</span>
                  <Badge className={getBrixColor(selectedPoint.brixLevel)}>
                    {selectedPoint.brixLevel}°
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{new Date(selectedPoint.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{selectedPoint.submittedBy}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>
                    {selectedPoint.latitude.toFixed(4)}, {selectedPoint.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 border-t pt-4">
                Submitted on {new Date(selectedPoint.submittedAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DataTable;
