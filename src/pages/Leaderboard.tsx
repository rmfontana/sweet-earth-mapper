import React, { useEffect, useState } from "react";
import Header from "../components/Layout/Header";
import {
  fetchBrandLeaderboard,
  fetchLocationLeaderboard,
  fetchUserLeaderboard,
} from "@/lib/fetchLeaderboards";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import LocationModal from "@/components/common/LocationModal";
import { fetchCropTypes, CropType } from "@/lib/fetchCropTypes";
import LocationSelector from "@/components/common/LocationSelector";
import { locationService } from "@/lib/locationServiceforRegister";
import { Badge } from "@/components/ui/badge";
import { useBrixColorFromContext } from "@/lib/getBrixColor";

// Leaderboard item renderer
function LeaderboardItem({
  item,
  index,
  type,
}: {
  item: any;
  index: number;
  type: "location" | "brand" | "user";
}) {
  const score =
    type === "user"
      ? item.submission_count
      : item.average_normalized_score ?? 0;

  const colorClass = useBrixColorFromContext(
    type === "brand" ? "brand" : type,
    score
  );

  return (
    <div className="flex items-center justify-between p-2 border-b last:border-none">
      {/* Rank Badge */}
      <Badge className={`${colorClass} text-white font-bold rounded-full w-8 h-8 flex items-center justify-center`}>
        {index + 1}
      </Badge>

      {/* Main Info */}
      <div className="flex-1 ml-3">
        <div className="font-medium">
          {type === "location" && item.location_name}
          {type === "brand" && (item.brand_label || item.brand_name)}
          {type === "user" && item.entity_name}
        </div>
        <div className="text-xs text-gray-500">
          {type === "location" &&
            (item.city && item.state ? `${item.city}, ${item.state}` : "")}
          {type === "user" && `${score} submissions`}
        </div>
      </div>

      {/* Score Badge (not for users) */}
      {type !== "user" && (
        <Badge className="bg-gray-100 text-gray-800 font-semibold px-2 py-1 rounded-md">
          {score?.toFixed(2)}
        </Badge>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();

  const [location, setLocation] = useState({
    country: "",
    countryCode: "",
    state: "",
    stateCode: "",
    city: "",
  });

  const [crop, setCrop] = useState("");
  const [allCrops, setAllCrops] = useState<CropType[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dataScope, setDataScope] = useState<string>("");

  const [brands, setBrands] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Initialize location from user
  useEffect(() => {
    const initializeLocation = async () => {
      if (!user?.country) {
        setIsInitializing(false);
        return;
      }

      try {
        const countries = await locationService.getCountries();
        const userCountry = countries.find(
          (c) => c.name.toLowerCase() === user.country.toLowerCase()
        );

        if (!userCountry) {
          setLocation({
            country: user.country,
            countryCode: "",
            state: user.state || "",
            stateCode: "",
            city: user.city || "",
          });
          setIsInitializing(false);
          return;
        }

        let stateCode = "";
        if (user.state && userCountry.code) {
          try {
            const states = await locationService.getStates(userCountry.code);
            const userState = states.find(
              (s) => s.name.toLowerCase() === user.state.toLowerCase()
            );
            stateCode = userState?.adminCode1 || "";
          } catch (error) {
            console.warn("Error loading states for user's country:", error);
          }
        }

        setLocation({
          country: userCountry.name,
          countryCode: userCountry.code,
          state: user.state || "",
          stateCode,
          city: user.city || "",
        });
      } catch (error) {
        console.error("Error initializing user location:", error);
        setLocation({
          country: user.country,
          countryCode: "",
          state: user.state || "",
          stateCode: "",
          city: user.city || "",
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeLocation();
  }, [user]);

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

  // Fetch leaderboards
  useEffect(() => {
    if (isInitializing) return;

    const run = async () => {
      let filters: any = {
        country: location.country,
        state: location.state,
        city: location.city,
        crop,
      };

      let [b, l, s] = await Promise.all([
        fetchBrandLeaderboard(filters),
        fetchLocationLeaderboard(filters),
        fetchUserLeaderboard(filters),
      ]);

      // fallback logic
      if ((!b?.length && !l?.length && !s?.length) && filters.city) {
        filters = { ...filters, city: "" };
        [b, l, s] = await Promise.all([
          fetchBrandLeaderboard(filters),
          fetchLocationLeaderboard(filters),
          fetchUserLeaderboard(filters),
        ]);
        if (b?.length || l?.length || s?.length) {
          setDataScope(`Showing data for ${filters.state}, ${filters.country} (no city data)`);
        }
      }

      if ((!b?.length && !l?.length && !s?.length) && filters.state) {
        filters = { ...filters, state: "" };
        [b, l, s] = await Promise.all([
          fetchBrandLeaderboard(filters),
          fetchLocationLeaderboard(filters),
          fetchUserLeaderboard(filters),
        ]);
        if (b?.length || l?.length || s?.length) {
          setDataScope(`Showing data for ${filters.country} (no state data)`);
        }
      }

      if (!b?.length && !l?.length && !s?.length) {
        filters = { country: undefined, state: undefined, city: undefined, crop };
        [b, l, s] = await Promise.all([
          fetchBrandLeaderboard(filters),
          fetchLocationLeaderboard(filters),
          fetchUserLeaderboard(filters),
        ]);
        if (b?.length || l?.length || s?.length) {
          setDataScope("Showing global data");
        }
      } else if (filters.city && filters.state && filters.country) {
        setDataScope(`Showing data for ${filters.city}, ${filters.state}, ${filters.country}`);
      } else if (filters.state && filters.country) {
        setDataScope(`Showing data for ${filters.state}, ${filters.country}`);
      } else if (filters.country) {
        setDataScope(`Showing data for ${filters.country}`);
      } else {
        setDataScope("Showing global data");
      }

      setBrands(b || []);
      setLocations(l || []);
      setSubmissions(s || []);
    };

    run();
  }, [location, crop, isInitializing]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your location...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <main className="flex-1 p-4">
          {dataScope && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">📊 {dataScope}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2">Best Locations</h2>
                {locations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  locations.map((loc, i) => (
                    <LeaderboardItem key={i} item={loc} index={i} type="location" />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2">Best Brands</h2>
                {brands.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  brands.map((brand, i) => (
                    <LeaderboardItem key={i} item={brand} index={i} type="brand" />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2">Most Submissions</h2>
                {submissions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  submissions.map((s, i) => (
                    <LeaderboardItem key={i} item={s} index={i} type="user" />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {!user?.country && <LocationModal />}
    </div>
  );
}