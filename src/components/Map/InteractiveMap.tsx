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
// Your Supabase Project Reference - YOU MUST REPLACE THIS WITH YOUR ACTUAL PROJECT REFERENCE
const SUPABASE_PROJECT_REF = 'wbkzczcqlorsewoofwqe'; 

// Helper function to get the *full URL* for the PNG file in Supabase Storage
const getCropIconFileUrl = (mapboxIconId: string): string => {
  const bucketName = 'crop-images'; // Your Supabase bucket name for crop icons
  // Manually construct the public URL using the explicit projectRef, now for PNG
  const fullUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${bucketName}/${mapboxIconId}-uncolored.png`;
  // console.log(`Constructed icon URL (PNG): ${fullUrl}`); // Keep this for initial URL verification if needed
  return fullUrl;
};

// Helper function to get the *ID string* Mapbox will use internally for the image
// This now prioritizes a 'name_normalized' field if present in the data point.
const getMapboxIconIdFromPoint = (point: BrixDataPoint): string => {
    // If your BrixDataPoint already has a name_normalized field, use it directly.
    if (point.name_normalized) {
        // Ensure consistency by lowercasing and replacing spaces, even if it's expected to be clean
        return point.name_normalized.toLowerCase().replace(/ /g, '_');
    }
    // Fallback if name_normalized is not directly available
    return point.cropType.toLowerCase().replace(/ /g, '_');
};

// Define a default fallback icon ID and its URL
const FALLBACK_ICON_RAW_NAME = 'default';
// When creating a mock point for fallback, ensure it aligns with BrixDataPoint structure, even if minimal
const FALLBACK_ICON_ID = getMapboxIconIdFromPoint({ 
  cropType: FALLBACK_ICON_RAW_NAME, 
  id: '', brixLevel: 0, verified: false, variety: '', category: '', 
  latitude: null, longitude: null, locationName: '', storeName: '', brandName: '', 
  submittedBy: '', verifiedBy: '', submittedAt: '', outlier_notes: '', images: [] 
} as BrixDataPoint); 

// Create a simple canvas-based circle for fallback icon if PNG fails
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

// Define a generic cluster icon ID
const GENERIC_CLUSTER_ICON_ID = 'generic_cluster_icon';

// Create a more distinct generic cluster icon (e.g., two overlapping circles)
const createGenericClusterImage = (size = 40, color = '#374151') => { // Darker grey
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, size, size);
    context.fillStyle = color;
    // Main circle (background)
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
    context.fill();

    // Slightly offset circle to imply multiple, or a darker inner circle
    context.fillStyle = '#1F2937'; // Even darker grey
    context.beginPath();
    context.arc(size * 0.6, size * 0.4, size * 0.3, 0, Math.PI * 2);
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
  const [iconsInitialized, setIconsInitialized] = useState(false); // New state to track if icons have been processed

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
      if (map.getLayer('spider-points-circle-bg')) map.removeLayer('spider-points-circle-bg'); 
      map.removeSource('spider-points');
      map.removeSource('spider-lines');
    }

    const spiderRadiusBase = 60; // Base radius for spiderfication
    const features = points.map((point, index) => {
      // Distribute points in a circle
      const angle = (Math.PI * 2 * index) / points.length; // Evenly spaced angles
      const radius = spiderRadiusBase * (1 + 0.15 * (index % 3)); // Slightly vary radius for visual depth

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
    }).filter(Boolean);

    const spiderLines = points.map((point, index) => {
      const angle = (Math.PI * 2 * index) / points.length;
      const radius = spiderRadiusBase * (1 + 0.15 * (index % 3));

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
      id: 'spider-points-icons',
      type: 'symbol',
      source: 'spider-points',
      layout: {
        'icon-image': ['get', 'cropType'],
        'icon-size': [ // Adjusted size for spiderfied icons to be clear but not overwhelming
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.2,  
          16, 0.3, 
        ],
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
      if (map.getLayer('spider-points-circle-bg')) map.removeLayer('spider-points-circle-bg');
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
    
    const uniqueNormalizedCropTypes = new Set<string>();
    allData.forEach(point => {
      uniqueNormalizedCropTypes.add(getMapboxIconIdFromPoint(point));
    });

    const loadImagesPromises: Promise<void>[] = [];
    const newLoadedIcons = new Set<string>();

    const loadImageAndAddToMap = (id: string, url: string): Promise<void> => {
      return new Promise((resolve) => {
        if (map.hasImage(id)) {
          newLoadedIcons.add(id);
          console.log(`Icon "${id}" already exists in map`);
          resolve();
          return;
        }

        map.loadImage(url, (error, image) => {
          if (error) {
            console.error(`ERROR: Failed to load PNG image for ID: "${id}" from URL: ${url}. Reason:`, error);
            try {
                const fallbackCanvas = createFallbackCircleImage(30, '#3182CE'); 
                createImageBitmap(fallbackCanvas).then(imageBitmap => {
                    map.addImage(id, imageBitmap, { pixelRatio: window.devicePixelRatio || 1 });
                    newLoadedIcons.add(id);
                    console.log(`SUCCESS: Added fallback circle for "${id}" due to PNG load failure.`);
                    resolve();
                }).catch(e => {
                    console.error(`ERROR: Failed to create ImageBitmap from canvas for fallback "${id}". Reason:`, e);
                    resolve();
                });
            } catch (e) {
                console.error(`ERROR: Failed to create/add fallback circle for "${id}". Reason:`, e);
                resolve();
            }
          } else if (image) {
            try {
              map.addImage(id, image, { pixelRatio: window.devicePixelRatio || 1 });
              newLoadedIcons.add(id);
              console.log(`SUCCESS: Added PNG icon "${id}" to Mapbox style.`);
            } catch (e) {
              console.error(`ERROR: Failed to add PNG image "${id}" to Mapbox style after loading. Reason:`, e);
            }
            resolve();
          } else {
            console.error(`ERROR: map.loadImage for ID: "${id}" from URL: ${url} did not return an image or error (PNG).`);
            try {
                const fallbackCanvas = createFallbackCircleImage(30, '#3182CE'); 
                createImageBitmap(fallbackCanvas).then(imageBitmap => {
                    map.addImage(id, imageBitmap, { pixelRatio: window.devicePixelRatio || 1 });
                    newLoadedIcons.add(id);
                    console.log(`SUCCESS: Added fallback circle for "${id}" as PNG load was indeterminate.`);
                    resolve();
                }).catch(e => {
                    console.error(`ERROR: Failed to create ImageBitmap from canvas for fallback "${id}". Reason:`, e);
                    resolve();
                });
            } catch (e) {
                console.error(`ERROR: Failed to create/add fallback circle for "${id}". Reason:`, e);
                resolve();
            }
          }
        });
      });
    };

    // Load fallback icon (always a generated circle for consistency)
    loadImagesPromises.push(new Promise(resolve => {
        if (map.hasImage(FALLBACK_ICON_ID)) {
            newLoadedIcons.add(FALLBACK_ICON_ID);
            console.log(`Fallback icon "${FALLBACK_ICON_ID}" already exists.`);
            resolve();
            return;
        }
        try {
            const fallbackCanvas = createFallbackCircleImage(30, '#cccccc'); 
            createImageBitmap(fallbackCanvas).then(imageBitmap => {
                map.addImage(FALLBACK_ICON_ID, imageBitmap, { pixelRatio: window.devicePixelRatio || 1 });
                newLoadedIcons.add(FALLBACK_ICON_ID);
                console.log(`SUCCESS: Added generated fallback circle for "${FALLBACK_ICON_ID}".`);
                resolve();
            }).catch(e => {
                console.error(`ERROR: Failed to create ImageBitmap from canvas for generated fallback "${FALLBACK_ICON_ID}". Reason:`, e);
                resolve();
            });
        } catch (e) {
            console.error(`ERROR: Failed to create/add generated fallback circle for "${FALLBACK_ICON_ID}". Reason:`, e);
            resolve();
        }
    }));

    // Load generic cluster icon (always a generated canvas for consistency)
    loadImagesPromises.push(new Promise(resolve => {
        if (map.hasImage(GENERIC_CLUSTER_ICON_ID)) {
            newLoadedIcons.add(GENERIC_CLUSTER_ICON_ID);
            console.log(`Generic cluster icon "${GENERIC_CLUSTER_ICON_ID}" already exists.`);
            resolve();
            return;
        }
        try {
            const clusterCanvas = createGenericClusterImage(40); // Use slightly larger canvas for the new design
            createImageBitmap(clusterCanvas).then(imageBitmap => {
                map.addImage(GENERIC_CLUSTER_ICON_ID, imageBitmap, { pixelRatio: window.devicePixelRatio || 1 });
                newLoadedIcons.add(GENERIC_CLUSTER_ICON_ID);
                console.log(`SUCCESS: Added generated generic cluster icon for "${GENERIC_CLUSTER_ICON_ID}".`);
                resolve();
            }).catch(e => {
                console.error(`ERROR: Failed to create ImageBitmap from canvas for generic cluster icon "${GENERIC_CLUSTER_ICON_ID}". Reason:`, e);
                resolve();
            });
        } catch (e) {
            console.error(`ERROR: Failed to create/add generated generic cluster icon for "${GENERIC_CLUSTER_ICON_ID}". Reason:`, e);
            resolve();
        }
    }));


    // Load all unique crop icons
    uniqueNormalizedCropTypes.forEach(iconId => {
      if (iconId === FALLBACK_ICON_ID || iconId === GENERIC_CLUSTER_ICON_ID) return;
      loadImagesPromises.push(loadImageAndAddToMap(iconId, getCropIconFileUrl(iconId)));
    });

    // Add a general timeout to ensure map layers are eventually created even if all icons fail
    const allIconsLoadPromise = Promise.all(loadImagesPromises).then(() => {
      console.log(`Loaded ${newLoadedIcons.size} icons successfully (including fallbacks and generic cluster icon).`);
      setLoadedIconIds(newLoadedIcons);
      setIconsInitialized(true);
    }).catch(error => {
      console.error("Error in image loading process:", error);
      setLoadedIconIds(newLoadedIcons); 
      setIconsInitialized(true);
    });

    // Fallback timer to ensure map renders after a delay even if icons fail
    const fallbackTimer = setTimeout(() => {
        if (!iconsInitialized) {
            console.warn("Icon loading timed out, proceeding with map rendering using available icons/fallbacks.");
            setIconsInitialized(true);
            setLoadedIconIds(prev => {
                const updatedSet = new Set(prev);
                if (!updatedSet.has(FALLBACK_ICON_ID)) {
                    updatedSet.add(FALLBACK_ICON_ID);
                }
                if (!updatedSet.has(GENERIC_CLUSTER_ICON_ID)) {
                    updatedSet.add(GENERIC_CLUSTER_ICON_ID);
                }
                return updatedSet;
            });
        }
    }, 10000); // 10 seconds fallback

    allIconsLoadPromise.finally(() => {
        clearTimeout(fallbackTimer); // Clear the fallback timer if promises resolve naturally
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
      console.log('Skipping layer creation (waiting for map, icons, or loaded icons):', { 
        mapExists: !!mapRef.current, 
        isMapLoaded, 
        iconsInitialized, 
        loadedIconCount: loadedIconIds.size 
      });
      return; 
    }

    const map = mapRef.current;
    console.log('Creating/updating map layers with', filteredData.length, 'data points');

    const layersToRemove = ['clusters', 'cluster-count', 'cluster-icons', 'unclustered-point-icons', 'spider-lines', 'spider-points-icons'];
    layersToRemove.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
    // Explicitly ensure no stray circle layers
    if (map.getLayer('unclustered-point-circle-bg')) map.removeLayer('unclustered-point-circle-bg');
    if (map.getLayer('spider-points-circle-bg')) map.removeLayer('spider-points-circle-bg');

    const sourcesToRemove = ['points', 'spider-points', 'spider-lines'];
    sourcesToRemove.forEach(sourceId => {
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
    });

    // Add source with clustering
    map.addSource('points', {
      type: 'geojson',
      data: toGeoJSON(filteredData),
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 35,
      clusterProperties: {
        'first_crop_type_for_preview': ['first', ['get', 'originalCropType']] 
      }
    });

    // Add cluster count labels (displayed below the generic cluster icon)
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'points',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12, 
        'text-offset': [0, 1.2], // Adjusted offset for better placement below the larger icon
      },
      paint: {
        'text-color': 'hsl(0, 0%, 0%)', 
        'text-halo-color': 'hsl(0, 0%, 100%)',
        'text-halo-width': 1,
      },
    });

    // Layer for generic cluster icons
    if (loadedIconIds.has(GENERIC_CLUSTER_ICON_ID)) { 
      map.addLayer({
        id: 'cluster-icons',
        type: 'symbol',
        source: 'points',
        filter: ['has', 'point_count'], // Apply to clusters only
        layout: {
          'icon-image': GENERIC_CLUSTER_ICON_ID, // Use the new generic cluster icon
          'icon-size': [ // Adjusted size for clusters
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
    }
    
    // Layer for individual point icons (no background circle)
    if (loadedIconIds.size > 0) { 
        map.addLayer({
            id: 'unclustered-point-icons',
            type: 'symbol',
            source: 'points',
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': ['get', 'cropType'], // Individual crop type icon
                'icon-size': [ // Adjusted size for individual points
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 0.15, 
                    16, 0.25, 
                ],
                'icon-allow-overlap': true,
            },
            paint: {
                'icon-halo-color': 'hsl(0, 0%, 100%)',
                'icon-halo-width': 1,
            },
        });
    }

    // Add event handlers
    map.on('click', ['cluster-icons'], async (e) => { 
      const features = map.queryRenderedFeatures(e.point, { layers: ['cluster-icons'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const pointCount = features[0]?.properties?.point_count;
    
      if (!clusterId || features[0].geometry.type !== 'Point') return;
    
      const source = map.getSource('points') as mapboxgl.GeoJSONSource;
      const coords = features[0].geometry.coordinates as [number, number];
      const currentZoom = map.getZoom();
    
      if (currentZoom >= 13 || pointCount <= 5) { // Spiderfy if zoomed in enough or few points
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
    map.on('mouseenter', ['cluster-icons'], (e) => { 
      const features = map.queryRenderedFeatures(e.point, { layers: ['cluster-icons'] });
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

    map.on('mouseleave', ['cluster-icons'], () => { 
      setClusterPreview(null);
    });

    // Individual point click handlers
    map.on('click', ['unclustered-point-icons'], (e) => { 
      const feature = e.features?.[0];
      const point = feature?.properties?.raw && JSON.parse(feature.properties.raw);
      if (point) setSelectedPoint(point);
    });

    // Cursor changes
    map.on('mouseenter', ['cluster-icons', 'unclustered-point-icons', 'spider-points-icons'], () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', ['cluster-icons', 'unclustered-point-icons', 'spider-points-icons'], () => {
      map.getCanvas().style.cursor = '';
    });

    // Clear spiderfy on map click
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      if (!features.some(f => f.source === 'points' || f.source === 'spider-points')) {
        clearSpiderfy();
      }
    });

    // Removed map.fitBounds to stop force zooming
    // if (filteredData.length > 0) {
    //   const bounds = new mapboxgl.LngLatBounds();
    //   filteredData.forEach(point => {
    //     if (point.latitude && point.longitude) {
    //       bounds.extend([point.longitude, point.latitude]);
    //     }
    //   });
    //   map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    // }

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
          <div>Loaded Icons (including fallbacks): {loadedIconIds.size}</div>
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
