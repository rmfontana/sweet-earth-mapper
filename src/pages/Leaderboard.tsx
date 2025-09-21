import React, { useEffect, useState } from "react";
import Header from "../components/Layout/Header";
import {
  fetchBrandLeaderboard,
  fetchCropLeaderboard,
  fetchLocationLeaderboard,
} from "@/lib/fetchLeaderboards";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import LocationModal from "@/components/common/LocationModal";
import { fetchCropTypes, CropType } from "@/lib/fetchCropTypes";

export default function LeaderboardPage() {
  const { user } = useAuth();

  // Filters default to user's location
  const [country, setCountry] = useState(user?.country || "");
  const [state, setState] = useState(user?.state || "");
  const [city, setCity] = useState(user?.city || "");
  const [crop, setCrop] = useState("");

  // Crop types for dropdown
  const [allCrops, setAllCrops] = useState<CropType[]>([]);

  // Leaderboard data
  const [brands, setBrands] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Fetch crop types on mount
  useEffect(() => {
    const loadCrops = async () => {
      try {
        const data = await fetchCropTypes();
        setAllCrops(data || []);
      } catch (err) {
        console.error("❌ Failed to load crop types:", err);
      }
    };
    loadCrops();
  }, []);

  // Fetch leaderboard data when filters change
  useEffect(() => {
    const run = async () => {
      const filters = { country, state, city, crop };
      const [b, c, l] = await Promise.all([
        fetchBrandLeaderboard(filters),
        fetchCropLeaderboard(filters),
        fetchLocationLeaderboard(filters),
      ]);
      setBrands(b || []);
      setCrops(c || []);
      setLocations(l || []);
    };
    run();
  }, [country, state, city, crop]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex flex-1">
        {/* Sidebar Filters */}
        <aside className="w-64 border-r p-4 space-y-4">
          <h2 className="text-lg font-semibold">Filters</h2>

          {/* Country */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded border px-2 py-1"
            />
          </div>

          {/* State + City (only if US) */}
          {country === "US" && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                />
              </div>
            </>
          )}

          {/* Crop dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Crop</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full rounded border px-2 py-1"
            >
              <option value="">All crops</option>
              {allCrops.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.label || c.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Leaderboards */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Best Locations</h2>
              <ul className="space-y-1">
                {locations.map((loc, i) => (
                  <li key={i}>
                    {loc.location_name} (
                    {loc.average_normalized_score?.toFixed(2)})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Best Brands</h2>
              <ul className="space-y-1">
                {brands.map((brand, i) => (
                  <li key={i}>
                    {brand.brand_label || brand.brand_name} (
                    {brand.average_normalized_score?.toFixed(2)})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Top Crops</h2>
              <ul className="space-y-1">
                {crops.map((crop, i) => (
                  <li key={i}>
                    {crop.crop_label || crop.crop_name} (
                    {crop.average_normalized_score?.toFixed(2)})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal if location not set */}
      {!user?.country && <LocationModal />}
    </div>
  );
}
