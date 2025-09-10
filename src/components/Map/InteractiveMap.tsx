import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BrixDataPoint } from '../../types';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters } from '../../contexts/FilterContext';
import { applyFilters } from '../../lib/filterUtils';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, User, CheckCircle, Eye, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getMapboxToken } from '@/lib/getMapboxToken';
import type { GeoJSON } from 'geojson';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';

// Leaderboard API imports
import {
  fetchLocationLeaderboard,
  fetchCropLeaderboard,
  fetchBrandLeaderboard,
  LeaderboardEntry,
} from '../../lib/fetchLeaderboards';

interface InteractiveMapProps {
  userLocation?: { lat: number; lng: number } | null;
  showFilters: boolean;
  nearMeTriggered?: boolean;
  onNearMeHandled?: () => void;
}

const SUPABASE_PROJECT_REF = 'wbkzczcqlorsewoofwqe';

const getColor = (normalizedScore: number) => {
  // Map normalized score (0-1) to green/yellow/red gradient
  if (normalizedScore >= 0.7) return '#16a34a'; // green
  if (normalizedScore >= 0.4) return '#ca8a04'; // yellow
  return '#dc2626'; // red
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  showFilters,
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

    const localFilters = {
      ...filters,
      location_name: selectedPoint.locationName,
      place_id: selectedPoint.placeId,
    };
    
    // Log the filters to the console for debugging
    console.log('Fetching leaderboard data with filters:', localFilters);

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
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedPoint, filters]);

  // UI helper: render leaderboard entries based on groupBy
  const renderLeaderboard = () => {
    if (!selectedPoint) return null;
  
    if (isLoading) {
      return <div className="p-4 text-center">Loading leaderboards...</div>;
    }
  
    const formatValue = (value: string | null) => value;
  
    switch (groupBy) {
      case 'none': {
        const storeSubs = allData.filter(d => d.placeId === selectedPoint.placeId);
        return (
          <div>
            <h4 className="font-semibold mb-2">Submissions BRIX Score</h4>
            <div className="text-xs font-semibold grid grid-cols-4 gap-2 border-b pb-1">
              <div>Crop Type</div>
              <div>Brand</div>
              <div>Submission Date</div>
              <div>Brix Score</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {storeSubs.map(sub => (
                <div
                  key={sub.id}
                  className="grid grid-cols-4 gap-2 py-1 border-b border-gray-200"
                >
                  <div>{formatValue(sub.cropType)}</div>
                  <div>{formatValue(sub.brandName)}</div>
                  <div>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}</div>
                  <div>{sub.brixLevel}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
  
      case 'crop': {
        return (
          <div>
            <h4 className="font-semibold mb-2">Crop Rank</h4>
            <div className="text-xs font-semibold grid grid-cols-3 gap-2 border-b pb-1">
              <div>Crop</div>
              <div>Rank</div>
              <div># Submissions</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {cropLeaderboard.map(entry => (
                <div
                  key={entry.crop_id}
                  className="grid grid-cols-3 gap-2 py-1 border-b border-gray-200"
                >
                  <div>{formatValue(entry.crop_name)}</div>
                  <div
                    style={{ color: getColor(entry.average_normalized_score) }}
                    className="font-semibold"
                  >
                    {entry.rank}
                  </div>
                  <div>{entry.submission_count}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
  
      case 'brand': {
        return (
          <div>
            <h4 className="font-semibold mb-2">Brand Rank</h4>
            <div className="text-xs font-semibold grid grid-cols-3 gap-2 border-b pb-1">
              <div>Brand</div>
              <div>Rank</div>
              <div># Submissions</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {brandLeaderboard.map(entry => (
                <div
                  key={entry.brand_id}
                  className="grid grid-cols-3 gap-2 py-1 border-b border-gray-200"
                >
                  <div>{formatValue(entry.brand_name)}</div>
                  <div
                    style={{ color: getColor(entry.average_normalized_score) }}
                    className="font-semibold"
                  >
                    {entry.rank}
                  </div>
                  <div>{entry.submission_count}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
  
      default:
        return null;
    }
  };
  

  // Drawer close handler
  const handleClose = () => setSelectedPoint(null);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapContainer} className="absolute inset-0 rounded-md shadow-md" />

      {/* Drawer UI */}
      {selectedPoint && (
        <div className="absolute top-2 right-2 w-80 bg-white rounded-md shadow-lg p-4 z-50 max-h-[80vh] overflow-y-auto transition-transform duration-300 ease-in-out">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{selectedPoint.locationName}</h3>
            <button
              onClick={handleClose}
              aria-label="Close drawer"
              className="p-1 rounded hover:bg-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mb-2 text-sm text-gray-600">{selectedPoint.streetAddress}</div>

          <div className="mb-4">
            <label htmlFor="groupBy" className="block text-sm font-medium mb-1">
              Group by:
            </label>
            <select
              id="groupBy"
              className="border border-gray-300 rounded p-1 w-full"
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as 'none' | 'crop' | 'brand')
              }
            >
              <option value="none">None</option>
              <option value="crop">Crop</option>
              <option value="brand">Brand</option>
            </select>
          </div>

          {/* Leaderboard content */}
          {renderLeaderboard()}
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
