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

export default function LeaderboardPage() {
  const { user } = useAuth();

  // Structured location filter
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

  // Leaderboard data
  const [brands, setBrands] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Initialize location from user data
  useEffect(() => {
    const initializeLocation = async () => {
      if (!user?.country) {
        setIsInitializing(false);
        return;
      }

      try {
        // Get all countries to find the country code
        const countries = await locationService.getCountries();
        const userCountry = countries.find(c => 
          c.name.toLowerCase() === user.country.toLowerCase()
        );

        if (!userCountry) {
          console.warn("User's country not found in location service:", user.country);
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
            const userState = states.find(s => 
              s.name.toLowerCase() === user.state.toLowerCase()
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
          stateCode: stateCode,
          city: user.city || "",
        });

      } catch (error) {
        console.error("Error initializing user location:", error);
        // Fallback to basic user data
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

  // Fetch leaderboards when filters change (but only after initialization)
  useEffect(() => {
    if (isInitializing) return;

    const run = async () => {
      // Start with the user's preferred filters
      let filters = {
        country: location.country,
        state: location.state,
        city: location.city,
        crop,
      };
      
      console.log("🔍 Fetching leaderboards with filters:", filters);
      
      let [b, l, s] = await Promise.all([
        fetchBrandLeaderboard(filters),
        fetchLocationLeaderboard(filters),
        fetchUserLeaderboard(filters),
      ]);

      // If no data found with city filter, try without city
      if ((!b?.length && !l?.length && !s?.length) && filters.city) {
        console.log("📍 No data found for city, trying state-level data...");
        filters = { ...filters, city: "" };
        
        [b, l, s] = await Promise.all([
          fetchBrandLeaderboard(filters),
          fetchLocationLeaderboard(filters),
          fetchUserLeaderboard(filters), 
        ]);
        
        if (b?.length || l?.length || s?.length) {
          setDataScope(`Showing data for ${filters.state}, ${filters.country} (no data available for ${location.city})`);
        }
      }

      // If still no data, try country-level
      if ((!b?.length && !l?.length && !s?.length) && filters.state) {
        console.log("🌎 No data found for state, trying country-level data...");
        filters = { ...filters, state: "" };
        
        [b, l, s] = await Promise.all([
          fetchBrandLeaderboard(filters),
          fetchLocationLeaderboard(filters),
          fetchUserLeaderboard(filters), // Changed from fetchSubmissionCountLeaderboard
        ]);
        
        if (b?.length || l?.length || s?.length) {
          setDataScope(`Showing data for ${filters.country} (no data available for ${location.state})`);
        }
      }

      // If still no data, get all data (no location filters)
      if (!b?.length && !l?.length && !s?.length) {
        console.log("🌍 No data found for country, showing all data...");
        filters = { country: undefined, state: undefined, city: undefined, crop };
        
        [b, l, s] = await Promise.all([
          fetchBrandLeaderboard(filters),
          fetchLocationLeaderboard(filters),
          fetchUserLeaderboard(filters), // Changed from fetchSubmissionCountLeaderboard
        ]);
        
        if (b?.length || l?.length || s?.length) {
          setDataScope(`Showing global data (no data available for ${location.country})`);
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
          {/* Data scope indicator */}
          {dataScope && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                📊 {dataScope}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2">Best Locations</h2>
                {locations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  <ul className="space-y-1">
                    {locations.map((loc, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{loc.location_name}</span>
                        <span className="text-gray-600"> ({loc.average_normalized_score?.toFixed(2)})</span>
                        {loc.city && loc.state && (
                          <span className="text-gray-500 text-xs block">{loc.city}, {loc.state}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2">Best Brands</h2>
                {brands.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  <ul className="space-y-1">
                    {brands.map((brand, i) => (
                      <li key={i} className="text-sm">
                        {brand.brand_label || brand.brand_name} (
                        {brand.average_normalized_score?.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-2">Most Submissions</h2>
                {submissions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No data available</p>
                ) : (
                  <ul className="space-y-1">
                    {submissions.map((s, i) => (
                      <li key={i} className="text-sm">
                        {s.entity_name} ({s.submission_count})
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal if location not set */}
      {!user?.country && <LocationModal />}
    </div>
  );
}