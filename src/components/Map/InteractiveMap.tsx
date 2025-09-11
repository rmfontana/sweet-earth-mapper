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

  const { cache, loading: thresholdsLoading } = useCropThresholds();

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

    // Group data by store and calculate average normalized score
    const storeGroups: Record<string, BrixDataPoint[]> = {};
    const averageScores: Record<string, number> = {};

    filteredData.forEach((point) => {
      if (!point.latitude || !point.longitude) return;
      if (!point.locationName) return;
      if (!storeGroups[point.locationName]) storeGroups[point.locationName] = [];
      storeGroups[point.locationName].push(point);
    });

    // Calculate the average normalized score for each store
    Object.entries(storeGroups).forEach(([storeName, points]) => {
      if (points.length > 0 && cache) {
        let totalNormalizedScore = 0;
        let count = 0;
        points.forEach(point => {
          const thresholds = cache[point.cropType || ''];
          if (thresholds && thresholds.excellent > thresholds.poor) {
            const normalizedScore = ((point.brixLevel - thresholds.poor) / (thresholds.excellent - thresholds.poor)) + 1;
            totalNormalizedScore += normalizedScore;
            count++;
          }
        });
        averageScores[storeName] = count > 0 ? totalNormalizedScore / count : 1; // Default to poor score if no valid data
      }
    });

    // Create new markers
    Object.entries(storeGroups).forEach(([storeName, points]) => {
      const firstPoint = points[0];
      if (!firstPoint.latitude || !firstPoint.longitude) return;

      const averageScore = averageScores[storeName] || 1; // Default to 1 if no score
      const markerColor = getBrixColor(averageScore, {
        poor: 1.0,
        average: 1.25,
        good: 1.5,
        excellent: 1.75,
      }, 'hex');

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
      label.style.maxWidth = '100px'; // Prevent very long names from stretching

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
      // Check if the click event originated from a marker
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
  }, [filteredData, isMapLoaded, cache]);

  // When store is selected, fetch leaderboard data for that store location
  useEffect(() => {
    if (!selectedPoint || !selectedPoint.placeId) {
      setLocationLeaderboard([]);
      setCropLeaderboard([]);
      setBrandLeaderboard([]);
      return;
    }

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

  // New helper function to get color based on normalized score (text-based)
  const getScoreColor = (score: number) => {
    if (score >= 1.8) return 'text-green-500';
    if (score >= 1.615) return 'text-yellow-500';
    if (score >= 1.4) return 'text-orange-500';
    return 'text-red-500';
  };

  // UI helper: render leaderboard entries based on groupBy
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

    const formatValue = (value: string | null) => value || 'N/A';
    const formatScore = (score: number) => score.toFixed(3);

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
            <div className="text-sm font-semibold grid grid-cols-[1fr_minmax(120px,2fr)_minmax(100px,auto)_60px] gap-2 border-b pb-1">
              <div>Crop</div>
              <div>Brand</div>
              <div>Date</div>
              <div className="text-right">Brix</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {allData.filter(d => d.placeId === selectedPoint.placeId).map(sub => (
                <div key={sub.id} className="grid grid-cols-[1fr_minmax(120px,2fr)_minmax(100px,auto)_60px] gap-2 py-1 border-b border-gray-200 text-base">
                  <div>{formatValue(sub.cropType)}</div>
                  <div>{formatValue(sub.brandName)}</div>
                  <div>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}</div>
                  <div className="text-right font-semibold">{sub.brixLevel}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="crop" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2 text-base">Crop Rankings ({cropLeaderboard.length})</h4>
            {cropLeaderboard.length === 0 ? (
              <div className="text-center text-gray-500 text-base">No crop data available.</div>
            ) : (
              <>
                <div className="text-sm font-semibold grid grid-cols-[1.5fr_50px_70px_50px] gap-2 border-b pb-1">
                  <div>Crop</div>
                  <div className="text-center">Rank</div>
                  <div className="text-center">Score</div>
                  <div className="text-center">Count</div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {cropLeaderboard.map(entry => (
                    <div key={entry.crop_id} className="grid grid-cols-[1.5fr_50px_70px_50px] gap-2 py-1 border-b border-gray-200 text-base items-center">
                      <div>{formatValue(entry.crop_name)}</div>
                      <div className="font-semibold text-center">#{entry.rank}</div>
                      <div className={`text-center font-bold ${getScoreColor(entry.average_normalized_score)}`}>
                        {formatScore(entry.average_normalized_score)}
                      </div>
                      <div className="text-center">{entry.submission_count}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2 text-base">Brand Rankings ({brandLeaderboard.length})</h4>
            {brandLeaderboard.length === 0 ? (
              <div className="text-center text-gray-500 text-base">No brand data available.</div>
            ) : (
              <>
                <div className="text-sm font-semibold grid grid-cols-[1.5fr_50px_70px_50px] gap-2 border-b pb-1">
                  <div>Brand</div>
                  <div className="text-center">Rank</div>
                  <div className="text-center">Score</div>
                  <div className="text-center">Count</div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {brandLeaderboard.map(entry => (
                    <div key={entry.brand_id} className="grid grid-cols-[1.5fr_50px_70px_50px] gap-2 py-1 border-b border-gray-200 text-base items-center">
                      <div>{formatValue(entry.brand_name)}</div>
                      <div className="font-semibold text-center">#{entry.rank}</div>
                      <div className={`text-center font-bold ${getScoreColor(entry.average_normalized_score)}`}>
                        {formatScore(entry.average_normalized_score)}
                      </div>
                      <div className="text-center">{entry.submission_count}</div>
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
    <div className="relative w-full h-full flex flex-row">
      <div ref={mapContainer} className="absolute inset-0 rounded-md shadow-md" />

      {/* Side Pane UI */}
      <Card
        className="absolute inset-y-0 right-0 w-80 bg-white rounded-l-lg shadow-2xl z-50 transform transition-transform duration-300 ease-in-out h-full overflow-y-auto"
      >
        <CardHeader className="p-4 flex flex-row items-start justify-between">
          <div>
            {selectedPoint ? (
              <>
                <CardTitle className="text-lg font-semibold">{selectedPoint.locationName}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPoint.streetAddress}, {selectedPoint.city}, {selectedPoint.state}
                </p>
              </>
            ) : (
              <CardTitle className="text-lg font-semibold">Explore the Map</CardTitle>
            )}
          </div>
          {selectedPoint && (
            <Button onClick={handleClose} variant="ghost" size="icon" className="p-1">
              <X size={20} />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {renderLeaderboard()}
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveMap;