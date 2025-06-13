
import React, { useState, useMemo } from 'react';
import { BrixDataPoint, MapFilter } from '../../types';
import { mockBrixData, cropTypes } from '../../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Calendar, User, MapPin, CheckCircle, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const DataTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<keyof BrixDataPoint>('measurementDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<MapFilter>({
    cropTypes: [],
    brixRange: [0, 30],
    dateRange: ['2024-01-01', '2024-12-31'],
    verifiedOnly: false
  });

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = mockBrixData.filter(point => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!point.cropType.toLowerCase().includes(searchLower) &&
            !point.submittedBy.toLowerCase().includes(searchLower) &&
            !(point.variety?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }

      // Crop type filter
      if (filters.cropTypes.length > 0 && !filters.cropTypes.includes(point.cropType)) {
        return false;
      }

      // Brix range filter
      if (point.brixLevel < filters.brixRange[0] || point.brixLevel > filters.brixRange[1]) {
        return false;
      }

      // Date range filter
      if (point.measurementDate < filters.dateRange[0] || point.measurementDate > filters.dateRange[1]) {
        return false;
      }

      // Verified only filter
      if (filters.verifiedOnly && !point.verified) {
        return false;
      }

      return true;
    });

    // Sort data
    data.sort((a, b) => {
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

    return data;
  }, [searchTerm, filters, sortBy, sortOrder]);

  // Pagination
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

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle>Brix Data Browser</CardTitle>
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
                  {cropTypes.map(crop => (
                    <div key={crop} className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.cropTypes.includes(crop)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({
                              ...prev,
                              cropTypes: [...prev.cropTypes, crop]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              cropTypes: prev.cropTypes.filter(c => c !== crop)
                            }));
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
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      brixRange: [Number(e.target.value), prev.brixRange[1]]
                    }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max Brix"
                    value={filters.brixRange[1]}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      brixRange: [prev.brixRange[0], Number(e.target.value)]
                    }))}
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
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: [e.target.value, prev.dateRange[1]]
                    }))}
                  />
                  <Input
                    type="date"
                    value={filters.dateRange[1]}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: [prev.dateRange[0], e.target.value]
                    }))}
                  />
                </div>
              </div>

              {/* Additional Options */}
              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => setFilters(prev => ({
                      ...prev,
                      verifiedOnly: !!checked
                    }))}
                  />
                  <label className="text-sm">Verified only</label>
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
                    onClick={() => handleSort('measurementDate')}
                  >
                    Date
                    {sortBy === 'measurementDate' && (
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
                        {point.variety && (
                          <div className="text-sm text-gray-500">{point.variety}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getBrixColor(point.brixLevel)}>
                        {point.brixLevel}°
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(point.measurementDate).toLocaleDateString()}
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
                      >
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
                  <span className="font-medium">{startIndex + 1}</span>
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
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="rounded-none"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-2">...</span>;
                    }
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

      {/* Detail Modal */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{selectedPoint.cropType}</span>
                    {selectedPoint.verified && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </CardTitle>
                  {selectedPoint.variety && (
                    <p className="text-gray-600 mt-1">{selectedPoint.variety}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPoint(null)}
                  className="text-gray-400 hover:text-gray-600"
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
                  <span>{new Date(selectedPoint.measurementDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{selectedPoint.submittedBy}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{selectedPoint.latitude.toFixed(4)}, {selectedPoint.longitude.toFixed(4)}</span>
                </div>
              </div>

              {selectedPoint.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-gray-700">{selectedPoint.notes}</p>
                </div>
              )}

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
