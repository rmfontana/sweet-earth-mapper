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
import { MapPin, Calendar, User, CheckCircle, Eye, LocateIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSupabaseUrl, getPublishableKey } from "@/lib/utils.ts";
import type { Feature } from 'geojson';
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
    fetchFormattedSubmissions()
      .then((data) => {
        setAllData(data);
      })
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

  // All helper functions are now wrapped in useCallback to prevent re-creation
  const getColor = useCallback((cropType: string, brixLevel: number) => {
    if (loading) return '#d1d5db';
    const thresholds = cache[cropType];
    return getBrixColor(brixLevel, thresholds, 'hex');
  }, [loading, cache]);

  const toGeoJSON = useCallback((data: BrixDataPoint[]): GeoJSON.FeatureCollection => {
    const features = data.map((point) => {
      if (!point.latitude || !point.longitude || isNaN(point.latitude) || isNaN(point.longitude)) {
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
        },
      };
    }).filter(Boolean);

    return {
      type: 'FeatureCollection',
      features: features as any[],
    };
  }, [getColor]);

  const clearSpiderfy = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (map.getLayer('clusters')) {
      map.setLayoutProperty('clusters', 'visibility', 'visible');
    }
    if (map.getLayer('cluster-count')) {
      map.setLayoutProperty('cluster-count', 'visibility', 'visible');
    }

    if (map.getSource('spider-points')) {
      if (map.getLayer('spider-lines')) map.removeLayer('spider-lines');
      if (map.getLayer('spider-points')) map.removeLayer('spider-points');
      if (map.getSource('spider-points')) map.removeSource('spider-points');
      if (map.getSource('spider-lines')) map.removeSource('spider-lines');
    }
    setSpiderfiedPoints([]);
  }, []);
  
  const spiderfyCluster = useCallback((centerCoords: [number, number], points: BrixDataPoint[], map: mapboxgl.Map) => {
    clearSpiderfy();
    
    if (map.getLayer('clusters')) {
      map.setLayoutProperty('clusters', 'visibility', 'none');
    }
    if (map.getLayer('cluster-count')) {
      map.setLayoutProperty('cluster-count', 'visibility', 'none');
    }

    const spiderRadiusBase = 60;
    const features: Feature[] = points.map((point, index) => {
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
          cropType: point.cropType,
        },
      };
    });

    const spiderLines: Feature[] = points.map((point, index) => {
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
    
    if (!map.getSource('spider-lines')) {
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
    } else {
      (map.getSource('spider-lines') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: spiderLines });
    }

    if (!map.getSource('spider-points')) {
      map.addSource('spider-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'spider-points',
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
    } else {
      (map.getSource('spider-points') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
    }

    setSpiderfiedPoints(points);
  }, [getColor, clearSpiderfy]);

  const recenterMap = useCallback(() => {
    if (!mapRef.current || filteredData.length === 0) return;
    const map = mapRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    filteredData.forEach(point => {
        if (point.latitude && point.longitude) {
            bounds.extend([point.longitude, point.latitude]);
        }
    });
    map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
  }, [filteredData]);
  
  // This hook handles map initialization and all persistent event listeners. It runs only once.
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
  
    const timeout = setTimeout(() => {
      if (!mapContainer.current) return;
  
      async function initializeMap() {
        const token = await getMapboxToken();
        if (!token) {
          return;
        }
  
        mapboxgl.accessToken = token;
        const SPIDERFY_ZOOM_THRESHOLD = 16;
  
        const map = new mapboxgl.Map({
          container: mapContainer.current, 
          style: 'mapbox://styles/mapbox/satellite-v9',
          center: userLocation ? [userLocation.lng, userLocation.lat] : [-74.0242, 40.6941],
          zoom: 10,
        });
  
        mapRef.current = map;
  
        map.on('load', () => {
          setIsMapLoaded(true);
          
          map.addSource('points', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: SPIDERFY_ZOOM_THRESHOLD,
            clusterRadius: 35,
          });

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

          map.addLayer({
            id: 'unclustered-point',
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
                16, 20,
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'hsl(0, 0%, 100%)',
              'circle-opacity': 0.9,
              'circle-stroke-opacity': 0.8,
            },
          });

          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            if (!features.length) return;
            
            const clusterId = features[0].properties?.cluster_id;
            const pointCount = features[0].properties?.point_count;
            
            if (!clusterId || features[0].geometry.type !== 'Point') return;
            
            const source = map.getSource('points') as mapboxgl.GeoJSONSource;
            const coords = (features[0].geometry as any).coordinates as [number, number];
            const currentZoom = map.getZoom();
            
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;

              if (zoom >= SPIDERFY_ZOOM_THRESHOLD) {
                source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves) => {
                  if (err || !leaves) return;
                  const clusterPoints = leaves.map(leaf => leaf.properties?.raw ? JSON.parse(leaf.properties.raw) : null).filter(Boolean);
                  spiderfyCluster(coords, clusterPoints, map);
                });
              } else {
                map.easeTo({
                  center: coords,
                  zoom: zoom || currentZoom + 2, 
                  duration: 800,
                });
              }
            });
          });

          map.on('click', 'unclustered-point', (e) => {
            const feature = e.features?.[0];
            const point = feature?.properties?.raw && JSON.parse(feature.properties.raw);
            if (point) setSelectedPoint(point);
          });

          map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point);
            if (!features.some(f => f.source === 'points' || f.source === 'spider-points')) {
              clearSpiderfy();
            }
          });
          
          map.on('zoomend', () => {
            const currentZoom = map.getZoom();
            if (currentZoom < SPIDERFY_ZOOM_THRESHOLD) {
                clearSpiderfy();
            }
          });

          map.on('mouseenter', 'clusters', (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            if (!features.length) return;
            
            const clusterId = features[0].properties?.cluster_id;
            const pointCount = features[0].properties?.point_count;
            
            if (clusterId && pointCount <= 8) {
              const source = map.getSource('points') as mapboxgl.GeoJSONSource;
              source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves) => {
                if (!err && leaves) {
                  const points: BrixDataPoint[] = leaves.map(leaf => leaf.properties?.raw ? JSON.parse(leaf.properties.raw) : null).filter(Boolean);
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

          map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
          map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
          
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
  }, [userLocation, spiderfyCluster, clearSpiderfy]);

  // This hook is now for data updates only
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const pointsSource = mapRef.current.getSource('points') as mapboxgl.GeoJSONSource;
    if (pointsSource) {
      pointsSource.setData(toGeoJSON(filteredData));
    }
  }, [isMapLoaded, filteredData, toGeoJSON]);


  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      <Button 
          variant="secondary"
          className="absolute top-4 right-4 z-40 shadow-md"
          onClick={recenterMap}
      >
        <LocateIcon className="w-4 h-4 mr-2" /> Recenter Map
      </Button>

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
                Click to {clusterPreview.points.length <= 8 ? 'expand' : 'zoom in'}
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