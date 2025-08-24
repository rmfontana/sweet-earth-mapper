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
import { MapPin, Calendar, User, CheckCircle, Eye, X } from 'lucide-react'; // Corrected: Added X
import { Link, useLocation } from 'react-router-dom';
import { getSupabaseUrl, getPublishableKey } from "@/lib/utils.ts";
import type { GeoJSON } from 'geojson';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';

interface InteractiveMapProps {
  userLocation?: { lat: number; lng: number } | null;
  showFilters: boolean;
  nearMeTriggered?: boolean;
  onNearMeHandled?: () => void;
}

async function getMapboxToken() {
  try {
    const supabaseUrl = getSupabaseUrl();
    const publishKey = getPublishableKey();
    const response = await fetch(`${supabaseUrl}/functions/v1/mapbox-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publishKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to fetch Mapbox token:', error);
    return null;
  }
}

const SUPABASE_PROJECT_REF = 'wbkzczcqlorsewoofwqe';

const getCropIconFileUrl = (mapboxIconId: string): string => {
  const bucketName = 'crop-images';
  const fullUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${bucketName}/${mapboxIconId}-uncolored.png`;
  return fullUrl;
};

const getMapboxIconIdFromPoint = (point: BrixDataPoint): string => {
  const name = point.name_normalized || point.cropType;
  return name;
};

const FALLBACK_ICON_RAW_NAME = 'default';
const FALLBACK_ICON_ID = getMapboxIconIdFromPoint({
  cropType: FALLBACK_ICON_RAW_NAME,
  id: '', brixLevel: 0, verified: false, variety: '', category: '',
  latitude: null, longitude: null, locationName: '', storeName: '', brandName: '',
  submittedBy: '', verifiedBy: '', submittedAt: '', outlier_notes: '', images: []
} as BrixDataPoint);

const createFallbackCircleImage = (size = 30, color = '#3182CE') => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, size, size);
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2, true);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#FFFFFF';
    context.stroke();
  }
  return canvas;
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  showFilters,
  nearMeTriggered,
  onNearMeHandled
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
  const [loadedIconIds, setLoadedIconIds] = useState<Set<string>>(new Set());
  const [iconsInitialized, setIconsInitialized] = useState(false);

  const { cache, loading } = useCropThresholds();

  useEffect(() => {
    fetchFormattedSubmissions()
      .then((data) => setAllData(data))
      .catch((error) => {
        console.error('Error fetching submissions:', error);
        setAllData([]);
      });
  }, []);

  useEffect(() => {
    const filtered = applyFilters(allData, filters, isAdmin);
    setFilteredData(filtered);
  }, [filters, allData, isAdmin]);

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

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
    if (!showFilters) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.easeTo({
        zoom: Math.max(currentZoom - 1, 5),
        duration: 700,
      });
    }
  }, [showFilters]);

  const getColor = useCallback((cropType: string, brixLevel: number) => {
    if (loading) return '#d1d5db';
    const thresholds = cache[cropType];
    return getBrixColor(brixLevel, thresholds, 'hex');
  }, [loading, cache]);

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
        setIconsInitialized(false);
        setLoadedIconIds(new Set());
      }
    };
  }, []);

  // Corrected: New useEffect to handle highlightedPoint from router state
  useEffect(() => {
    if (highlightedPoint && mapRef.current) {
      const point = allData.find(d => d.id === highlightedPoint.id);
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

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    }
    
    // Add new markers for the current filtered data
    filteredData.forEach(point => {
      if (!point.latitude || !point.longitude) return;

      const markerElement = document.createElement('div');
      const iconId = getMapboxIconIdFromPoint(point);
      const iconUrl = getCropIconFileUrl(iconId);
      const brixColor = getColor(point.cropType, point.brixLevel);

      const size = 32; // Marker container size
      const iconSize = 20; // Icon size to fit inside the circle

      markerElement.style.width = `${size}px`;
      markerElement.style.height = `${size}px`;
      markerElement.style.borderRadius = '50%';
      markerElement.style.backgroundColor = brixColor;
      markerElement.style.display = 'flex';
      markerElement.style.justifyContent = 'center';
      markerElement.style.alignItems = 'center';
      markerElement.style.border = '2px solid white';
      markerElement.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';

      const iconElement = document.createElement('img');
      iconElement.src = iconUrl;
      iconElement.alt = point.cropType;
      iconElement.style.width = `${iconSize}px`;
      iconElement.style.height = `${iconSize}px`;

      markerElement.appendChild(iconElement);

      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'center',
      }).setLngLat([point.longitude, point.latitude]);
      
      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
      
      // Stop propagation on marker click to prevent map's click-away behavior
      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPoint(point);
      });
    });

    // Added: Click event listener to the map to clear the selected point
    const mapClickListener = () => setSelectedPoint(null);
    mapRef.current.on('click', mapClickListener);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', mapClickListener);
      }
    };
  }, [filteredData, isMapLoaded, getColor]);

  // Handler for the close button
  const handleClose = () => {
    setSelectedPoint(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapContainer} className="flex-grow rounded-md shadow-md" />
      {selectedPoint && (
        <div className="absolute top-2 right-2 z-10 w-80 max-h-screen overflow-y-auto">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              {/* Added: Close button for the info card */}
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-bold">
                {selectedPoint.name_normalized || selectedPoint.cropType}
              </h3>
              <div className="mt-2 space-y-2">
                <p className="flex items-center text-sm text-gray-600">
                  <Badge
                    className={`
                      text-xs font-bold mr-2
                      ${selectedPoint.verified ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}
                    `}
                  >
                    Brix: {selectedPoint.brixLevel}
                  </Badge>
                  {selectedPoint.variety && (
                    <span className="text-xs text-gray-500 italic">
                      ({selectedPoint.variety})
                    </span>
                  )}
                </p>
                {selectedPoint.locationName && (
                  <p className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    {selectedPoint.locationName}
                  </p>
                )}
                {selectedPoint.submittedAt && (
                  <p className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    {new Date(selectedPoint.submittedAt).toLocaleDateString()}
                  </p>
                )}
                {selectedPoint.submittedBy && (
                  <p className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    Submitted by: {selectedPoint.submittedBy}
                  </p>
                )}
                <div className="mt-2 space-x-2">
                  <Badge
                    className={`
                      ${selectedPoint.verified ? 'bg-green-500' : 'bg-yellow-500'}
                      text-xs font-bold
                    `}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {selectedPoint.verified ? 'Verified' : 'Not Verified'}
                  </Badge>
                  {selectedPoint.images && selectedPoint.images.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/data/${selectedPoint.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                  )}
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