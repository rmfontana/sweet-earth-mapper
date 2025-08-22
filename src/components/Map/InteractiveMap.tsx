import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BrixDataPoint } from '../../types';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters } from '../../contexts/FilterContext';
import { applyFilters } from '../../lib/filterUtils';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, User, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSupabaseUrl, getPublishableKey } from "@/lib/utils.ts";
import type { Feature, Polygon } from 'geojson';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';

interface InteractiveMapProps {
  userLocation?: { lat: number; lng: number } | null;
  showFilters: boolean;
  nearMeTriggered?: boolean; // Add this prop to trigger near me action
  onNearMeHandled?: () => void; // Callback to reset the trigger
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

// --- NEW HELPER FUNCTIONS FOR ICONS ---
// Helper function to get the icon URL for a given crop name
// It normalizes the name to match your file naming convention (e.g., "Bell Pepper" -> "bell_pepper-uncolored.svg")
const getCropIconUrl = (cropName: string): string => {
  const supabaseUrl = getSupabaseUrl();
  const bucketName = 'crop-images'; // Your Supabase bucket name
  // Normalize the crop name: lowercase, replace spaces with underscores, and append the suffix
  const normalizedName = cropName.toLowerCase().replace(/ /g, '_');
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${normalizedName}-uncolored.svg`;
};

// Define a default fallback icon ID and URL in case a specific crop icon is not found
// Make sure you have a 'default-uncolored.svg' in your 'crop-images' bucket
const FALLBACK_ICON_ID = 'default-uncolored';
const FALLBACK_ICON_URL = getCropIconUrl('default'); // Assumes 'default-uncolored.svg' exists in your bucket

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  userLocation, 
  showFilters, 
  nearMeTriggered, 
  onNearMeHandled 
}) => {
  const { filters, isAdmin } = useFilters();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [allData, setAllData] = useState<BrixDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<BrixDataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [spiderfiedPoints, setSpiderfiedPoints] = useState<BrixDataPoint[]>([]);
  const [clusterPreview, setClusterPreview] = useState<{
    points: BrixDataPoint[];
    position: { x: number; y: number };
  } | null>(null);

  const { cache, loading } = useCropThresholds();

  useEffect(() => {
    console.log('Fetching submissions...');
    fetchFormattedSubmissions()
      .then((data) => {
        console.log('Successfully fetched submissions:', data.length);
        setAllData(data);
      })
      .catch((error) => {
        console.error('Error fetching submissions:', error);
        setAllData([]);
      });
  }, []);

  useEffect(() => {
    console.log('Applying filters to', allData.length, 'submissions');
    
    // Apply filters directly since nearbyOnly is no longer part of the filter system
    const filtered = applyFilters(allData, filters, isAdmin);

    console.log('Filtered results:', filtered.length, 'submissions');
    setFilteredData(filtered);
  }, [filters, allData, isAdmin]);

  // Handle "Near Me" action separately
  useEffect(() => {
    if (nearMeTriggered && userLocation && mapRef.current) {
      const map = mapRef.current;
      
      // Zoom to user location with a tight zoom level to show nearby area
      map.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14, // Tight zoom to focus on nearby area
        duration: 1000,
      });

      // Call the callback to reset the trigger
      onNearMeHandled?.();
    }
  }, [nearMeTriggered, userLocation, onNearMeHandled]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
  
    // Optional: zoom out a bit to show expanded map area when filters hide
    if (!showFilters) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.easeTo({
        zoom: Math.max(currentZoom - 1, 5), // zoom out by 1, min zoom 5
        duration: 700,
      });
    }
  }, [showFilters]);
  
  // Fallback color if loading or no thresholds
  const getColor = (cropType: string, brixLevel: number) => {
    if (loading) return '#d1d5db'; // gray fallback hex
    const thresholds = cache[cropType];
    // Use your getBrixColor utility from your utils, which expects thresholds
    return getBrixColor(brixLevel, thresholds, 'hex');
  };

  // Spiderfy cluster function - MODIFIED to use icons for individual spider points
  const spiderfyCluster = (centerCoords: [number, number], points: BrixDataPoint[], map: mapboxgl.Map) => {
    // Clear any existing spiderfied points
    setSpiderfiedPoints([]);
    
    // Remove existing spider layers and sources if they exist
    if (map.getSource('spider-points')) {
      map.removeLayer('spider-lines');
      map.removeLayer('spider-points-icons'); // Remove the old icon layer for spider points
      map.removeLayer('spider-points-circle-bg'); // Remove the old circle layer for spider points
      map.removeSource('spider-points');
      map.removeSource('spider-lines');
    }

    // Use spiral distribution for better spacing — works well for many points
    const spiderRadiusBase = 60; // base radius in pixels
    const features = points.map((point, index) => {
      // Spiral formula for angle and distance to avoid overlap
      const angle = 0.5 * index;
      const radius = spiderRadiusBase * (1 + 0.15 * angle);

      const pixelCenter = map.project(centerCoords);
      const offsetX = radius * Math.cos(angle);
      const offsetY = radius * Math.sin(angle);

      const newPixelCoords = new mapboxgl.Point(pixelCenter.x + offsetX, pixelCenter.y + offsetY);
      const newGeoCoords = map.unproject(newPixelCoords);
      
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [newGeoCoords.lng, newGeoCoords.lat],
        },
        properties: {
          id: point.id,
          brix: point.brixLevel,
          color: getColor(point.cropType, point.brixLevel),
          raw: JSON.stringify(point),
          // Ensure cropType property is normalized for icon lookup
          cropType: point.cropType.toLowerCase().replace(/ /g, '_'),
        },
      };
    });

    // Spider lines from center to each point
    const spiderLines = points.map((point, index) => {
      const angle = 0.5 * index;
      const radius = spiderRadiusBase * (1 + 0.15 * angle);

      const pixelCenter = map.project(centerCoords);
      const offsetX = radius * Math.cos(angle);
      const offsetY = radius * Math.sin(angle);

      const newPixelCoords = new mapboxgl.Point(pixelCenter.x + offsetX, pixelCenter.y + offsetY);
      const newGeoCoords = map.unproject(newPixelCoords);
      
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [centerCoords, [newGeoCoords.lng, newGeoCoords.lat]],
        },
        properties: {},
      };
    });
    
    // Add spider lines
    map.addSource('spider-lines', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: spiderLines },
    });

    map.addLayer({
      id: 'spider-lines',
      type: 'line',
      source: 'spider-lines',
      paint: {
        'line-color': 'rgba(0,0,0,0.3)',
        'line-width': 2,
        'line-dasharray': [2, 4],
      },
    });

    // Add spider points as a GeoJSON source
    map.addSource('spider-points', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    // Layer for the Brix color circle background for spiderfied points
    map.addLayer({
      id: 'spider-points-circle-bg',
      type: 'circle',
      source: 'spider-points',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 10,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });

    // Layer for the crop icons on spiderfied points
    map.addLayer({
      id: 'spider-points-icons',
      type: 'symbol', // Changed to symbol for icons
      source: 'spider-points',
      layout: {
        // Dynamically get the icon image based on cropType, with fallback
        // The first ['get', 'cropType'] attempts to use the actual normalized cropType as the image ID
        // The second ['get', 'cropType'] is used as a fallback within the match if the first one doesn't resolve to a valid ID.
        // The last argument is the ultimate fallback image ID.
        'icon-image': ['match', ['get', 'cropType'], ['get', 'cropType'], ['get', 'cropType'], FALLBACK_ICON_ID],
        'icon-size': 0.7, // Adjust size as needed for spider points
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-halo-color': 'hsl(0, 0%, 100%)', // Optional: white halo for better contrast
        'icon-halo-width': 1,
      },
    });

    // Add click handler for spider points (listen on the icon layer)
    map.on('click', 'spider-points-icons', (e) => { 
      const feature = e.features?.[0];
      if (feature?.properties?.raw) {
        const point = JSON.parse(feature.properties.raw);
        setSelectedPoint(point);
      }
    });

    // Add hover effects for spider points (listen on the icon layer)
    map.on('mouseenter', 'spider-points-icons', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'spider-points-icons', () => {
      map.getCanvas().style.cursor = '';
    });

    setSpiderfiedPoints(points);
  };

  // Clear spiderfied points when clicking elsewhere
  const clearSpiderfy = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (map.getSource('spider-points')) {
      map.removeLayer('spider-lines');
      map.removeLayer('spider-points-icons'); // Remove icon layer
      map.removeLayer('spider-points-circle-bg'); // Remove circle layer
      map.removeSource('spider-points');
      map.removeSource('spider-lines');
    }
    setSpiderfiedPoints([]);
  };

  // Initialize Mapbox map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
  
    const timeout = setTimeout(() => {
      if (!mapContainer.current) return;
  
      async function initializeMap() {
        console.log('Initializing Mapbox map...');
        const token = await getMapboxToken();
        if (!token) {
          console.error('Failed to retrieve Mapbox token');
          return;
        }
  
        mapboxgl.accessToken = token;
  
        const map = new mapboxgl.Map({
          container: mapContainer.current, 
          style: 'mapbox://styles/mapbox/satellite-v9',
          center: userLocation ? [userLocation.lng, userLocation.lat] : [-74.0242, 40.6941],
          zoom: 10,
        });
  
        mapRef.current = map;
  
        map.on('load', () => {
          console.log('Map loaded');
          setIsMapLoaded(true);

          // Always load the fallback icon once the map is loaded
          // This ensures the fallback is always available
          if (!map.hasImage(FALLBACK_ICON_ID)) {
            map.loadImage(FALLBACK_ICON_URL, (error, image) => {
              if (error) {
                console.error('Failed to load fallback icon:', error);
                return;
              }
              image && map.addImage(FALLBACK_ICON_ID, image);
            });
          }
        });
      }
  
      initializeMap();
    }, 0);
  
    return () => {
      clearTimeout(timeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, []);

  // Add or update source and layers after map loaded or filteredData changed
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const map = mapRef.current;
    
    // Collect all unique normalized crop types from filtered data
    const uniqueNormalizedCropTypes = new Set<string>();
    filteredData.forEach(point => {
      uniqueNormalizedCropTypes.add(point.cropType.toLowerCase().replace(/ /g, '_'));
    });

    // Dynamically load crop icons
    // We iterate over the unique normalized crop types to load each image
    uniqueNormalizedCropTypes.forEach(normalizedCropType => {
      if (!map.hasImage(normalizedCropType)) { // Check if image is already loaded
        map.loadImage(getCropIconUrl(normalizedCropType), (error, image) => {
          if (error) {
            console.warn(`Failed to load image for ${normalizedCropType}. Using fallback icon.`);
            // No need to load fallback here, it's loaded on map load,
            // and the 'match' expression in the layer will handle the fallback.
          } else {
            // Only add if image exists and map doesn't already have it
            image && map.addImage(normalizedCropType, image);
          }
        });
      }
    });

    // Remove existing layers and sources to ensure a clean update
    if (map.getLayer('unclustered-point-icons')) map.removeLayer('unclustered-point-icons');
    if (map.getLayer('unclustered-point-circle-bg')) map.removeLayer('unclustered-point-circle-bg');
    if (map.getLayer('clusters')) map.removeLayer('clusters');
    if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
    if (map.getSource('points')) map.removeSource('points');


    console.log('Adding source and layers with', filteredData.length, 'points');
    map.addSource('points', {
      type: 'geojson',
      data: toGeoJSON(filteredData),
      cluster: true,
      clusterMaxZoom: 13, // Lower for better UX - individual points show sooner
      clusterRadius: 35, // Smaller radius for less aggressive clustering
      //clusterProperties: { // Uncomment and configure if you need custom cluster properties
      //  'avg_brix': ['/', ['+', ['get', 'brix']], ['get', 'point_count']],
      //  'crop_types': ['case', ['>', ['get', 'point_count'], 1], 'mixed', ['get', 'cropType']]
      //}
    });

    // Enhanced cluster styling with better visual hierarchy (remains circles for now)
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'points',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          'hsl(220, 70%, 60%)', // Primary blue for small clusters
          5,
          'hsl(45, 80%, 55%)', // Warning yellow for medium clusters  
          15,
          'hsl(350, 70%, 60%)', // Destructive red for large clusters
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          25, // Larger base size
          5,
          35,
          15,
          45,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'hsl(0, 0%, 100%)',
        'circle-stroke-opacity': 0.8,
        'circle-opacity': 0.85,
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'points',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': 'hsl(0, 0%, 100%)',
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
      },
    });

    // --- NEW LAYERS FOR UNCLUSTERED POINTS (ICONS) ---
    // Layer for the Brix color circle background for unclustered points
    map.addLayer({
      id: 'unclustered-point-circle-bg',
      type: 'circle',
      source: 'points',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 10, // A bit larger circle behind the icon at lower zooms
          16, 25, // Larger circle at higher zooms
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'hsl(0, 0%, 100%)',
        'circle-opacity': 0.9,
      },
    });

    // Layer for the crop icons on top of the circles
    map.addLayer({
      id: 'unclustered-point-icons',
      type: 'symbol', // Change type to 'symbol' for icons
      source: 'points',
      filter: ['!', ['has', 'point_count']],
      layout: {
        // Dynamically get the icon image based on cropType.
        // The `match` expression looks for the `cropType` property, if found it uses that as the image ID,
        // otherwise, it falls back to `FALLBACK_ICON_ID`.
        'icon-image': ['match', ['get', 'cropType'], ['get', 'cropType'], ['get', 'cropType'], FALLBACK_ICON_ID],
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.5, // Smaller icon at lower zooms
          16, 0.75, // Larger icon at higher zooms
        ],
        'icon-allow-overlap': true, // Allow icons to overlap if necessary
      },
      paint: {
        'icon-halo-color': 'hsl(0, 0%, 100%)', // Optional: white halo for better contrast
        'icon-halo-width': 1,
      },
    });

    // Smart cluster expansion or spiderfying based on zoom level
    map.on('click', 'clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const pointCount = features[0]?.properties?.point_count;
    
      if (!clusterId || features[0].geometry.type !== 'Point') return;
    
      const source = map.getSource('points') as mapboxgl.GeoJSONSource;
      const coords = features[0].geometry.coordinates as [number, number];
      const currentZoom = map.getZoom();
    
      // If we're at high zoom or small cluster, spiderfy instead of zooming
      if (currentZoom >= 13 || pointCount <= 5) {
        try {
          // Get cluster leaves for spiderfying
          source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves) => {
            if (err || !leaves) {
              console.error('Error getting cluster leaves:', err);
              return;
            }
            
            const clusterPoints: BrixDataPoint[] = leaves
              .map(leaf => leaf.properties?.raw ? JSON.parse(leaf.properties.raw) : null)
              .filter(Boolean);
            
            spiderfyCluster(coords, clusterPoints, map);
          });
        } catch (error) {
          console.error('Error during spiderfying:', error);
        }
      } else {
        // Normal zoom expansion for lower zoom levels
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) {
            console.error('Error getting cluster expansion zoom:', err);
            return;
          }
          
          map.easeTo({
            center: coords,
            zoom: zoom || currentZoom + 2, 
            duration: 800,
          });
        });
      }
    });

    // Cluster hover preview
    map.on('mouseenter', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const pointCount = features[0]?.properties?.point_count;
      
      if (clusterId && pointCount <= 8) {  // Only show preview for smaller clusters
        const source = map.getSource('points') as mapboxgl.GeoJSONSource;
        source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves) => {
          if (!err && leaves) {
            const points: BrixDataPoint[] = leaves
              .map(leaf => leaf.properties?.raw ? JSON.parse(leaf.properties.raw) : null)
              .filter(Boolean);
            
            setClusterPreview({
              points,
              position: { x: e.point.x, y: e.point.y }
            });
          }
        });
      }
    });

    map.on('mouseleave', 'clusters', () => {
      setClusterPreview(null);
    });

    // Update click handler for the new symbol layers for unclustered points
    map.on('click', ['unclustered-point-circle-bg', 'unclustered-point-icons'], (e) => {
      const feature = e.features?.[0];
      const point = feature?.properties?.raw && JSON.parse(feature.properties.raw);
      if (point) setSelectedPoint(point);
    });

    // Enhanced hover effects for clusters
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    // Hover effects for unclustered points (listen on both layers for better UX)
    map.on('mouseenter', ['unclustered-point-circle-bg', 'unclustered-point-icons'], () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', ['unclustered-point-circle-bg', 'unclustered-point-icons'], () => {
      map.getCanvas().style.cursor = '';
    });

    // Clear spiderfied points when clicking elsewhere on map
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      // Check if the click was not on any points layer (cluster or unclustered/spider)
      if (!features.some(f => f.source === 'points' || f.source === 'spider-points')) {
        clearSpiderfy();
      }
    });

    // Fit map to show all data points initially
    if (filteredData.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredData.forEach(point => {
        if (point.latitude && point.longitude) {
          bounds.extend([point.longitude, point.latitude]);
        }
      });
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [isMapLoaded, filteredData]);

  // Add user location marker (optional - could add a simple marker instead of radius)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clean up any existing user location indicators
    if (map.getLayer('user-location')) map.removeLayer('user-location');
    if (map.getSource('user-location')) map.removeSource('user-location');
  }, [userLocation]);

  // Helper function to convert data points to GeoJSON format
  const toGeoJSON = (data: BrixDataPoint[]): GeoJSON.FeatureCollection => {
    console.log('Converting', data.length, 'data points to GeoJSON');
    
    const features = data.map((point) => {
      if (!point.latitude || !point.longitude || isNaN(point.latitude) || isNaN(point.longitude)) {
        console.warn('Skipping point with invalid coordinates:', point);
        return null;
      }

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.id,
          brix: point.brixLevel,
          color: getColor(point.cropType, point.brixLevel),
          raw: JSON.stringify(point),
          // IMPORTANT: Normalize cropType here to match the image ID in Mapbox
          cropType: point.cropType.toLowerCase().replace(/ /g, '_'),
        },
      };
    }).filter(Boolean);

    console.log('Generated', features.length, 'valid GeoJSON features');
    
    return {
      type: 'FeatureCollection',
      features: features as any[],
    };
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Cluster Preview Tooltip (remains unchanged) */}
      {clusterPreview && (
        <div 
          className="absolute pointer-events-none z-40"
          style={{
            left: clusterPreview.position.x + 10,
            top: clusterPreview.position.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <Card className="bg-white shadow-lg border">
            <CardContent className="p-3 min-w-[200px]">
              <div className="text-sm font-medium mb-2">
                {clusterPreview.points.length} BRIX readings
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Crops:</span>
                  <span className="font-medium">
                    {[...new Set(clusterPreview.points.map(p => p.cropType))].slice(0, 2).join(', ')}
                    {[...new Set(clusterPreview.points.map(p => p.cropType))].length > 2 && '...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>BRIX range:</span>
                  <span className="font-medium">
                    {Math.min(...clusterPreview.points.map(p => p.brixLevel))} - {Math.max(...clusterPreview.points.map(p => p.brixLevel))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stores:</span>
                  <span className="font-medium">
                    {[...new Set(clusterPreview.points.map(p => p.storeName))].length} unique
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 italic">
                Click to {clusterPreview.points.length <= 5 ? 'expand' : 'zoom in'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Point Info Card (remains unchanged) */}
      {selectedPoint && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <span>{selectedPoint.cropType}</span>
                  {selectedPoint.verified && <CheckCircle className="w-4 h-4 text-green-600" />}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPoint(null)}>×</Button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">BRIX Reading</span>
                  <Badge className="text-white" style={{ backgroundColor: getColor(selectedPoint.cropType, selectedPoint.brixLevel) }}>
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
                {selectedPoint.storeName && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Store:</span>
                    <span>{selectedPoint.storeName}</span>
                  </div>
                )}
                {selectedPoint.brandName && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Brand:</span>
                    <span>{selectedPoint.brandName}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Link to={`/data-point/${selectedPoint.id}`}>
                    <Button className="w-full" size="sm">
                      <Eye className="w-4 h-4 mr-2" /> View Full Details
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
