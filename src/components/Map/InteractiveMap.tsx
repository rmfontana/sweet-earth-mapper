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
import { MapPin, Calendar, User, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSupabaseUrl, getPublishableKey } from "@/lib/utils.ts";
import type { Feature, Polygon } from 'geojson';
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

// --- HELPER FUNCTIONS FOR ICONS ---
const SUPABASE_PROJECT_REF = 'wbkzczcqlorsewoofwqe'; 

// Helper function to get the *full URL* for the SVG file in Supabase Storage
const getCropIconFileUrl = (mapboxIconId: string): string => {
  const bucketName = 'crop-images'; 
  const fullUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${bucketName}/${mapboxIconId}-uncolored.svg`;
  return fullUrl;
};

// Helper function to get the *ID string* Mapbox will use internally for the image
const getMapboxIconIdFromPoint = (point: BrixDataPoint): string => {
  if (point.name_normalized) {
    return point.name_normalized.toLowerCase().replace(/ /g, '_');
  }
  return point.cropType.toLowerCase().replace(/ /g, '_');
};

// Define a default fallback icon ID and its URL
const FALLBACK_ICON_RAW_NAME = 'default';
const FALLBACK_ICON_ID = getMapboxIconIdFromPoint({ cropType: FALLBACK_ICON_RAW_NAME } as BrixDataPoint);
const FALLBACK_ICON_FILE_URL = getCropIconFileUrl(FALLBACK_ICON_ID);

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

  // State to track which icon IDs have been successfully loaded into Mapbox
  const [loadedIconIds, setLoadedIconIds] = useState<Set<string>>(new Set());
  const [iconsInitialized, setIconsInitialized] = useState(false);

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
    const filtered = applyFilters(allData, filters, isAdmin);
    console.log('Filtered results:', filtered.length, 'submissions');
    setFilteredData(filtered);
  }, [filters, allData, isAdmin]);

  useEffect(() => {
    if (nearMeTriggered && userLocation && mapRef.current) {
      const map = mapRef.current;
      map.easeTo({
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
  
  const getColor = (cropType: string, brixLevel: number) => {
    if (loading) return '#d1d5db';
    const thresholds = cache[cropType];
    return getBrixColor(brixLevel, thresholds, 'hex');
  };

  const spiderfyCluster = (centerCoords: [number, number], points: BrixDataPoint[], map: mapboxgl.Map) => {
    setSpiderfiedPoints([]);
    
    if (map.getSource('spider-points')) {
      map.removeLayer('spider-lines');
      map.removeLayer('spider-points-icons');
      map.removeLayer('spider-points-circle-bg');
      map.removeSource('spider-points');
      map.removeSource('spider-lines');
    }

    const spiderRadiusBase = 60;
    const features = points.map((point, index) => {
      const angle = 0.5 * index;
      const radius = spiderRadiusBase * (1 + 0.15 * angle);

      const pixelCenter = map.project(centerCoords);
      const offsetX = radius * Math.cos(angle);
      const offsetY = radius * Math.sin(angle);

      const newPixelCoords = new mapboxgl.Point(pixelCenter.x + offsetX, pixelCenter.y + offsetY);
      const newGeoCoords = map.unproject(newPixelCoords);
      
      const normalizedCropType = getMapboxIconIdFromPoint(point);
      const iconIdToUse = loadedIconIds.has(normalizedCropType) ? normalizedCropType : FALLBACK_ICON_ID;

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
          cropType: iconIdToUse, 
        },
      };
    });

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

    map.addSource('spider-points', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

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

    map.addLayer({
      id: 'spider-points-icons',
      type: 'symbol',
      source: 'spider-points',
      layout: {
        'icon-image': ['get', 'cropType'],
        'icon-size': 0.7,
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-halo-color': 'hsl(0, 0%, 100%)',
        'icon-halo-width': 1,
      },
    });

    map.on('click', 'spider-points-icons', (e) => { 
      const feature = e.features?.[0];
      if (feature?.properties?.raw) {
        const point = JSON.parse(feature.properties.raw);
        setSelectedPoint(point);
      }
    });

    map.on('mouseenter', 'spider-points-icons', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'spider-points-icons', () => {
      map.getCanvas().style.cursor = '';
    });

    setSpiderfiedPoints(points);
  };

  const clearSpiderfy = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (map.getSource('spider-points')) {
      map.removeLayer('spider-lines');
      map.removeLayer('spider-points-icons');
      map.removeLayer('spider-points-circle-bg');
      map.removeSource('spider-points');
      map.removeSource('spider-lines');
    }
    setSpiderfiedPoints([]);
  };

  // Initialize map
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
        setIconsInitialized(false);
        setLoadedIconIds(new Set());
      }
    };
  }, []);

  // Load icons after map is loaded and we have data
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || allData.length === 0 || iconsInitialized) return;

    const map = mapRef.current;
    console.log('Starting icon loading process...');
    
    // Get all unique crop types that need icons
    const uniqueNormalizedCropTypes = new Set<string>();
    allData.forEach(point => {
      uniqueNormalizedCropTypes.add(getMapboxIconIdFromPoint(point));
    });

    const loadImagesPromises: Promise<void>[] = [];
    const newLoadedIcons = new Set<string>();

    const loadImageAndAddToMap = (id: string, url: string): Promise<void> => {
      return new Promise(async (resolve) => {
        if (map.hasImage(id)) {
          newLoadedIcons.add(id);
          console.log(`Icon "${id}" already exists in map`);
          resolve();
          return;
        }

        let loadImageComplete = false;

        const loadImagePromise = new Promise<void>(innerResolve => {
          map.loadImage(url, (error, image) => {
            loadImageComplete = true;
            if (error) {
              console.error(`Failed to load image for ID: "${id}" from URL: ${url}`, error);
            } else if (image) {
              try {
                map.addImage(id, image, { 
                  pixelRatio: window.devicePixelRatio || 1,
                  sdf: false // Explicitly set to false for colored icons
                });
                newLoadedIcons.add(id);
                console.log(`Successfully added icon "${id}" to Mapbox style`);
              } catch (e) {
                console.error(`Failed to add image "${id}" to Mapbox style after loading`, e);
              }
            }
            innerResolve();
          });
        });

        const timeoutPromise = new Promise<void>(innerResolve => {
          setTimeout(() => {
            if (!loadImageComplete) {
              console.error(`Timeout: map.loadImage for ID: "${id}" from URL: ${url} timed out after 10 seconds`);
            }
            innerResolve();
          }, 10000); // Increased timeout to 10 seconds
        });

        await Promise.race([loadImagePromise, timeoutPromise]);
        resolve();
      });
    };

    // Load fallback icon first
    loadImagesPromises.push(loadImageAndAddToMap(FALLBACK_ICON_ID, FALLBACK_ICON_FILE_URL));

    // Load all unique crop icons
    uniqueNormalizedCropTypes.forEach(iconId => {
      if (iconId === FALLBACK_ICON_ID) return;
      loadImagesPromises.push(loadImageAndAddToMap(iconId, getCropIconFileUrl(iconId)));
    });

    Promise.all(loadImagesPromises).then(() => {
      console.log(`Loaded ${newLoadedIcons.size} icons successfully`);
      setLoadedIconIds(newLoadedIcons);
      setIconsInitialized(true);
    }).catch(error => {
      console.error("Error in image loading process:", error);
      // Even if some fail, mark as initialized so we can proceed
      setLoadedIconIds(newLoadedIcons);
      setIconsInitialized(true);
    });

  }, [isMapLoaded, allData, iconsInitialized]);

  const toGeoJSON = useCallback((data: BrixDataPoint[]): GeoJSON.FeatureCollection => {
    console.log('Converting', data.length, 'data points to GeoJSON');
    
    const features = data.map((point) => {
      if (!point.latitude || !point.longitude || isNaN(point.latitude) || isNaN(point.longitude)) {
        console.warn('Skipping point with invalid coordinates:', point);
        return null;
      }

      const normalizedCropType = getMapboxIconIdFromPoint(point);
      const iconIdToUse = loadedIconIds.has(normalizedCropType) ? normalizedCropType : FALLBACK_ICON_ID;

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
          cropType: iconIdToUse, 
          originalCropType: point.cropType, // Keep original for clustering logic
        },
      };
    }).filter(Boolean);

    console.log('Generated', features.length, 'valid GeoJSON features');
    
    return {
      type: 'FeatureCollection',
      features: features as any[],
    };
  }, [getColor, loadedIconIds]);

  // Add map layers and data - only after icons are loaded
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !iconsInitialized || loadedIconIds.size === 0) {
      console.log('Skipping layer creation:', { 
        mapExists: !!mapRef.current, 
        isMapLoaded, 
        iconsInitialized, 
        loadedIconCount: loadedIconIds.size 
      });
      return; 
    }

    const map = mapRef.current;
    console.log('Creating/updating map layers with', filteredData.length, 'data points');

    // Remove existing layers if they exist
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point-circle-bg', 'unclustered-point-icons'];
    layersToRemove.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });

    if (map.getSource('points')) {
      map.removeSource('points');
    }

    // Add source with clustering
    map.addSource('points', {
      type: 'geojson',
      data: toGeoJSON(filteredData),
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 35,
      clusterProperties: {
        // Add crop type aggregation for smarter clustering
        'dominant_crop': ['case',
          ['>', ['get', 'point_count'], 1],
          ['get', 'originalCropType'],
          ['get', 'originalCropType']
        ]
      }
    });

    // Add cluster circles
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'points',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          'hsl(220, 70%, 60%)',
          5,
          'hsl(45, 80%, 55%)',  
          15,
          'hsl(350, 70%, 60%)',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          25,
          5,
          35,
          15,
          45,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'hsl(0, 0%, 100%)',
        'circle-opacity': 0.8,
        'circle-stroke-opacity': 0.85,
      },
    });

    // Add cluster count labels
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

    // Add individual point background circles
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
          10, 12,
          16, 20,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'hsl(0, 0%, 100%)',
        'circle-opacity': 0.9,
      },
    });

    // Add individual point icons
    map.addLayer({
      id: 'unclustered-point-icons',
      type: 'symbol',
      source: 'points',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['get', 'cropType'],
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.4,
          16, 0.6,
        ],
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-halo-color': 'hsl(0, 0%, 100%)',
        'icon-halo-width': 1,
      },
    });

    // Add event handlers
    map.on('click', 'clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const pointCount = features[0]?.properties?.point_count;
    
      if (!clusterId || features[0].geometry.type !== 'Point') return;
    
      const source = map.getSource('points') as mapboxgl.GeoJSONSource;
      const coords = features[0].geometry.coordinates as [number, number];
      const currentZoom = map.getZoom();
    
      if (currentZoom >= 13 || pointCount <= 5) {
        try {
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
      
      if (clusterId && pointCount <= 8) {  
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

    // Individual point click handlers
    map.on('click', ['unclustered-point-circle-bg', 'unclustered-point-icons'], (e) => {
      const feature = e.features?.[0];
      const point = feature?.properties?.raw && JSON.parse(feature.properties.raw);
      if (point) setSelectedPoint(point);
    });

    // Cursor changes
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', ['unclustered-point-circle-bg', 'unclustered-point-icons'], () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', ['unclustered-point-circle-bg', 'unclustered-point-icons'], () => {
      map.getCanvas().style.cursor = '';
    });

    // Clear spiderfy on map click
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      if (!features.some(f => f.source === 'points' || f.source === 'spider-points')) {
        clearSpiderfy();
      }
    });

    // Fit bounds to data if we have any
    if (filteredData.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredData.forEach(point => {
        if (point.latitude && point.longitude) {
          bounds.extend([point.longitude, point.latitude]);
        }
      });
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }

  }, [isMapLoaded, iconsInitialized, filteredData, toGeoJSON, loadedIconIds]);

  // Clean up user location layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('user-location')) map.removeLayer('user-location');
    if (map.getSource('user-location')) map.removeSource('user-location');
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-white p-2 rounded shadow text-xs">
          <div>Map Loaded: {isMapLoaded ? '✅' : '❌'}</div>
          <div>Icons Initialized: {iconsInitialized ? '✅' : '❌'}</div>
          <div>Loaded Icons: {loadedIconIds.size}</div>
          <div>Data Points: {filteredData.length}</div>
        </div>
      )}

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