import React, { useState, useMemo, useEffect } from 'react';
import { BrixDataPoint } from '../../types';
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
import { useFilters } from '../../contexts/FilterContext';
import { applyFilters, getFilterSummary } from '../../lib/filterUtils';

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

  const filteredData = useMemo(() => {
    // Apply shared filter logic first
    let filtered = applyFilters(data, filters, isAdmin);

    // Apply search filter separately
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((point) => {
        const matches =
          (point.cropType && point.cropType.toLowerCase().includes(searchLower)) ||
          (point.submittedBy && point.submittedBy.toLowerCase().includes(searchLower)) ||
          (point.locationName && point.locationName.toLowerCase().includes(searchLower)) ||
          (point.storeName && point.storeName.toLowerCase().includes(searchLower)) ||
          (point.brandName && point.brandName.toLowerCase().includes(searchLower));
        return matches;
      });
    }

    // Update filtered count for context
    setFilteredCount(filtered.length);

    // Sorting
    filtered = [...filtered].sort((a, b) => {
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
  }, [data, searchTerm, filters, sortBy, sortOrder, isAdmin, setFilteredCount]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column: keyof BrixDataPoint) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getBrixColor = (brixLevel: number) => {
    if (brixLevel < 10) return 'bg-red-100 text-red-800';
    if (brixLevel < 15) return 'bg-orange-100 text-orange-800';
    if (brixLevel < 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-600">Loading data...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle>Brix Data Browser</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredData.length} of {data.length} submissions ({getFilterSummary(filters, isAdmin)})
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search crops, varieties, or submitters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Crop Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Crop Types</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {cropTypes.map((crop) => (
                    <div key={crop} className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.cropTypes.includes(crop)}
                         onCheckedChange={(checked) => {
                          if (checked) {
                            const newFilters = {
                              ...filters,
                              cropTypes: [...filters.cropTypes, crop],
                            };
                            setFilters(newFilters);
                          } else {
                            const newFilters = {
                              ...filters,
                              cropTypes: filters.cropTypes.filter((c) => c !== crop),
                            };
                            setFilters(newFilters);
                          }
                        }}
                      />
                      <label className="text-sm">{crop}</label>
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
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        brixRange: [Number(e.target.value), filters.brixRange[1]],
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max Brix"
                    value={filters.brixRange[1]}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        brixRange: [filters.brixRange[0], Number(e.target.value)],
                      })
                    }
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
                      setFilters({
                        ...filters,
                        dateRange: [e.target.value, filters.dateRange[1]],
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={filters.dateRange[1]}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        dateRange: [filters.dateRange[0], e.target.value],
                      })
                    }
                  />
                </div>
              </div>

              {/* Verified Only Filter: only visible to admins */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-2">Options</label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.verifiedOnly}
                      onCheckedChange={(checked) =>
                        setFilters({
                          ...filters,
                          verifiedOnly: !!checked,
                        })
                      }
                    />
                    <label className="text-sm">Verified only</label>
                  </div>
                </div>
              )}
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('cropType')}
                  >
                    Crop Type
                    {sortBy === 'cropType' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('brixLevel')}
                  >
                    Brix Level
                    {sortBy === 'brixLevel' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('submittedAt')}
                  >
                    Date
                    {sortBy === 'submittedAt' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('submittedBy')}
                  >
                    Submitted By
                    {sortBy === 'submittedBy' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((point) => (
                  <tr key={point.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{point.cropType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getBrixColor(point.brixLevel)}>{point.brixLevel}°</Badge>
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
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPoint(point)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
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
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, filteredData.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredData.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-l-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                        >
                          {page}
                        </Button>
                      );
                    }
                    // For brevity, skip rendering pages too far away, but you could add ellipsis here.
                    return null;
                  })}

                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-r-md"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Point Modal or Details (if you have one) */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedPoint(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-4">{selectedPoint.cropType} Details</h2>
            <p>
              <strong>Brix Level:</strong> {selectedPoint.brixLevel}°
            </p>
            <p>
              <strong>Submitted By:</strong> {selectedPoint.submittedBy}
            </p>
            <p>
              <strong>Date:</strong> {new Date(selectedPoint.submittedAt).toLocaleDateString()}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              {selectedPoint.verified ? 'Verified' : 'Pending Verification'}
            </p>
            {/* Add more details as needed */}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
