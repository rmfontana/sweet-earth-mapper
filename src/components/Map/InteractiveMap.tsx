import React, { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { BrixDataPoint } from "../../types"
import { fetchFormattedSubmissions } from "../../lib/fetchSubmissions"
import { useFilters } from "../../contexts/FilterContext"
import { applyFilters } from "../../lib/filterUtils"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { MapPin, X } from "lucide-react"
import { useLocation } from "react-router-dom"
import { getMapboxToken } from "@/lib/getMapboxToken"
import { useCropThresholds } from "../../contexts/CropThresholdContext"
import {
  fetchLocationLeaderboard,
  fetchCropLeaderboard,
  fetchBrandLeaderboard,
  LeaderboardEntry,
  type Filter,
} from "../../lib/fetchLeaderboards"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { BottomSheet } from "../ui/bottom-sheet"

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number }
  nearMeTriggered?: boolean
  onNearMeHandled?: () => void
}

type SelectedView =
  | {
      type: "crop" | "brand"
      id: string
      label: string
    }
  | null

const safeStr = (v?: any) => (v === null || v === undefined ? "" : String(v))

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  nearMeTriggered,
  onNearMeHandled,
}) => {
  const location = useLocation()
  const { highlightedPoint } = (location.state || {}) as any
  const { filters, isAdmin } = useFilters()

  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [allData, setAllData] = useState<BrixDataPoint[]>([])
  const [filteredData, setFilteredData] = useState<BrixDataPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<BrixDataPoint | null>(null)

  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [locationLeaderboard, setLocationLeaderboard] = useState<LeaderboardEntry[]>([])
  const [cropLeaderboard, setCropLeaderboard] = useState<LeaderboardEntry[]>([])
  const [brandLeaderboard, setBrandLeaderboard] = useState<LeaderboardEntry[]>([])

  const { loading: thresholdsLoading } = useCropThresholds()

  // --- Data fetching ---
  useEffect(() => {
    fetchFormattedSubmissions()
      .then((data) => setAllData(data || []))
      .catch((error) => {
        console.error("Error fetching submissions:", error)
        setAllData([])
      })
  }, [])

  useEffect(() => {
    try {
      setFilteredData(applyFilters(allData, filters, isAdmin))
    } catch (err) {
      console.error("Error applying filters:", err)
      setFilteredData(allData)
    }
  }, [filters, allData, isAdmin])

  // --- Map setup ---
  useEffect(() => {
    if (nearMeTriggered && userLocation && mapRef.current) {
      mapRef.current.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14,
        duration: 1000,
      })
      onNearMeHandled?.()
    }
  }, [nearMeTriggered, userLocation, onNearMeHandled])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    let mounted = true
    ;(async function init() {
      const token = await getMapboxToken()
      if (!token) {
        console.error("Failed to retrieve Mapbox token. Map will not initialize.")
        return
      }
      mapboxgl.accessToken = token
      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-v9",
        center: [userLocation.lng, userLocation.lat],
        zoom: 10,
      })
      mapRef.current = map
      map.on("load", () => mounted && setIsMapLoaded(true))
      map.on("error", (e) => console.error("Mapbox error:", e.error))
    })()
    return () => {
      mounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        setIsMapLoaded(false)
      }
    }
  }, [userLocation])

  useEffect(() => {
    if (highlightedPoint && mapRef.current) {
      const point = allData.find((d) => d.id === highlightedPoint.id)
      if (point?.latitude && point?.longitude) {
        mapRef.current.easeTo({
          center: [point.longitude, point.latitude],
          zoom: 16,
          duration: 1000,
        })
        setSelectedPoint(point)
      }
    }
  }, [highlightedPoint, allData])

  // --- Leaderboards ---
  useEffect(() => {
    if (!selectedPoint) {
      setLocationLeaderboard([])
      setCropLeaderboard([])
      setBrandLeaderboard([])
      return
    }
    setIsLoading(true)
    const localFilters: Filter = {
      city: selectedPoint.city ?? undefined,
      state: selectedPoint.state ?? undefined,
      country: selectedPoint.country ?? undefined,
    }
    Promise.all([
      fetchLocationLeaderboard(localFilters),
      fetchCropLeaderboard(localFilters),
      fetchBrandLeaderboard(localFilters),
    ])
      .then(([loc, crop, brand]) => {
        setLocationLeaderboard(loc || [])
        setCropLeaderboard(crop || [])
        setBrandLeaderboard(brand || [])
      })
      .catch((err) => {
        console.error("Error fetching leaderboard:", err)
        setLocationLeaderboard([])
        setCropLeaderboard([])
        setBrandLeaderboard([])
      })
      .finally(() => setIsLoading(false))
  }, [selectedPoint, filters])

  // --- UI Helpers ---
  const renderLeaderboard = () => {
    if (!selectedPoint) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <MapPin className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-xl font-semibold text-gray-700">Ready to Explore?</p>
          <p className="text-sm text-gray-500 mt-2">
            <span className="md:hidden">Tap a marker to view rankings.</span>
            <span className="hidden md:inline">Click a marker to view rankings and details.</span>
          </p>
        </div>
      )
    }
    if (isLoading || thresholdsLoading) {
      return <div className="p-4 text-center">Loading leaderboards...</div>
    }
    return (
      <Tabs defaultValue="crop" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-3">
          <TabsTrigger value="crop">Crops</TabsTrigger>
          <TabsTrigger value="brand">Brands</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="crop">
          {cropLeaderboard.length ? (
            <ul className="divide-y">
              {cropLeaderboard.map((entry, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span>{entry.label}</span>
                  <span className="font-medium">{entry.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No crop data available</p>
          )}
        </TabsContent>
        <TabsContent value="brand">
          {brandLeaderboard.length ? (
            <ul className="divide-y">
              {brandLeaderboard.map((entry, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span>{entry.label}</span>
                  <span className="font-medium">{entry.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No brand data available</p>
          )}
        </TabsContent>
        <TabsContent value="submissions">
          {locationLeaderboard.length ? (
            <ul className="divide-y">
              {locationLeaderboard.map((entry, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span>{entry.label}</span>
                  <span className="font-medium">{entry.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No submissions available</p>
          )}
        </TabsContent>
      </Tabs>
    )
  }

  const locTitle =
    selectedPoint?.locationName ?? safeStr((selectedPoint as any)?.place_label ?? "")
  const subtitle = selectedPoint
    ? [
        selectedPoint.streetAddress,
        selectedPoint.city,
        selectedPoint.state,
      ]
        .filter(Boolean)
        .join(", ")
    : undefined

  return (
    <div className="relative w-full h-full flex flex-row">
      <div ref={mapContainer} className="absolute inset-0 rounded-md shadow-md" />

      {/* --- Mobile Bottom Sheet --- */}
      <div className="md:hidden">
        {selectedPoint && (
          <BottomSheet initialSnap="half">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{locTitle}</h3>
                  {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
                <Button onClick={() => setSelectedPoint(null)} variant="ghost" size="icon">
                  <X size={20} />
                </Button>
              </div>
              {renderLeaderboard()}
            </div>
          </BottomSheet>
        )}
      </div>

      {/* --- Desktop Right Panel --- */}
      <Card className="hidden md:flex absolute inset-y-0 right-0 w-80 bg-white rounded-l-lg shadow-2xl z-50 flex-col h-full">
        <CardHeader className="p-4 flex-shrink-0 flex flex-row items-start justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold truncate">{locTitle}</CardTitle>
            {subtitle && <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>}
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
  )
}

export default InteractiveMap