import React, { useEffect, useState } from "react";
import Header from "../components/Layout/Header";
import {
  fetchBrandLeaderboard,
  fetchLocationLeaderboard,
  fetchSubmissionCountLeaderboard,
} from "@/lib/fetchLeaderboards";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import LocationModal from "@/components/common/LocationModal";
import { fetchCropTypes, CropType } from "@/lib/fetchCropTypes";
import LocationSelector from "@/components/common/LocationSelector";

export default function LeaderboardPage() {
  const { user } = useAuth();

  // Structured location filter
  const [location, setLocation] = useState({
    country: user?.country || "",
    countryCode: "",   // from LocationSelector
    state: user?.state || "",
    stateCode: "",
    city: user?.city || "",
  });

  const [crop, setCrop] = useState("");
  const [allCrops, setAllCrops] = useState<CropType[]>([]);

  // Leaderboard data
  const [brands, setBrands] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Load crop types
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

  // Fetch leaderboards when filters change
  useEffect(() => {
    const run = async () => {
      const filters = {
        country: location.country,
        state: location.state,
        city: location.city,
        crop,
      };
      const [b, l, s] = await Promise.all([
        fetchBrandLeaderboard(filters),
        fetchLocationLeaderboard(filters),
        fetchSubmissionCountLeaderboard(filters),
      ]);
      setBrands(b || []);
      setLocations(l || []);
      setSubmissions(s || []);
    };
    run();
  }, [location, crop]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex flex-1">
        {/* Sidebar Filters */}
        <aside className="w-72 border-r p-4 space-y-4">
          <h2 className="text-lg font-semibold">Filters</h2>

          <LocationSelector
            value={location}
            onChange={setLocation}
            required={false}
            showAutoDetect={false}
          />

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
                    {loc.location_name} ({loc.average_normalized_score?.toFixed(2)})
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
              <h2 className="text-lg font-semibold mb-2">Most Submissions</h2>
              <ul className="space-y-1">
                {submissions.map((s, i) => (
                  <li key={i}>
                    {s.entity_name} ({s.submission_count})
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
