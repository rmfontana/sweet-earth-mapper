import React, { useEffect, useState } from "react";
import Header from "../components/Layout/Header";
import LocationSelector from "../components/common/LocationSelector";
import { fetchCropTypes, CropType } from "../lib/fetchCropTypes";
import {
  fetchLocationLeaderboard,
  fetchBrandLeaderboard,
  fetchUserLeaderboard,
  LeaderboardEntry,
} from "../lib/fetchLeaderboards";
import { rankColorFromNormalized, computeNormalizedScore } from "../lib/getBrixColor";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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

  const [location, setLocation] = useState(() => ({
    ...emptyLocation,
    country: user?.country || "",
    state: user?.state || "",
    city: user?.city || "",
  }));
  const [crop, setCrop] = useState("");
  const [allCrops, setAllCrops] = useState<CropType[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dataScopeMessage, setDataScopeMessage] = useState<string>("");

  const [locationData, setLocationData] = useState<LeaderboardEntry[]>([]);
  const [brandData, setBrandData] = useState<LeaderboardEntry[]>([]);
  const [userData, setUserData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

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

  // Load crop types (still used in filters)
  useEffect(() => {
    const load = async () => {
      try {
        const crops = await fetchCropTypes();
        setAllCrops(crops || []);
      } catch (err) {
        console.error("Failed to load crops:", err);
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

        console.log("Fetching leaderboards with filters:", filters);

        let [loc, brand, users] = await Promise.all([
          fetchLocationLeaderboard(filters),
          fetchBrandLeaderboard(filters),
          fetchUserLeaderboard(filters),
        ]);

        // fallback: broaden scope if nothing found
        if (mounted && (!loc.length && !brand.length && !users.length) && filters.city) {
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

        if (mounted && (!loc.length && !brand.length && !users.length) && filters.state) {
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

        if (mounted && (!loc.length && !brand.length && !users.length)) {
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

  // Reset to My Location with proper codes
  const handleResetToMyLocation = async () => {
    try {
      const countries = await locationService.getCountries();
      const userCountry = countries.find(
        (c) => c.name.toLowerCase() === user?.country?.toLowerCase()
      );
      const countryCode = userCountry?.code || "";

      let stateCode = "";
      if (countryCode && user?.state) {
        const states = await locationService.getStates(countryCode);
        const userState = states.find(
          (s) => s.name.toLowerCase() === user.state.toLowerCase()
        );
        stateCode = userState?.adminCode1 || "";
      }

      setLocation({
        country: userCountry?.name || user?.country || "",
        countryCode,
        state: user?.state || "",
        stateCode,
        city: user?.city || "",
      });
      setCrop("");
    } catch (err) {
      console.error("Failed to reset location:", err);
    }
  };

  const renderLeaderboardCard = (title: string, data: LeaderboardEntry[], labelKey: string) => {
    return (
      <Card className="w-full shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-sm text-gray-500 p-3">No data available.</div>
          ) : (
            <div className="divide-y">
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
                const { bgClass } = rankColorFromNormalized(Number(normalizedScore ?? 1.5));

                return (
                  <div
                    key={(entry as any)[`${labelKey}_id`] ?? label ?? idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3"
                  >
                    {/* Left: Label + City/State */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base break-words">{label}</div>
                      {labelKey === "location" && (
                        <div className="text-xs text-gray-500">
                          {(entry as any).city
                            ? `${(entry as any).city}${
                                (entry as any).state ? `, ${(entry as any).state}` : ""
                              }`
                            : ""}
                        </div>
                      )}
                    </div>

                    {/* Right: Rank + Score + Submissions */}
                    <div className="flex flex-col items-end mt-2 sm:mt-0 sm:ml-4">
                      {/* Rank circle */}
                      <div
                        className={`text-2xl font-bold ${bgClass} text-white rounded-full w-12 h-12 flex items-center justify-center`}
                      >
                        {rank}
                      </div>

                      {/* Score pill */}
                      <div
                        className={`mt-2 px-3 py-1 rounded-full text-white text-xs font-semibold ${bgClass}`}
                      >
                        {Number(normalizedScore ?? 0).toFixed(2)}
                      </div>

                      {/* Submissions */}
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.submission_count ?? 0} submissions
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Filters */}
          <aside className="w-full lg:w-72 lg:border-r lg:pr-4">
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
                  onClick={handleResetToMyLocation}
                  className="text-sm text-blue-600 hover:underline text-left"
                >
                  Reset to My Location
                </button>
                <button
                  onClick={() => {
                    setLocation({ ...emptyLocation });
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
      {loading && (
        <div className="fixed bottom-4 right-4 p-3 bg-white border rounded shadow">
          Updating leaderboards…
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;