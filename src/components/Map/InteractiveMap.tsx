import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BrixDataPoint } from '../../types';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, User, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSupabaseUrl, getPublishableKey } from "@/lib/utils.ts";
import type { Feature, Polygon } from 'geojson';

interface InteractiveMapProps {
  filters?: {
    cropTypes: string[];
    brixRange: [number, number];
    dateRange: [string, string];
    verifiedOnly: boolean;
    submittedBy: string;
    nearbyOnly?: boolean;
  };
  userLocation?: { lat: number; lng: number } | null;
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

const InteractiveMap: React.FC<InteractiveMapProps> = ({ filters, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [allData, setAllData] = useState<BrixDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<BrixDataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

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
    if (!filters) {
      console.log('No filters applied, showing all data:', allData.length);
      setFilteredData(allData);
      return;
    }

    console.log('Applying filters to', allData.length, 'submissions');
    const result = allData.filter((point) => {
      if (!point.latitude || !point.longitude || isNaN(point.latitude) || isNaN(point.longitude)) {
        console.warn('Filtering out point with invalid coordinates:', point.id);
        return false;
      }

      if (filters.cropTypes.length && !filters.cropTypes.includes(point.cropType)) return false;
      if (point.brixLevel < filters.brixRange[0] || point.brixLevel > filters.brixRange[1]) return false;
      if (filters.dateRange[0] && new Date(point.submittedAt) < new Date(filters.dateRange[0])) return false;
      if (filters.dateRange[1] && new Date(point.submittedAt) > new Date(filters.dateRange[1])) return false;
      if (filters.verifiedOnly && !point.verified) return false;
      if (filters.submittedBy && !point.submittedBy.toLowerCase().includes(filters.submittedBy.toLowerCase())) return false;
      if (
        filters.nearbyOnly &&
        userLocation &&
        getDistanceInMiles(userLocation.lat, userLocation.lng, point.latitude, point.longitude) > 1
      )
        return false;
      return true;
    });

    console.log('Filtered results:', result.length, 'submissions');
    setFilteredData(result);
  }, [filters, allData, userLocation]);

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
      return;
    }

    console.log('Adding source and layers with', filteredData.length, 'points');
    map.addSource('points', {
      type: 'geojson',
      data: toGeoJSON(filteredData),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'points',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#6366f1',
        'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'points',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
      },
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'points',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 12,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#00000088',
        'circle-opacity': 0.9,
      },
    });

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource('points') as mapboxgl.GeoJSONSource;
    
      if (!clusterId) return;
    
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        if (features[0].geometry.type === 'Point') {
          const coords = features[0].geometry.coordinates as [number, number];
          map.easeTo({ center: coords, zoom });
        }
      });
    });
    

    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features?.[0];
      const point = feature?.properties?.raw && JSON.parse(feature.properties.raw);
      if (point) setSelectedPoint(point);
    });

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
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
      const radiusMeters = 1609;

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
