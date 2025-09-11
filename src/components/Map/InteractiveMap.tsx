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
import { MapPin, Calendar, User, CheckCircle, Eye, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getMapboxToken } from '@/lib/getMapboxToken';
import type { GeoJSON } from 'geojson';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'; // New imports

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

  // Store leaderboard data per grouping
  const [locationLeaderboard, setLocationLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cropLeaderboard, setCropLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [brandLeaderboard, setBrandLeaderboard] = useState<LeaderboardEntry[]>([]);

  const { cache, loading } = useCropThresholds();

  // Fetch data on mount
  useEffect(() => {
    fetchFormattedSubmissions()
      .then((data) => setAllData(data))
      .catch((error) => {
        console.error('Error fetching submissions:', error);
        setAllData([]);
      });
  }, []);

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

  // Draw markers for stores, showing store name, with static color
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    // Group filtered data by store (locationName) to show markers per store
    const storeGroups: Record<string, BrixDataPoint[]> = {};
    filteredData.forEach((point) => {
      if (!point.latitude || !point.longitude) return;
      if (!point.locationName) return;
      if (!storeGroups[point.locationName]) storeGroups[point.locationName] = [];
      storeGroups[point.locationName].push(point);
    });

    Object.entries(storeGroups).forEach(([storeName, points]) => {
      // Use first point to position marker (assuming all share same location)
      const firstPoint = points[0];
      if (!firstPoint.latitude || !firstPoint.longitude) return;

      const markerElement = document.createElement('div');
      markerElement.style.padding = '6px 10px';
      markerElement.style.backgroundColor = '#3b82f6'; // blue static color
      markerElement.style.color = 'white';
      markerElement.style.fontWeight = 'bold';
      markerElement.style.borderRadius = '6px';
      markerElement.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
      markerElement.style.cursor = 'pointer';
      markerElement.innerText = storeName;

      const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([firstPoint.longitude, firstPoint.latitude])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);

      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPoint(firstPoint);
      });
    });

    // Clicking map clears selection
    const mapClickListener = () => setSelectedPoint(null);
    mapRef.current.on('click', mapClickListener);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', mapClickListener);
      }
    };
  }, [filteredData, isMapLoaded]);

  // When store is selected, fetch leaderboard data for that store location
  useEffect(() => {
    if (!selectedPoint || !selectedPoint.placeId) {
      setLocationLeaderboard([]);
      setCropLeaderboard([]);
      setBrandLeaderboard([]);
      return;
    }
  
    setIsLoading(true);
  
    // Use place_id directly for more specific filtering
    const localFilters = {
      location_name: selectedPoint.locationName,
      place_id: selectedPoint.placeId, // This should be the UUID string
    };
    
    console.log('Fetching leaderboard data with filters:', localFilters);
    console.log('Selected point details:', {
      locationName: selectedPoint.locationName,
      placeId: selectedPoint.placeId,
      streetAddress: selectedPoint.streetAddress
    });
  
    Promise.all([
      fetchLocationLeaderboard(localFilters),
      fetchCropLeaderboard(localFilters),
      fetchBrandLeaderboard(localFilters),
    ])
      .then(([locationData, cropData, brandData]) => {
        console.log('Leaderboard results:', {
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
        // Set empty arrays on error
        setLocationLeaderboard([]);
        setCropLeaderboard([]);
        setBrandLeaderboard([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedPoint, filters]);

  // Update the getColor function to work with 1-2 normalized scores
  const getColor = (normalizedScore: number) => {
    // Map normalized score (1-2) to color gradient
    if (normalizedScore >= 1.80) return '#16a34a'; // excellent - green
    if (normalizedScore >= 1.615) return '#65a30d'; // good - lime
    if (normalizedScore >= 1.40) return '#ca8a04'; // average - yellow
    return '#dc2626'; // poor - red
  };

  // UI helper: render leaderboard entries based on groupBy
  const renderLeaderboard = () => {
    if (!selectedPoint) return null;
  
    if (isLoading) {
      return <div className="p-4 text-center">Loading leaderboards...</div>;
    }
  
    const formatValue = (value: string | null) => value || 'N/A';
    const formatScore = (score: number) => score.toFixed(3);
  
    // Updated to return TabsContent components based on groupBy state
    return (
      <Tabs defaultValue="crop" value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="none">All</TabsTrigger>
          <TabsTrigger value="crop">Crop</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
        </TabsList>
  
        <TabsContent value="none" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2">All Submissions ({allData.filter(d => d.placeId === selectedPoint.placeId).length})</h4>
            <div className="text-xs font-semibold grid grid-cols-4 gap-2 border-b pb-1">
              <div>Crop</div>
              <div>Brand</div>
              <div>Date</div>
              <div>Brix</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {allData.filter(d => d.placeId === selectedPoint.placeId).map(sub => (
                <div key={sub.id} className="grid grid-cols-4 gap-2 py-1 border-b border-gray-200 text-sm">
                  <div>{formatValue(sub.cropType)}</div>
                  <div>{formatValue(sub.brandName)}</div>
                  <div>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}</div>
                  <div>{sub.brixLevel}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
  
        <TabsContent value="crop" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2">Crop Rankings ({cropLeaderboard.length})</h4>
            {cropLeaderboard.length === 0 ? (
              <div className="text-center text-gray-500">No crop data available.</div>
            ) : (
              <>
                <div className="text-xs font-semibold grid grid-cols-4 gap-2 border-b pb-1">
                  <div>Crop</div>
                  <div>Rank</div>
                  <div>Score</div>
                  <div>Count</div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {cropLeaderboard.map(entry => (
                    <div key={entry.crop_id} className="grid grid-cols-4 gap-2 py-1 border-b border-gray-200 text-sm">
                      <div>{formatValue(entry.crop_name)}</div>
                      <div className="font-semibold">#{entry.rank}</div>
                      <div style={{ color: getColor(entry.average_normalized_score) }} className="font-semibold">
                        {formatScore(entry.average_normalized_score)}
                      </div>
                      <div>{entry.submission_count}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
  
        <TabsContent value="brand" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2">Brand Rankings ({brandLeaderboard.length})</h4>
            {brandLeaderboard.length === 0 ? (
              <div className="text-center text-gray-500">No brand data available.</div>
            ) : (
              <>
                <div className="text-xs font-semibold grid grid-cols-4 gap-2 border-b pb-1">
                  <div>Brand</div>
                  <div>Rank</div>
                  <div>Score</div>
                  <div>Count</div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {brandLeaderboard.map(entry => (
                    <div key={entry.brand_id} className="grid grid-cols-4 gap-2 py-1 border-b border-gray-200 text-sm">
                      <div>{formatValue(entry.brand_name)}</div>
                      <div className="font-semibold">#{entry.rank}</div>
                      <div style={{ color: getColor(entry.average_normalized_score) }} className="font-semibold">
                        {formatScore(entry.average_normalized_score)}
                      </div>
                      <div>{entry.submission_count}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };
  

  // Drawer close handler
  const handleClose = () => setSelectedPoint(null);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapContainer} className="absolute inset-0 rounded-md shadow-md" />

      {/* Side Drawer UI */}
      {selectedPoint && (
        <div 
          className="absolute inset-y-0 right-0 w-80 bg-transparent rounded-l-lg shadow-2xl p-6 z-50 max-h-full overflow-y-auto transform transition-transform duration-300 ease-in-out translate-x-0"
        >
          <Card className="w-full">
            <CardHeader className="p-4 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">{selectedPoint.locationName}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPoint.streetAddress}, {selectedPoint.city}, {selectedPoint.state}
                </p>
              </div>
              <Button onClick={handleClose} variant="ghost" size="icon" className="p-1">
                <X size={20} />
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {renderLeaderboard()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;