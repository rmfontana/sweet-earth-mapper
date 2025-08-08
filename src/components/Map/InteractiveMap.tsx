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

interface InteractiveMapProps {
  userLocation?: { lat: number; lng: number } | null;
  showFilters: boolean;
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

const InteractiveMap: React.FC<InteractiveMapProps> = ({ userLocation, showFilters }) => {
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
    
    // Use shared filter logic
    let filtered = applyFilters(allData, filters, isAdmin);
    
    // Apply nearby filter separately since it requires userLocation
    if (filters.nearbyOnly && userLocation) {
      filtered = filtered.filter((point) => {
        if (!point.latitude || !point.longitude || isNaN(point.latitude) || isNaN(point.longitude)) {
          return false;
        }
        
        const distance = getDistanceInMiles(userLocation.lat, userLocation.lng, point.latitude, point.longitude);
        return distance <= 1; // 1 mile radius
      });
    }

    console.log('Filtered results:', filtered.length, 'submissions');
    setFilteredData(filtered);
  }, [filters, allData, userLocation, isAdmin]);

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
  
  const getDistanceInMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getBrixColor = (brix: number) => {
    if (brix < 10) return '#ef4444';
    if (brix < 15) return '#f97316';
    if (brix < 20) return '#eab308';
    return '#22c55e';
  };

  // Spiderfy cluster function
  const spiderfyCluster = (centerCoords: [number, number], points: BrixDataPoint[], map: mapboxgl.Map) => {
    // Clear any existing spiderfied points
    setSpiderfiedPoints([]);
    
    if (map.getSource('spider-points')) {
      map.removeLayer('spider-lines');
      map.removeLayer('spider-points');
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
          color: getBrixColor(point.brixLevel),
          raw: JSON.stringify(point),
          cropType: point.cropType,
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

    // Add spider points
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

    // Add click handler for spider points
    map.on('click', 'spider-points', (e) => {
      const feature = e.features?.[0];
      if (feature?.properties?.raw) {
        const point = JSON.parse(feature.properties.raw);
        setSelectedPoint(point);
      }
    });

    // Add hover effects for spider points
    map.on('mouseenter', 'spider-points', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'spider-points', () => {
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
      map.removeLayer('spider-points');
      map.removeSource('spider-points');
      map.removeSource('spider-lines');
    }
    setSpiderfiedPoints([]);
  };

  // Initialize Mapbox map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    async function initializeMap() {
      console.log('Initializing Mapbox map...');
      const token = await getMapboxToken();
      if (!token) {
        console.error('Failed to retrieve Mapbox token');
        return;
      }

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
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

    return () => {
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

    if (map.getSource('points')) {
      console.log('Updating existing source with', filteredData.length, 'points');
      (map.getSource('points') as mapboxgl.GeoJSONSource).setData(toGeoJSON(filteredData));
      
      // Fit map to show all data points
      if (filteredData.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        filteredData.forEach(point => {
          if (point.latitude && point.longitude) {
            bounds.extend([point.longitude, point.latitude]);
          }
        });
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
      return;
    }

    console.log('Adding source and layers with', filteredData.length, 'points');
    map.addSource('points', {
      type: 'geojson',
      data: toGeoJSON(filteredData),
      cluster: true,
      clusterMaxZoom: 13, // Lower for better UX - individual points show sooner
      clusterRadius: 35, // Smaller radius for less aggressive clustering
      //clusterProperties: {
      //  'avg_brix': ['/', ['+', ['get', 'brix']], ['get', 'point_count']],
      //  'crop_types': ['case', ['>', ['get', 'point_count'], 1], 'mixed', ['get', 'cropType']]
      //}
    });

    // Enhanced cluster styling with better visual hierarchy
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
            zoom: Math.min(zoom || currentZoom + 2, 13), // Cap at zoom 13 for spiderfying
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
      
      if (clusterId && pointCount <= 8) {  // Only show preview for smaller clusters
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

    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features?.[0];
      const point = feature?.properties?.raw && JSON.parse(feature.properties.raw);
      if (point) setSelectedPoint(point);
    });

    // Enhanced hover effects
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });

    // Clear spiderfied points when clicking elsewhere on map
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
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

  // Pan & zoom to userLocation when it changes
  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [userLocation]);

  // Add or update 1-mile radius circle around userLocation
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (userLocation) {
      const center: [number, number] = [userLocation.lng, userLocation.lat];
      const radiusMeters = 1609 * 5; // 1 mile * 5 = 5 miles radius total

      const circleGeoJSON = createCircleGeoJSON(center, radiusMeters);

      if (map.getSource('user-radius')) {
        (map.getSource('user-radius') as mapboxgl.GeoJSONSource).setData(circleGeoJSON);
      } else {
        map.addSource('user-radius', {
          type: 'geojson',
          data: circleGeoJSON,
        });

        map.addLayer({
          id: 'user-radius-fill',
          type: 'fill',
          source: 'user-radius',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2,
          },
        });

        map.addLayer({
          id: 'user-radius-outline',
          type: 'line',
          source: 'user-radius',
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
          },
        });
      }
    } else {
      if (map.getLayer('user-radius-fill')) map.removeLayer('user-radius-fill');
      if (map.getLayer('user-radius-outline')) map.removeLayer('user-radius-outline');
      if (map.getSource('user-radius')) map.removeSource('user-radius');
    }

    function createCircleGeoJSON(center: [number, number], radiusInMeters: number): Feature<Polygon> {
      const points = 64;
      const coords: [number, number][] = [];
      const earthRadius = 6371000; // meters
      const lat = center[1] * (Math.PI / 180);
      const lng = center[0] * (Math.PI / 180);
      const d = radiusInMeters / earthRadius;

      for (let i = 0; i < points; i++) {
        const bearing = (i * 360) / points * (Math.PI / 180);
        const latRadians = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing));
        const lngRadians = lng + Math.atan2(
          Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
          Math.cos(d) - Math.sin(lat) * Math.sin(latRadians)
        );
        coords.push([lngRadians * (180 / Math.PI), latRadians * (180 / Math.PI)]);
      }
      coords.push(coords[0]);

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
        properties: {},
      };
    }
  }, [userLocation]);

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
          color: getBrixColor(point.brixLevel),
          raw: JSON.stringify(point),
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

      {/* Cluster Preview Tooltip */}
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
                  <Badge className="text-white" style={{ backgroundColor: getBrixColor(selectedPoint.brixLevel) }}>
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
