// src/components/Map/InteractiveMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BrixDataPoint } from '../../types';
import { fetchFormattedSubmissions } from '../../lib/fetchSubmissions';
import { useFilters } from '../../contexts/FilterContext';
import { applyFilters } from '../../lib/filterUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MapPin, X, ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getMapboxToken } from '@/lib/getMapboxToken';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Leaderboard API imports (import the Filter type so TS knows what we pass)
import {
  fetchLocationLeaderboard,
  fetchCropLeaderboard,
  fetchBrandLeaderboard,
  LeaderboardEntry,
  type Filter,
} from '../../lib/fetchLeaderboards';

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number };
  nearMeTriggered?: boolean;
  onNearMeHandled?: () => void;
}

type SelectedView =
  | {
      type: 'crop' | 'brand';
      id: string;
      label: string;
    }
  | null;

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  nearMeTriggered,
  onNearMeHandled,
}) => {
  const location = useLocation();
  const { highlightedPoint } = (location.state || {}) as any;
  const { filters, isAdmin } = useFilters();
  const mapContainer = useRef<HTMLDivElement | null>(null);
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

  const [selectedEntry, setSelectedEntry] = useState<SelectedView>(null);
  const [locationLeaderboard, setLocationLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cropLeaderboard, setCropLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [brandLeaderboard, setBrandLeaderboard] = useState<LeaderboardEntry[]>([]);

  const { cache, loading: thresholdsLoading } = useCropThresholds();

  // Fetch all submissions
  useEffect(() => {
    fetchFormattedSubmissions()
      .then((data) => setAllData(data || []))
      .catch((error) => {
        console.error('Error fetching submissions:', error);
        setAllData([]);
      });
  }, []);

  // Reset grouping/drill state when a store gets selected
  useEffect(() => {
    if (selectedPoint) {
      setGroupBy('crop');
      setSelectedEntry(null);
    }
  }, [selectedPoint]);

  // Compute min/max brix across all data (used as fallback in normalization)
  useEffect(() => {
    if (allData.length > 0) {
      const bVals = allData.map((d) => d.brixLevel).filter((v) => typeof v === 'number');
      if (bVals.length > 0) {
        setMinBrix(Math.min(...bVals));
        setMaxBrix(Math.max(...bVals));
      }
    }
  }, [allData]);

  // Apply client-side filters from FilterContext
  useEffect(() => {
    try {
      setFilteredData(applyFilters(allData, filters, isAdmin));
    } catch (err) {
      console.error('Error applying filters to submissions:', err);
      setFilteredData(allData);
    }
  }, [filters, allData, isAdmin]);

  // "Near Me" centering
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

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let mounted = true;
    async function init() {
      const token = await getMapboxToken();
      if (!token) {
        console.error('Mapbox token missing; map disabled');
        return;
      }
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [userLocation.lng, userLocation.lat],
        zoom: 10,
      });
      mapRef.current = map;
      map.on('load', () => {
        if (!mounted) return;
        setIsMapLoaded(true);
      });
      map.on('error', (e) => console.error('Mapbox error:', e.error));
    }
    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, [userLocation]);

  // If a highlighted point comes from navigation, center on it
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

  // Draw markers for stores (grouped by store/locationName)
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const storeGroups: Record<string, BrixDataPoint[]> = {};
    const averageScores: Record<string, number> = {};

    for (const point of filteredData) {
      if (!point.latitude || !point.longitude || !point.locationName) continue;
      const key = point.locationName;
      if (!storeGroups[key]) storeGroups[key] = [];
      storeGroups[key].push(point);
    }

    Object.entries(storeGroups).forEach(([storeName, points]) => {
      if (points.length === 0) return;

      let totalScore = 0;
      let validCount = 0;

      for (const p of points) {
        const cropType = p.cropType || p.cropLabel || 'unknown';
        const thresholds = cache?.[cropType];

        if (
          thresholds &&
          typeof thresholds.poor === 'number' &&
          typeof thresholds.excellent === 'number' &&
          thresholds.excellent > thresholds.poor
        ) {
          const score = (p.brixLevel - thresholds.poor) / (thresholds.excellent - thresholds.poor) + 1;
          totalScore += score;
          validCount++;
        } else if (maxBrix > minBrix) {
          totalScore += (p.brixLevel - minBrix) / (maxBrix - minBrix) + 1;
          validCount++;
        }
      }

      averageScores[storeName] = validCount > 0 ? totalScore / validCount : 1.5;

      const firstPoint = points[0];
      if (!firstPoint.latitude || !firstPoint.longitude) return;

      const markerColor = getBrixColor(
        averageScores[storeName],
        { poor: 1.0, average: 1.25, good: 1.5, excellent: 1.75 },
        'hex'
      );

      // Build marker DOM
      const markerContainer = document.createElement('div');
      markerContainer.className = 'flex flex-col items-center cursor-pointer';
      const dot = document.createElement('div');
      dot.style.backgroundColor = markerColor;
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.borderRadius = '50%';
      dot.style.border = '2px solid white';
      dot.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
      markerContainer.appendChild(dot);

      const label = document.createElement('div');
      label.innerText = storeName;
      label.style.backgroundColor = 'rgba(0,0,0,0.6)';
      label.style.color = 'white';
      label.style.padding = '2px 8px';
      label.style.borderRadius = '4px';
      label.style.fontSize = '12px';
      label.style.fontWeight = 'bold';
      label.style.whiteSpace = 'nowrap';
      label.style.maxWidth = '100px';
      markerContainer.appendChild(label);

      const marker = new mapboxgl.Marker({ element: markerContainer, anchor: 'bottom' })
        .setLngLat([firstPoint.longitude, firstPoint.latitude])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);

      // Click handler selects that store (we pass first point for drill-down)
      markerContainer.addEventListener('click', () => {
        setSelectedPoint(firstPoint);
      });
    });

    // Deselect point when clicking map (but not marker)
    const mapClickListener = (e: mapboxgl.MapMouseEvent) => {
      const isMarkerClick = markersRef.current.some((m) =>
        m.getElement().contains(e.originalEvent.target as Node)
      );
      if (!isMarkerClick) setSelectedPoint(null);
    };

    mapRef.current.on('click', mapClickListener);
    return () => {
      if (mapRef.current) mapRef.current.off('click', mapClickListener);
    };
  }, [filteredData, isMapLoaded, cache, minBrix, maxBrix]);

  // Fetch leaderboard data for clicked store
