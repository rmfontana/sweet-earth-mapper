import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "../components/Layout/Header";
import LocationSelector from "../components/common/LocationSelector";
import { fetchCropTypes, CropType } from "../lib/fetchCropTypes";
import {
  fetchLocationLeaderboard,
  fetchBrandLeaderboard,
  fetchUserLeaderboard,
  LeaderboardEntry,
} from "../lib/fetchLeaderboards";
import {
  computeNormalizedScore,
  rankColorFromNormalized,
} from "../lib/getBrixColor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { locationService } from "../lib/locationServiceforRegister";

const emptyLocation = {
  country: "",
  countryCode: "",
  state: "",
  stateCode: "",
  city: "",
};

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [location, setLocation] = useState(() => ({
    ...emptyLocation,
    country: user?.country || "",
    state: user?.state || "",
    city: user?.city || "",
  }));
  const [crop, setCrop] = useState("");
  const [allCrops, setAllCrops] = useState<CropType[]>([]);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dataScopeMessage, setDataScopeMessage] = useState<string>("");

  const [locationData, setLocationData] = useState<LeaderboardEntry[]>([]);
  const [brandData, setBrandData] = useState<LeaderboardEntry[]>([]);
  const [userData, setUserData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Computed loading state for full page
  const isPageLoading = isInitializing || loading || cropsLoading;

  // Initialize codes for LocationSelector
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!user?.country) {
        if (mounted) setIsInitializing(false);
        return;
      }

      try {
        const countries = await locationService.getCountries();
        const userCountry = countries.find(
          (c) => c.name.toLowerCase() === user.country!.toLowerCase()
        );
        let countryCode = userCountry?.code || "";

        let stateCode = "";
        if (countryCode && user.state) {
          try {
            const states = await locationService.getStates(countryCode);
            const userState = states.find(
              (s) => s.name.toLowerCase() === user.state!.toLowerCase()
            );
            stateCode = userState?.adminCode1 || "";
          } catch (err) {
            console.warn("Error loading states:", err);
          }
        }

        if (mounted) {
          setLocation({
            country: userCountry?.name || user.country,
            countryCode,
            state: user.state || "",
            stateCode,
            city: user.city || "",
          });
        }
      } catch (err) {
        console.error("Error initializing location:", err);
        if (mounted) {
          setLocation((l) => ({
            ...l,
            country: user.country || "",
            state: user.state || "",
            city: user.city || "",
          }));
        }
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Load crop types
  useEffect(() => {
    const load = async () => {
      setCropsLoading(true);
      try {
        const crops = await fetchCropTypes();
        setAllCrops(crops || []);
      } catch (err) {
        console.error("Failed to load crops:", err);
      } finally {
        setCropsLoading(false);
      }
    };
    load();
  }, []);

  // Fetch leaderboards
  useEffect(() => {
    if (isInitializing) return;

    let mounted = true;
    const run = async () => {
      setLoading(true);
      setDataScopeMessage("");
      try {
        let filters = {
          country: location.country || undefined,
          state: location.state || undefined,
          city: location.city || undefined,
          crop,
        };

        let [loc, brand, users] = await Promise.all([
          fetchLocationLeaderboard(filters),
          fetchBrandLeaderboard(filters),
          fetchUserLeaderboard(filters),
        ]);

        // fallback: broaden scope if nothing found
        if (
          mounted &&
          !loc.length &&
          !brand.length &&
          !users.length &&
          filters.city
        ) {
          filters = { ...filters, city: undefined };
          [loc, brand, users] = await Promise.all([
            fetchLocationLeaderboard(filters),
            fetchBrandLeaderboard(filters),
            fetchUserLeaderboard(filters),
          ]);
          if (loc.length || brand.length || users.length) {
            setDataScopeMessage(
              `Showing state-level data for ${filters.state}, ${filters.country} (no data for ${location.city})`
            );
          }
        }

        if (
          mounted &&
          !loc.length &&
          !brand.length &&
          !users.length &&
          filters.state
        ) {
          filters = { ...filters, state: undefined };
          [loc, brand, users] = await Promise.all([
            fetchLocationLeaderboard(filters),
            fetchBrandLeaderboard(filters),
            fetchUserLeaderboard(filters),
          ]);
          if (loc.length || brand.length || users.length) {
            setDataScopeMessage(
              `Showing country-level data for ${filters.country} (no data for ${location.state})`
            );
          }
        }

        if (mounted && !loc.length && !brand.length && !users.length) {
          filters = { country: undefined, state: undefined, city: undefined, crop };
          [loc, brand, users] = await Promise.all([
            fetchLocationLeaderboard(filters),
            fetchBrandLeaderboard(filters),
            fetchUserLeaderboard(filters),
          ]);
          if (loc.length || brand.length || users.length) {
            setDataScopeMessage("Showing global data (no regional data found)");
          }
        }

        if (mounted) {
          setLocationData(loc || []);
          setBrandData(brand || []);
          setUserData(users || []);
        }
      } catch (err) {
        console.error("Error loading leaderboards:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [location, crop, isInitializing]);

  const handleNavigate = (
    entry: any,
    leaderboardType: 'location' | 'brand' | 'user'
  ) => {
    if (leaderboardType === "user") return; // Users not clickable
    
    const filters: Record<string, string> = {};
    
    if (leaderboardType === 'location') {
      // For location leaderboard, use location_label/location_name for store chain
      const placeName = entry.location_label || entry.location_name || entry.place_label || entry.place_name;
      if (placeName) filters.place = placeName;
      if (entry.city) filters.city = entry.city;
      if (entry.state) filters.state = entry.state;
      if (entry.country) filters.country = entry.country;
      if (crop) filters.crop = crop;
    } else if (leaderboardType === 'brand') {
      // For brand leaderboard, use brand_label/brand_name
      const brandName = entry.brand_label || entry.brand_name;
      if (brandName) filters.brand = brandName;
      if (crop) filters.crop = crop;
      if (location?.country) filters.country = location.country;
      if (location?.state) filters.state = location.state;
      if (location?.city) filters.city = location.city;
    }
    
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v && v.trim() !== '')
    ).toString();
    navigate(`/data?${params}`);
  };

  const renderLeaderboardCard = (
    title: string,
    data: LeaderboardEntry[],
    labelKey: string
  ) => {
    return (
      <Card className="w-full shadow-md rounded-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-center">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="text-sm text-gray-500 p-3">Loading…</div>
          ) : data.length === 0 ? (
            <div className="text-sm text-gray-500 p-3">No data available.</div>
          ) : (
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-3 text-xs font-medium text-gray-500 border-b px-4 py-2 bg-gray-50">
                <span className="text-left">
                  {labelKey === "location" ? "Store" : "Name"}
                </span>
                <span className="text-center">Score</span>
                <span className="text-center">Rank</span>
              </div>

              {/* Rows */}
              <div>
                {data.map((entry, idx) => {
                  const label =
                    (entry as any)[`${labelKey}_label`] ||
                    (entry as any)[`${labelKey}_name`] ||
                    (entry as any).user_name ||
                    "Unknown";

                  const score = entry.average_normalized_score ?? null;
                  const normalizedScore =
                    typeof score === "number"
                      ? score
                      : (() => {
                          const avgBrix = entry.average_brix;
                          return typeof avgBrix === "number"
                            ? computeNormalizedScore(avgBrix)
                            : 1.5;
                        })();

                  const rank = entry.rank ?? idx + 1;
                  const prevRank = idx > 0 ? data[idx - 1].rank ?? idx : null;
                  const isTie = prevRank !== null && prevRank === rank;

                  const { bgClass } = rankColorFromNormalized(normalizedScore);

                  return (
                    <div
                      key={(entry as any)[`${labelKey}_id`] ?? label ?? idx}
                      onClick={() =>
                        handleNavigate(
                          entry,
                          labelKey as 'location' | 'brand' | 'user'
                        )
                      }
                      className={`grid grid-cols-3 items-center px-4 py-2 border-b last:border-0 odd:bg-white even:bg-gray-50 hover:bg-gray-100 text-sm ${
                        labelKey !== "user" ? "cursor-pointer" : ""
                      }`}
                    >
                      {/* Left: Label + details */}
                      <div className="flex flex-col min-w-0">
                        <div className="font-medium">{label}</div>
                        {labelKey === "location" && (
                          <div className="text-xs text-gray-500">
                            {(entry as any).city
                              ? `${(entry as any).city}${
                                  (entry as any).state
                                    ? `, ${(entry as any).state}`
                                    : ""
                                }`
                              : ""}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-gray-500 italic">
                          {entry.submission_count ?? 0} submissions
                        </div>
                      </div>

                      {/* Middle: Neutral Score */}
                      <div className="text-center text-gray-800 text-sm">
                        {Number(normalizedScore ?? 0).toFixed(2)}
                      </div>

                      {/* Right: Rank */}
                      <div className="flex flex-col items-center">
                        <span
                          className={`px-3 py-1 text-sm font-semibold rounded-full text-white ${bgClass}`}
                        >
                          {rank}
                        </span>
                        {isTie && (
                          <span className="text-xs text-gray-500 mt-1">
                            (tie)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Show loading spinner during initial loading
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading leaderboards...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Filters */}
          <aside className="w-full md:w-72 border-r md:pr-4">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="space-y-4">
              <LocationSelector
                value={location}
                onChange={setLocation}
                required={false}
                showAutoDetect={false}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Crop</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full rounded border px-2 py-2"
                >
                  <option value="">All crops</option>
                  {allCrops.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setLocation({
                      ...emptyLocation,
                      country: user?.country || "",
                      state: user?.state || "",
                      city: user?.city || "",
                    });
                    setCrop("");
                  }}
                  className="text-sm text-blue-600 hover:underline text-left"
                >
                  Reset to My Location
                </button>
                <button
                  onClick={() => {
                    setLocation({ ...emptyLocation, country: "All countries" });
                    setCrop("");
                  }}
                  className="text-sm text-gray-600 hover:underline text-left"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </aside>

          {/* Right: Leaderboards */}
          <section className="flex-1">
            {dataScopeMessage && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                {dataScopeMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderLeaderboardCard("Top Locations", locationData, "location")}
              {renderLeaderboardCard("Top Brands", brandData, "brand")}
              {renderLeaderboardCard("Top Users", userData, "user")}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LeaderboardPage;