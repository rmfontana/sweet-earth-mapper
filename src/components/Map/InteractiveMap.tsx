import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BrixDataPoint } from '../../types';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters } from '../../contexts/FilterContext';
import { applyFilters } from '../../lib/filterUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, User, CheckCircle, Eye, X, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getMapboxToken } from '@/lib/getMapboxToken';
import type { GeoJSON } from 'geojson';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useBrixColorFromContext } from '../../lib/getBrixColor';

// Leaderboard API imports
import {
  fetchLocationLeaderboard,
  fetchCropLeaderboard,
  fetchBrandLeaderboard,
  LeaderboardEntry,
} from '../../lib/fetchLeaderboards';

interface InteractiveMapProps {
  userLocation?: { lat: number; lng: number } | null;
  nearMeTriggered?: boolean;
  onNearMeHandled?: () => void;
}

const SUPABASE_PROJECT_REF = 'wbkzczcqlorsewoofwqe';

// ADDED: Define a type for the selected view
type SelectedView = {
  type: 'crop' | 'brand';
  id: string;
  label: string;
} | null;

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  nearMeTriggered,
  onNearMeHandled,
}) => {
  const location = useLocation();
  const { highlightedPoint } = location.state || {};
  const { filters, isAdmin } = useFilters();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [allData, setAllData] = useState<BrixDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<BrixDataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'crop' | 'brand'>('crop');
  const [minBrix, setMinBrix] = useState(0);
  const [maxBrix, setMaxBrix] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // ADDED: New state to manage the drill-down view
  const [selectedEntry, setSelectedEntry] = useState<SelectedView>(null);

  // Store leaderboard data per grouping
  const [locationLeaderboard, setLocationLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cropLeaderboard, setCropLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [brandLeaderboard, setBrandLeaderboard] = useState<LeaderboardEntry[]>([]);

  const { cache, loading: thresholdsLoading } = useCropThresholds();

  // Debug logging to see what's in cache
  useEffect(() => {
    console.log('🔍 Cache updated:', cache);
    console.log('🔍 Cache keys:', Object.keys(cache || {}));
    console.log('🔍 Thresholds loading:', thresholdsLoading);
  }, [cache, thresholdsLoading]);

  // Fetch data on mount
  useEffect(() => {
    fetchFormattedSubmissions()
      .then((data) => {
        console.log('🔍 All data fetched:', data);
        setAllData(data);
      })
      .catch((error) => {
        console.error('Error fetching submissions:', error);
        setAllData([]);
      });
  }, []);

  // Set the default tab to 'crop' whenever a new store is selected
  useEffect(() => {
    if (selectedPoint) {
      setGroupBy('crop');
      // ADDED: Reset drill-down view when a new store is selected
      setSelectedEntry(null);
    }
  }, [selectedPoint]);

  // Calculate global min/max brix values for normalization
  useEffect(() => {
    if (allData.length > 0) {
      const brixValues = allData.map(d => d.brixLevel);
      const min = Math.min(...brixValues);
      const max = Math.max(...brixValues);
      setMinBrix(min);
      setMaxBrix(max);
    }
  }, [allData]);

  // Filter data based on filters context
  useEffect(() => {
    const filtered = applyFilters(allData, filters, isAdmin);
    setFilteredData(filtered);
  }, [filters, allData, isAdmin]);

  // Handle near me action to center map
  useEffect(() => {
    if (nearMeTriggered && userLocation && mapRef.current) {
      mapRef.current.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14,
        duration: 1000,
      });
      onNearMeHandled?.();
    }
  }, [nearMeTriggered, userLocation, onNearMeHandled]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    async function initializeMap() {
      const container = mapContainer.current;
      if (!container) return;

      const token = await getMapboxToken();
      if (!token) {
        console.error('Failed to retrieve Mapbox token. Map will not initialize.');
        return;
      }

      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: container,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: userLocation ? [userLocation.lng, userLocation.lat] : [-74.0242, 40.6941],
        zoom: 10,
      });

      mapRef.current = map;
      map.on('load', () => setIsMapLoaded(true));
      map.on('error', (e) => console.error('Mapbox error:', e.error));
    }

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, []);

  // Center map on highlighted point if exists
  useEffect(() => {
    if (highlightedPoint && mapRef.current) {
      const point = allData.find((d) => d.id === highlightedPoint.id);
      if (point && point.latitude && point.longitude) {
        mapRef.current.easeTo({
          center: [point.longitude, point.latitude],
          zoom: 16,
          duration: 1000,
        });
        setSelectedPoint(point);
      }
    }
  }, [highlightedPoint, allData]);

  // Draw markers for stores with proper color calculation
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    // Group data by store and calculate average normalized score
    const storeGroups: Record<string, BrixDataPoint[]> = {};
    const averageScores: Record<string, number> = {};

    filteredData.forEach((point) => {
      if (!point.latitude || !point.longitude) return;
      if (!point.locationName) return;
      if (!storeGroups[point.locationName]) storeGroups[point.locationName] = [];
      storeGroups[point.locationName].push(point);
    });

    // Calculate the average normalized score for each store with better error handling
    Object.entries(storeGroups).forEach(([storeName, points]) => {
      if (points.length > 0) {
        let totalNormalizedScore = 0;
        let validCount = 0;
        
        points.forEach(point => {
          // Better handling of crop type and thresholds
          const cropType = point.cropType || point.cropLabel || 'unknown';
          const thresholds = cache?.[cropType];
          
          console.log(`🔍 Processing point for ${storeName}:`, {
            cropType,
            brixLevel: point.brixLevel,
            thresholds,
            hasThresholds: !!thresholds
          });
          
          if (thresholds && typeof thresholds.poor === 'number' && typeof thresholds.excellent === 'number' && thresholds.excellent > thresholds.poor) {
            const normalizedScore = ((point.brixLevel - thresholds.poor) / (thresholds.excellent - thresholds.poor)) + 1;
            totalNormalizedScore += normalizedScore;
            validCount++;
          } else {
            // If no thresholds, use a simple normalized score based on global min/max
            if (maxBrix > minBrix) {
              const simpleNormalized = ((point.brixLevel - minBrix) / (maxBrix - minBrix)) + 1;
              totalNormalizedScore += simpleNormalized;
              validCount++;
            }
          }
        });
        
        averageScores[storeName] = validCount > 0 ? totalNormalizedScore / validCount : 1.5; // Default to middle score
        console.log(`🔍 Average score for ${storeName}:`, averageScores[storeName]);
      }
    });

    // Create new markers
    Object.entries(storeGroups).forEach(([storeName, points]) => {
      const firstPoint = points[0];
      if (!firstPoint.latitude || !firstPoint.longitude) return;

      const averageScore = averageScores[storeName] || 1.5;
      
      // Use hardcoded thresholds for marker colors since we're working with normalized scores
      const markerThresholds = {
        poor: 1.0,
        average: 1.25,
        good: 1.5,
        excellent: 1.75,
      };
      
      const markerColor = getBrixColor(averageScore, markerThresholds, 'hex');
      
      console.log(`🔍 Marker for ${storeName}:`, {
        averageScore,
        markerColor,
        points: points.length
      });

      // Create a div element for the marker and label
      const markerContainer = document.createElement('div');
      markerContainer.className = 'flex flex-col items-center cursor-pointer';
      markerContainer.style.textAlign = 'center';
      markerContainer.style.minWidth = '50px';

      // Create the colored dot
      const dot = document.createElement('div');
      dot.style.backgroundColor = markerColor;
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.borderRadius = '50%';
      dot.style.border = '2px solid white';
      dot.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
      dot.style.marginBottom = '4px';

      // Create the text label
      const label = document.createElement('div');
      label.innerText = storeName;
      label.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      label.style.color = 'white';
      label.style.padding = '2px 8px';
      label.style.borderRadius = '4px';
      label.style.whiteSpace = 'nowrap';
      label.style.fontSize = '12px';
      label.style.fontWeight = 'bold';
      label.style.textOverflow = 'ellipsis';
      label.style.overflow = 'hidden';
      label.style.maxWidth = '100px';

      markerContainer.appendChild(dot);
      markerContainer.appendChild(label);

      const marker = new mapboxgl.Marker({ element: markerContainer, anchor: 'bottom' })
        .setLngLat([firstPoint.longitude, firstPoint.latitude])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);

      markerContainer.addEventListener('click', () => {
        setSelectedPoint(firstPoint);
      });
    });

    // Handle map click to clear selected point
    const mapClickListener = (e: mapboxgl.MapMouseEvent) => {
      const isMarkerClick = markersRef.current.some(marker => {
        const markerElement = marker.getElement();
        return markerElement.contains(e.originalEvent.target as Node);
      });
      if (!isMarkerClick) {
        setSelectedPoint(null);
      }
    };

    mapRef.current.on('click', mapClickListener);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', mapClickListener);
      }
    };
  }, [filteredData, isMapLoaded, cache, minBrix, maxBrix]);

  // When store is selected, fetch leaderboard data with better error handling
  useEffect(() => {
    if (!selectedPoint || !selectedPoint.placeId) {
      setLocationLeaderboard([]);
      setCropLeaderboard([]);
      setBrandLeaderboard([]);
      return;
    }

    console.log('🔍 Fetching leaderboards for:', {
      locationName: selectedPoint.locationName,
      placeId: selectedPoint.placeId
    });

    setIsLoading(true);

    const localFilters = {
      location_name: selectedPoint.locationName,
      place_id: selectedPoint.placeId,
    };

    Promise.all([
      fetchLocationLeaderboard(localFilters),
      fetchCropLeaderboard(localFilters),
      fetchBrandLeaderboard(localFilters),
    ])
      .then(([locationData, cropData, brandData]) => {
        console.log('🔍 Leaderboard results:', {
          locationData,
          cropData,
          brandData
        });
        
        setLocationLeaderboard(locationData);
        setCropLeaderboard(cropData);
        setBrandLeaderboard(brandData);
      })
      .catch((error) => {
        console.error('Error fetching leaderboard data:', error);
        setLocationLeaderboard([]);
        setCropLeaderboard([]);
        setBrandLeaderboard([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedPoint, filters]);

  // Define generic thresholds for rank pills
  const rankThresholds = {
    poor: 3, // Ranks 3 and above are "poor"
    average: 2, // Rank 2 is "average"
    good: 1, // Rank 1 is "good"
    excellent: 0, // Should be unreachable, but good to have
  };

  // ADDED: New helper function to render a single submission item
  const renderSubmissionItem = (sub: BrixDataPoint, key: string) => {
    const cropType = sub.cropType || sub.cropLabel || 'unknown';
    const thresholds = cache?.[cropType];
    const brixPillColor = getBrixColor(
      sub.brixLevel, 
      thresholds || { poor: minBrix, average: (minBrix + maxBrix) / 2, good: maxBrix * 0.8, excellent: maxBrix }, 
      'bg'
    );
    
    return (
      <div key={key} className="flex justify-between items-start py-2">
        <div className="flex flex-col">
          <span className="font-semibold text-base">{sub.cropLabel || 'Unknown Crop'}</span>
          <span className="text-xs text-gray-500 mt-1">
            {sub.brandLabel || 'Unknown Brand'} - {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
          </span>
        </div>
        <div className={`flex-shrink-0 min-w-[40px] px-2 py-1 text-center font-bold text-sm text-white rounded-full ${brixPillColor}`}>
          {sub.brixLevel}
        </div>
      </div>
    );
  };

  // ADDED: New component to render the detailed submission list
  const renderDetailedSubmissions = () => {
    if (!selectedEntry) return null; // Safety check

    const filteredSubmissions = allData
      .filter(d => d.placeId === selectedPoint?.placeId)
      .filter(d => {
        if (selectedEntry.type === 'crop') {
          return d.cropLabel === selectedEntry.label;
        } else {
          return d.brandLabel === selectedEntry.label;
        }
      });

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-2 pb-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(null)}>
            <ArrowLeft size={20} />
          </Button>
          <h4 className="font-semibold text-base">Submissions for {selectedEntry.label} ({filteredSubmissions.length})</h4>
        </div>
        <div className="divide-y divide-gray-200 mt-4 overflow-y-auto">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map(sub => renderSubmissionItem(sub, sub.id))
          ) : (
            <div className="text-center text-gray-500 py-4">No submissions found.</div>
          )}
        </div>
      </div>
    );
  };
  
  const renderLeaderboard = () => {
    if (!selectedPoint) {
      return (
        <div className="p-6 text-center text-gray-500 text-lg">
          Click on a store marker to view its rankings and details.
        </div>
      );
    }
  
    if (isLoading || thresholdsLoading) {
      return <div className="p-4 text-center">Loading leaderboards...</div>;
    }
    
    // ADDED: Conditionally render the detailed view if an entry is selected
    if (selectedEntry) {
        return renderDetailedSubmissions();
    }
  
    return (
      <Tabs defaultValue="crop" value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="none">All</TabsTrigger>
          <TabsTrigger value="crop">Crop</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
        </TabsList>
  
        <TabsContent value="none" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2 text-base">All Submissions ({allData.filter(d => d.placeId === selectedPoint.placeId).length})</h4>
            <div className="divide-y divide-gray-200">
              {allData.filter(d => d.placeId === selectedPoint.placeId).map(sub => renderSubmissionItem(sub, sub.id))}
            </div>
          </div>
        </TabsContent>
  
        <TabsContent value="crop" className="mt-4">
          <div>
            <div className="flex justify-between items-center text-sm font-semibold border-b pb-1">
              <div>Crop ({cropLeaderboard.length})</div>
              <div>Rank</div>
            </div>
            <div className="divide-y divide-gray-200">
              {cropLeaderboard.length > 0 ? (
                cropLeaderboard.map((entry, index) => {
                  const rankPillColor = getBrixColor(entry.rank, rankThresholds, 'bg');
                  
                  return (
                    // ADDED: Add onClick handler to enable drill-down
                    <div 
                      key={entry.crop_id || `crop-${index}`} 
                      className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedEntry({ type: 'crop', id: entry.crop_id, label: entry.crop_label || entry.crop_name || 'Unknown Crop' })}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">
                          {entry.crop_label || entry.crop_name || 'Unknown Crop'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          ({entry.submission_count} submissions)
                        </span>
                        <span className="text-xs font-medium text-gray-500 mt-1">
                          Normalized Score: {(entry.average_normalized_score || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className={`flex-shrink-0 min-w-[40px] px-2 py-1 text-center font-bold text-sm text-white rounded-full ${rankPillColor}`}>
                        {entry.rank || '?'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No crop data available for this location.
                  <div className="text-xs mt-2">
                    Debug: {allData.filter(d => d.placeId === selectedPoint.placeId).length} total submissions for this store
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
  
        <TabsContent value="brand" className="mt-4">
          <div>
            <div className="flex justify-between items-center text-sm font-semibold border-b pb-1">
              <div>Brand ({brandLeaderboard.length})</div>
              <div>Rank</div>
            </div>
            <div className="divide-y divide-gray-200">
              {brandLeaderboard.length > 0 ? (
                brandLeaderboard.map((entry, index) => {
                  const rankPillColor = getBrixColor(entry.rank, rankThresholds, 'bg');
                  
                  return (
                    // ADDED: Add onClick handler to enable drill-down
                    <div 
                      key={entry.brand_id || `brand-${index}`} 
                      className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedEntry({ type: 'brand', id: entry.brand_id, label: entry.brand_label || entry.brand_name || 'Unknown Brand' })}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">
                          {entry.brand_label || entry.brand_name || 'Unknown Brand'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          ({entry.submission_count} submissions)
                        </span>
                        <span className="text-xs font-medium text-gray-500 mt-1">
                          Normalized Score: {(entry.average_normalized_score || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className={`flex-shrink-0 min-w-[40px] px-2 py-1 text-center font-bold text-sm text-white rounded-full ${rankPillColor}`}>
                        {entry.rank || '?'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No brand data available for this location.
                  <div className="text-xs mt-2">
                    Debug: {allData.filter(d => d.placeId === selectedPoint.placeId).length} total submissions for this store
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  // Drawer close handler
  const handleClose = () => setSelectedPoint(null);

  return (
    <div className="relative w-full h-full flex flex-row">
      <div ref={mapContainer} className="absolute inset-0 rounded-md shadow-md" />

      {/* ADDED: Debug info overlay - remove this in production */}
      {selectedPoint && process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-black bg-opacity-90 text-white p-3 rounded text-xs z-[9999] max-w-sm max-h-64 overflow-auto">
          <h3 className="font-bold mb-2">🐛 Debug Info</h3>
          <div className="space-y-1">
            <div><strong>Store:</strong> {selectedPoint.locationName}</div>
            <div><strong>Cache loaded:</strong> {cache ? 'Yes' : 'No'} ({Object.keys(cache || {}).length} crops)</div>
            <div><strong>Submissions for store:</strong> {allData.filter(d => d.placeId === selectedPoint.placeId).length}</div>
            <div><strong>Crop leaderboard:</strong> {cropLeaderboard.length} entries</div>
            <div><strong>Brand leaderboard:</strong> {brandLeaderboard.length} entries</div>
          </div>
        </div>
      )}

      {/* Side Pane UI */}
      <Card
        className="absolute inset-y-0 right-0 w-80 bg-white rounded-l-lg shadow-2xl z-50 flex flex-col h-full"
      >
        <CardHeader className="p-4 flex-shrink-0 flex flex-row items-start justify-between">
          <div>
            {selectedPoint ? (
              <>
                <CardTitle className="text-lg font-semibold">{selectedPoint.locationName}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPoint.streetAddress}, {selectedPoint.city}, {selectedPoint.state}
                </p>
              </>
            ) : (
              <CardTitle className="text-lg font-semibold">Brix Explorer</CardTitle>
            )}
          </div>
          {selectedPoint && (
            <Button onClick={handleClose} variant="ghost" size="icon" className="p-1">
              <X size={20} />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1 overflow-y-auto">
          {renderLeaderboard()}
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveMap;