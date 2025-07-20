import React, { useEffect, useRef, useState } from 'react';
import { BrixDataPoint } from '../../types';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, User, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InteractiveMapProps {
  filters?: {
    cropTypes: string[];
    brixRange: [number, number];
    dateRange: [string, string];
    verifiedOnly: boolean;
    submittedBy: string;
    nearbyOnly?: boolean;
  };
  userLocation?: { lat: number; lng: number } | null;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ filters, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const [allData, setAllData] = useState<BrixDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<BrixDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
   // Calculate distance between two points in miles
   const getDistanceInMiles = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  
  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const submissions = await fetchFormattedSubmissions();
        setAllData(submissions);
        setError(null);
      } catch (err) {
        setError('Failed to load data');
        setAllData([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

    // Filter data whenever filters, allData, or userLocation change
    useEffect(() => {
      if (!filters) {
        setFilteredData(allData);
        return;
      }
  
      let filtered = allData.filter((point) => {
        // Crop type filter
        if (filters.cropTypes.length > 0 && !filters.cropTypes.includes(point.cropType)) {
          return false;
        }
  
        // Brix range filter
        if (point.brixLevel < filters.brixRange[0] || point.brixLevel > filters.brixRange[1]) {
          return false;
        }
  
        // Date range filter using submittedAt
        if (filters.dateRange[0] && new Date(point.submittedAt) < new Date(filters.dateRange[0])) {
          return false;
        }
        if (filters.dateRange[1] && new Date(point.submittedAt) > new Date(filters.dateRange[1])) {
          return false;
        }
  
        // Verified only filter
        if (filters.verifiedOnly && !point.verified) {
          return false;
        }
  
        // Submitted by filter
        if (
          filters.submittedBy &&
          !point.submittedBy.toLowerCase().includes(filters.submittedBy.toLowerCase())
        ) {
          return false;
        }
  
        // Nearby only filter (within 1 mile)
        if (filters.nearbyOnly && userLocation) {
          const distance = getDistanceInMiles(
            userLocation.lat,
            userLocation.lng,
            point.latitude,
            point.longitude
          );
          if (distance > 1) {
            return false;
          }
        }
  
        return true;
      });
  
      setFilteredData(filtered);
    }, [filters, allData, userLocation]);

  // Convert lat/lng to pixel coordinates for demo purposes
  const getPointPosition = (lat: number, lng: number) => {
    const x = ((lng + 74.5) * 800) / 1.5;
    const y = ((40.9 - lat) * 600) / 0.3;
    return { x: Math.max(0, Math.min(800, x)), y: Math.max(0, Math.min(600, y)) };
  };

  const getBrixColor = (brixLevel: number) => {
    if (brixLevel < 10) return '#ef4444';
    if (brixLevel < 15) return '#f97316';
    if (brixLevel < 20) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Mock map background */}
      <div 
        ref={mapContainer}
        className="w-full h-full relative bg-gradient-to-br from-green-50 to-blue-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.3'%3E%3Cpath d='M0 0h40v40H0z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
            style={{ 
              left: getPointPosition(userLocation.lat, userLocation.lng).x, 
              top: getPointPosition(userLocation.lat, userLocation.lng).y 
            }}
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Your Location
            </div>
          </div>
        )}

        {/* Map data points */}
        {filteredData.map((point) => {
          const position = getPointPosition(point.latitude, point.longitude);
          const isHovered = hoveredPoint === point.id;
          const isSelected = selectedPoint?.id === point.id;
          
          return (
            <div
              key={point.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                isHovered || isSelected ? 'scale-125 z-20' : 'z-10'
              }`}
              style={{ left: position.x, top: position.y }}
              onClick={() => setSelectedPoint(point)}
              onMouseEnter={() => setHoveredPoint(point.id)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                  point.verified ? 'ring-2 ring-green-300' : ''
                }`}
                style={{ backgroundColor: getBrixColor(point.brixLevel) }}
              />
              
              {/* Hover tooltip */}
              {isHovered && !isSelected && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 text-xs whitespace-nowrap z-30">
                  <div className="font-semibold">{point.cropType}</div>
                  <div className="text-gray-600">BRIX: {point.brixLevel}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                </div>
              )}
            </div>
          );
        })}

        {/* Map controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          >
            -
          </Button>
        </div>

        {/* Legend */}
        <Card className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="text-sm font-semibold mb-2">BRIX Levels</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>&lt; 10 (Low)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>10-15 (Medium)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>15-20 (Good)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>&gt; 20 (Excellent)</span>
              </div>
              {userLocation && (
                <div className="flex items-center space-x-2 pt-1 border-t">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>Your Location</span>
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t text-xs text-gray-600">
              Showing {filteredData.length} measurements
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail modal for selected point */}
      {selectedPoint && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <span>{selectedPoint.cropType}</span>
                    {selectedPoint.verified && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPoint(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">BRIX Reading</span>
                  <Badge 
                    style={{ backgroundColor: getBrixColor(selectedPoint.brixLevel) }}
                    className="text-white"
                  >
                    {selectedPoint.brixLevel}
                  </Badge>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedPoint.submittedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Submitted by {selectedPoint.submittedBy}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedPoint.latitude.toFixed(4)}, {selectedPoint.longitude.toFixed(4)}</span>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Link to={`/data-point/${selectedPoint.id}`}>
                    <Button className="w-full" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