useEffect(() => {
  if (!selectedPoint) {
    setLocationLeaderboard([]);
    setCropLeaderboard([]);
    setBrandLeaderboard([]);
    return;
  }

  // Build filters in camelCase
  const localFilters: Filter = {
    city: selectedPoint.city ?? undefined,
    state: selectedPoint.state ?? undefined,
    country: selectedPoint.country ?? undefined,
    // optionally crop if you want to narrow leaderboards:
    // crop: selectedPoint.cropLabel ?? undefined,
  };

  setIsLoading(true);

  Promise.all([
    fetchLocationLeaderboard(localFilters),
    fetchCropLeaderboard(localFilters),
    fetchBrandLeaderboard(localFilters),
  ])
    .then(([loc, crop, brand]) => {
      setLocationLeaderboard(loc || []);
      setCropLeaderboard(crop || []);
      setBrandLeaderboard(brand || []);
    })
    .catch((err) => {
      console.error('Error fetching leaderboard:', err);
      setLocationLeaderboard([]);
      setCropLeaderboard([]);
      setBrandLeaderboard([]);
    })
    .finally(() => setIsLoading(false));
}, [selectedPoint, filters]);

  // Render helper for a single submission row
  const renderSubmissionItem = (sub: BrixDataPoint, key: string) => {
    const cropType = sub.cropType || sub.cropLabel || 'unknown';
    const thresholds = cache?.[cropType];
    const brixPillColor = getBrixColor(
      sub.brixLevel,
      thresholds || {
        poor: minBrix,
        average: (minBrix + maxBrix) / 2,
        good: maxBrix * 0.8,
        excellent: maxBrix,
      },
      'bg'
    );

    return (
      <div key={key} className="flex justify-between items-start py-2">
        <div className="flex flex-col">
          <span className="font-semibold text-base">{sub.cropLabel || 'Unknown Crop'}</span>
          <span className="text-xs text-gray-500 mt-1">
            {sub.brandLabel || 'Unknown Brand'} -{' '}
            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
          </span>
        </div>
        <div className={`flex-shrink-0 min-w-[40px] px-2 py-1 text-center font-bold text-sm text-white rounded-full ${brixPillColor}`}>
          {sub.brixLevel}
        </div>
      </div>
    );
  };

  // Drill-down submissions for selected entry (crop or brand)
  const renderDetailedSubmissions = () => {
    if (!selectedEntry || !selectedPoint) return null;

    const filteredSubmissions = allData
      .filter((d) => {
        const placeId = (d as any).placeId ?? (d as any).place_id;
        return placeId === ((selectedPoint as any).placeId ?? (selectedPoint as any).place_id);
      })
      .filter((d) =>
        selectedEntry.type === 'crop' ? d.cropLabel === selectedEntry.label : d.brandLabel === selectedEntry.label
      );

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-2 pb-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(null)}>
            <ArrowLeft size={20} />
          </Button>
          <h4 className="font-semibold text-base">
            Submissions for {selectedEntry.label} ({filteredSubmissions.length})
          </h4>
        </div>
        <div className="divide-y divide-gray-200 mt-4 overflow-y-auto">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((sub) => renderSubmissionItem(sub, sub.id))
          ) : (
            <div className="text-center text-gray-500 py-4">No submissions found.</div>
          )}
        </div>
      </div>
    );
  };

  // Main leaderboard area shown in the right-hand panel
  const renderLeaderboard = () => {
    if (!selectedPoint) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <MapPin className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-xl font-semibold text-gray-700">Ready to Explore?</p>
          <p className="text-sm text-gray-500 mt-2">
            Click on a marker to view detailed bionutrient rankings and data for that location.
          </p>
        </div>
      );
    }

    if (isLoading || thresholdsLoading) {
      return <div className="p-4 text-center">Loading leaderboards...</div>;
    }

    if (selectedEntry) {
      return renderDetailedSubmissions();
    }

    // Show tabs (All / Crop / Brand)
    return (
      <Tabs defaultValue="crop" value={groupBy} onValueChange={(val) => setGroupBy(val as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="none">All</TabsTrigger>
          <TabsTrigger value="crop">Crop</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
        </TabsList>

        <TabsContent value="none" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2 text-base">
              All Submissions ({allData.filter((d) => (d as any).placeId === (selectedPoint as any).placeId).length})
            </h4>
            <div className="divide-y divide-gray-200">
              {allData
                .filter((d) => (d as any).placeId === (selectedPoint as any).placeId)
                .map((sub) => renderSubmissionItem(sub, sub.id))}
            </div>
          </div>
        </TabsContent>

        {/* Crop & Brand lists — use the leaderboards fetched from RPCs */}
        <TabsContent value="crop" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2 text-base">Top Crops</h4>
            <div className="divide-y divide-gray-100">
              {cropLeaderboard.length === 0 ? (
                <div className="text-sm text-gray-500 p-3">No crop data.</div>
              ) : (
                cropLeaderboard.map((c) => (
                  <div
                    key={c.crop_id ?? c.crop_name}
                    className="p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setSelectedEntry({
                        type: 'crop',
                        id: String(c.crop_id ?? c.crop_name),
                        label: c.crop_label ?? c.crop_name ?? 'Unknown',
                      })
                    }
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{c.crop_label ?? c.crop_name}</div>
                        <div className="text-xs text-gray-500">Submissions: {c.submission_count ?? '-'}</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {(c.average_normalized_score ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-4">
          <div>
            <h4 className="font-semibold mb-2 text-base">Top Brands</h4>
            <div className="divide-y divide-gray-100">
              {brandLeaderboard.length === 0 ? (
                <div className="text-sm text-gray-500 p-3">No brand data.</div>
              ) : (
                brandLeaderboard.map((b) => (
                  <div
                    key={b.brand_id ?? b.brand_name}
                    className="p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setSelectedEntry({
                        type: 'brand',
                        id: String(b.brand_id ?? b.brand_name),
                        label: b.brand_label ?? b.brand_name ?? 'Unknown',
                      })
                    }
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{b.brand_label ?? b.brand_name}</div>
                        <div className="text-xs text-gray-500">Submissions: {b.submission_count ?? '-'}</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {(b.average_normalized_score ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-row">
      <div ref={mapContainer} className="absolute inset-0 rounded-md shadow-md" />
      <Card className="absolute inset-y-0 right-0 w-80 bg-white rounded-l-lg shadow-2xl z-50 flex flex-col h-full">
        <CardHeader className="p-4 flex-shrink-0 flex flex-row items-start justify-between">
          <div>
            {selectedPoint && (
              <>
                <CardTitle className="text-lg font-semibold">{selectedPoint.locationName}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPoint.streetAddress}, {selectedPoint.city}, {selectedPoint.state}
                </p>
              </>
            )}
          </div>
          {selectedPoint && (
            <Button onClick={() => setSelectedPoint(null)} variant="ghost" size="icon" className="p-1">
              <X size={20} />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1 overflow-y-auto">{renderLeaderboard()}</CardContent>
      </Card>
    </div>
  );
};

export default InteractiveMap;