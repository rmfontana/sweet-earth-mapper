// src/components/DataBrowser/DataTable.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { BrixDataPoint, MapFilter } from '../../types'; // Import MapFilter
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Calendar,
  User,
  CheckCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye, Edit, Trash2
} from 'lucide-react';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters, DEFAULT_MAP_FILTERS } from '../../contexts/FilterContext'; // Import DEFAULT_MAP_FILTERS
import { applyFilters, getFilterSummary } from '../../lib/filterUtils';
import SubmissionTableRow from '../common/SubmissionTableRow'; 
import { Link } from 'react-router-dom';

const DataTable: React.FC = () => {
  const { filters, setFilters, isAdmin, setFilteredCount } = useFilters();

  const [data, setData] = useState<BrixDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<keyof BrixDataPoint>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [cropTypes, setCropTypes] = useState<string[]>([]);

  // Fetch submissions on mount
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
        console.error('Error fetching submissions:', err);
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
  }, [filters, searchTerm]);

  const filteredAndSortedData = useMemo(() => {
    // `applyFilters` expects MapFilter, and it handles `selectedCropType` if present
    let appliedFilters: MapFilter = { ...filters };
    if (filters.selectedCropType) {
      // If a single crop type is selected in the DataTable's dropdown,
      // override cropTypes array for filtering purposes here.
      // This allows MapFilters.tsx to use cropTypes[] for multi-select,
      // while DataTable.tsx uses selectedCropType for single-select.
      appliedFilters.cropTypes = [filters.selectedCropType];
    } else {
      appliedFilters.cropTypes = []; // Ensure empty if no single crop selected
    }


    let filtered = applyFilters(data, appliedFilters, isAdmin);

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

  const handleFilterChange = (filterName: keyof MapFilter, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value })); // Correctly use updater function
  };

  const clearFilters = () => {
    setFilters(DEFAULT_MAP_FILTERS); // Reset to predefined defaults
    setSearchTerm('');
  };

  const filterSummary = getFilterSummary(filters, isAdmin);

  const handleDelete = (id: string) => {
    console.log('Delete submission from DataTable:', id);
    // TODO: Implement actual delete functionality and refresh data
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
        {Object.keys(filters).length > 0 || searchTerm ? (
          <Button variant="ghost" onClick={clearFilters} className="text-red-600">
            Clear Filters ({Object.keys(filters).length + (searchTerm ? 1 : 0)})
          </Button>
        ) : null}
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filter by Crop Type */}
            <div>
              <label htmlFor="cropTypeFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Crop Type
              </label>
              <select
                id="cropTypeFilter"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.selectedCropType || ''} // Use selectedCropType
                onChange={(e) => handleFilterChange('selectedCropType', e.target.value || undefined)} // Update selectedCropType
              >
                <option value="">All Crop Types</option>
                {cropTypes.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Verified Status (if admin) */}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verifiedFilter"
                  checked={filters.verifiedOnly === true} // Use verifiedOnly
                  onCheckedChange={(checked) => handleFilterChange('verifiedOnly', checked === true ? true : undefined)} // Update verifiedOnly
                />
                <label
                  htmlFor="verifiedFilter"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show Only Verified
                </label>
              </div>
            )}
            {/* Add more filters here as needed */}
          </CardContent>
        </Card>
      )}

      {filterSummary && (
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
                  currentItems.map((submission) => (
                    <SubmissionTableRow
                      key={submission.id}
                      submission={submission}
                      onDelete={handleDelete}
                      isOwner={false}
                    />
                  ))
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
    </div>
  );
};

export default DataTable;
