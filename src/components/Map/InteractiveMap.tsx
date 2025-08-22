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

// Your Supabase Project Reference - YOU MUST REPLACE THIS WITH YOUR ACTUAL PROJECT REFERENCE
const SUPABASE_PROJECT_REF = 'wbkzczcqlorsewoofwqe';

const getCropIconFileUrl = (mapboxIconId: string): string => {
  const bucketName = 'crop-images';
  const fullUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${bucketName}/${mapboxIconId}-uncolored.png`;
  return fullUrl;
};

const getMapboxIconIdFromPoint = (point: BrixDataPoint): string => {
  if (point.name_normalized) {
    return point.name_normalized.toLowerCase().replace(/ /g, '_');
  }
  return point.cropType.toLowerCase().replace(/ /g, '_');
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
  const { filters, isAdmin } = useFilters();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
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
    const timeout = setTimeout(() => {
      if (!mapContainer.current) return;
      async function initializeMap() {
        const token = await getMapboxToken();
        if (!token) {
          console.error('Failed to retrieve Mapbox token. Map will not initialize.');
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
        map.on('load', () => setIsMapLoaded(true));
        map.on('error', (e) => console.error('Mapbox error:', e.error));
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

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || allData.length === 0 || iconsInitialized) {
      return;
    }
    const map = mapRef.current;
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
          resolve();
          return;
        }
        map.loadImage(url, (error, image) => {
          if (error || !image) {
            console.error(`Failed to load PNG for "${id}". Using fallback.`);
            const fallbackCanvas = createFallbackCircleImage(30, '#cccccc');
            createImageBitmap(fallbackCanvas).then(imageBitmap => {
              map.addImage(id, imageBitmap, { pixelRatio: window.devicePixelRatio || 1 });
              newLoadedIcons.add(id);
              resolve();
            }).catch(() => resolve());
          } else {
            try {
              map.addImage(id, image, { pixelRatio: window.devicePixelRatio || 1 });
              newLoadedIcons.add(id);
            } catch (e) {
              console.error(`Failed to add image "${id}" to style.`);
            }
            resolve();
          }
        });
      });
    };

    loadImagesPromises.push(new Promise(resolve => {
      if (map.hasImage(FALLBACK_ICON_ID)) {
        newLoadedIcons.add(FALLBACK_ICON_ID);
        resolve();
        return;
      }
      const fallbackCanvas = createFallbackCircleImage(30, '#cccccc');
      createImageBitmap(fallbackCanvas).then(imageBitmap => {
        map.addImage(FALLBACK_ICON_ID, imageBitmap, { pixelRatio: window.devicePixelRatio || 1 });
        newLoadedIcons.add(FALLBACK_ICON_ID);
        resolve();
      }).catch(() => resolve());
    }));

    uniqueNormalizedCropTypes.forEach(iconId => {
      if (iconId === FALLBACK_ICON_ID) return;
      loadImagesPromises.push(loadImageAndAddToMap(iconId, getCropIconFileUrl(iconId)));
    });

    Promise.all(loadImagesPromises).then(() => {
      setLoadedIconIds(newLoadedIcons);
      setIconsInitialized(true);
    }).catch(error => {
      console.error("Error in image loading process:", error);
      setLoadedIconIds(newLoadedIcons);
      setIconsInitialized(true);
    });
  }, [isMapLoaded, allData, iconsInitialized]);

  const toGeoJSON = useCallback((data: BrixDataPoint[]): GeoJSON.FeatureCollection => {
    const features = data.map((point) => {
      if (!point.latitude || !point.longitude || isNaN(point.latitude) || isNaN(point.longitude)) {
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
          originalCropType: point.cropType,
        },
      };
    }).filter(Boolean);
    return {
      type: 'FeatureCollection',
      features: features as any[],
    };
  }, [getColor, loadedIconIds]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !iconsInitialized || loadedIconIds.size === 0) {
      return;
    }
    const map = mapRef.current;
    let source = map.getSource('points') as mapboxgl.GeoJSONSource;
    
    // Check if the source already exists to prevent errors on re-render
    if (source) {
      source.setData(toGeoJSON(filteredData));
    } else {
      map.addSource('points', {
        type: 'geojson',
        data: toGeoJSON(filteredData),
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 35,
        clusterProperties: {
          'min_brix': ['min', ['get', 'brix']],
          'max_brix': ['max', ['get', 'brix']],
          'avg_brix': ['mean', ['get', 'brix']],
        },
      });

      // Layer for CLUSTER circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'points',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'avg_brix'],
            '#d1d5db',
            12, '#F59E0B',
            16, '#22C55E',
            20, '#059669'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10, 25,
            50, 30,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'hsl(0, 0%, 100%)',
          'circle-opacity': 0.9,
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
          'text-offset': [0, 0],
        },
        paint: {
          'text-color': 'hsl(0, 0%, 100%)',
          'text-halo-color': 'hsl(0, 0%, 0%)',
          'text-halo-width': 0.5,
        },
      });

      // Layer for individual point background circles
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
            10, 8,
            16, 12,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'hsl(0, 0%, 100%)',
          'circle-opacity': 0.9,
        },
      });

      // Layer for individual point icons
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
            10, 0.05,
            16, 0.1,
          ],
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-halo-color': 'hsl(0, 0%, 100%)',
          'icon-halo-width': 1,
        },
      });

      // Event handler for unclustered point clicks (shows info card)
      map.on('click', 'unclustered-point-icons', (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.raw) {
          setSelectedPoint(JSON.parse(feature.properties.raw));
        }
      });
      
      // Event handler for cluster clicks (zooms in)
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const feature = features[0];
        
        // A robust check for both the feature and its geometry type
        if (feature && feature.geometry && feature.geometry.type === 'Point' && feature.properties?.cluster_id) {
          const clusterId = feature.properties.cluster_id;
          const source = map.getSource('points') as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            
            // We can now safely access `coordinates` because we've confirmed the type
            map.easeTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom,
              duration: 800,
            });
          });
        }
      });

      // Change cursor on hover
      map.on('mouseenter', ['clusters', 'cluster-count', 'unclustered-point-icons'], () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', ['clusters', 'cluster-count', 'unclustered-point-icons'], () => {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [toGeoJSON, filteredData, isMapLoaded, iconsInitialized, loadedIconIds]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapContainer} className="flex-grow rounded-md shadow-md" />
      {selectedPoint && (
        <div className="absolute top-2 right-2 z-10 w-80 max-h-screen overflow-y-auto">
          <Card className="shadow-lg">
            <CardContent className="p-4">
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