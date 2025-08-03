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

  useEffect(() => {
    fetchFormattedSubmissions()
      .then(setAllData)
      .catch(() => setAllData([]));
  }, []);

  useEffect(() => {
    if (!filters) {
      setFilteredData(allData);
      return;
    }

    const result = allData.filter((point) => {
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

  useEffect(() => {
    async function initializeMap() {
      if (!mapContainer.current || mapRef.current) return;

      const token = await getMapboxToken();
      if (!token) {
        console.error('Failed to retrieve Mapbox token');
        return;
      }

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: userLocation ? [userLocation.lng, userLocation.lat] : [-74.0242, 40.6941],
        zoom: 10,
      });

      mapRef.current = map;

      map.on('load', () => {
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
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });

        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource('points') as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !features[0].geometry) return;
            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom,
            });
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
      });

      // Cleanup function
      return () => {
        map.remove();
        mapRef.current = null;
      };
    }

    initializeMap();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, userLocation]);

  const toGeoJSON = (data: BrixDataPoint[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: data.map((point) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude],
      },
      properties: {
        id: point.id,
        brix: point.brixLevel,
        color: getBrixColor(point.brixLevel),
        raw: JSON.stringify(point),
      },
    })),
  });

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
