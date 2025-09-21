import React, { useEffect, useState } from "react";
import Header from "../components/Layout/Header";
import LocationSelector from "../components/common/LocationSelector";
import { fetchCropTypes, CropType } from "../lib/fetchCropTypes";
import {
  fetchLocationLeaderboard,
  fetchCropLeaderboard,
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
  const [cropData, setCropData] = useState<LeaderboardEntry[]>([]);
  const [brandData, setBrandData] = useState<LeaderboardEntry[]>([]);
  const [userData, setUserData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize countryCode/stateCode using locationService for the LocationSelector component
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
          setLocation((l) => ({ ...l, country: user.country || "", state: user.state || "", city: user.city || "" }));
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
      try {
        const crops = await fetchCropTypes();
        setAllCrops(crops || []);
      } catch (err) {
        console.error("Failed to load crops:", err);
      }
    };
    load();
  }, []);

  // Fetch leaderboards: tries with city -> state -> country -> global fallback
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

        let [loc, cropL, brand, users] = await Promise.all([
          fetchLocationLeaderboard(filters),
          fetchCropLeaderboard(filters),
          fetchBrandLeaderboard(filters),
          fetchUserLeaderboard(filters),
        ]);

        // try broader scopes if nothing returned
        if (mounted && (!loc.length && !cropL.length && !brand.length && !users.length) && filters.city) {
          filters = { ...filters, city: undefined };
          [loc, cropL, brand, users] = await Promise.all([
            fetchLocationLeaderboard(filters),
            fetchCropLeaderboard(filters),
            fetchBrandLeaderboard(filters),
            fetchUserLeaderboard(filters),
          ]);
          if (loc.length || cropL.length || brand.length || users.length) {
            setDataScopeMessage(`Showing state-level data for ${filters.state}, ${filters.country} (no data for ${location.city})`);
          }
        }

        if (mounted && (!loc.length && !cropL.length && !brand.length && !users.length) && filters.state) {
          filters = { ...filters, state: undefined };
          [loc, cropL, brand, users] = await Promise.all([
            fetchLocationLeaderboard(filters),
            fetchCropLeaderboard(filters),
            fetchBrandLeaderboard(filters),
            fetchUserLeaderboard(filters),
          ]);
          if (loc.length || cropL.length || brand.length || users.length) {
            setDataScopeMessage(`Showing country-level data for ${filters.country} (no data for ${location.state})`);
          }
        }

        if (mounted && (!loc.length && !cropL.length && !brand.length && !users.length)) {
          // global
          filters = { country: undefined, state: undefined, city: undefined, crop };
          [loc, cropL, brand, users] = await Promise.all([
            fetchLocationLeaderboard(filters),
            fetchCropLeaderboard(filters),
            fetchBrandLeaderboard(filters),
            fetchUserLeaderboard(filters),
          ]);
          if (loc.length || cropL.length || brand.length || users.length) {
            setDataScopeMessage("Showing global data (no regional data found)");
          }
        }

        if (mounted) {
          setLocationData(loc || []);
          setCropData(cropL || []);
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
            <div className="space-y-2">
              {data.map((entry, idx) => {
                const label =
                  (entry as any)[`${labelKey}_label`] ||
                  (entry as any)[`${labelKey}_name`] ||
                  (entry as any).user_name ||
                  "Unknown";
                // prefer normalized score from RPC; fallback computeNormalizedScore with average_brix and sensible defaults
                const score = entry.average_normalized_score ?? null;
                const normalizedScore =
                  typeof score === "number" ? score : (() => {
                    // try compute if average_brix present
                    const avgBrix = entry.average_brix;
                    if (typeof avgBrix === "number") {
                      // use computeNormalizedScore with undefined thresholds (RPC should have thresholds but this is best-effort)
                      return computeNormalizedScore(avgBrix);
                    }
                    return 1.5;
                  })();

                const rank = entry.rank ?? idx + 1;
                const { bgClass } = rankColorFromNormalized(Number(normalizedScore ?? 1.5));

                return (
                  <div
                    key={(entry as any)[`${labelKey}_id`] ?? label ?? idx}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${bgClass}`}
                        aria-hidden
                      >
                        {rank}
                      </div>
                      <div className="text-sm leading-snug">
                        <div className="font-medium break-words">{label}</div>
                        {/* keep contextual detail if present (city/state for location) */}
                        {labelKey === "location" && (
                          <div className="text-xs text-gray-500">
                            {(entry as any).city ? `${(entry as any).city}${(entry as any).state ? `, ${(entry as any).state}` : ""}` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${bgClass}`}>
                        {Number(normalizedScore ?? 0).toFixed(2)}
                      </div>
                      {labelKey !== "user" && (
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.submission_count ?? 0} submissions
                        </div>
                      )}
                      {labelKey === "user" && (
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.submission_count ?? 0} submissions
                        </div>
                      )}
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
        <div className="flex gap-6">
          {/* Left: Filters */}
          <aside className="w-72 border-r pr-4">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>

            <div className="space-y-4">
              <LocationSelector value={location} onChange={setLocation} required={false} showAutoDetect={true} />
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
              <div>
                <button
                  onClick={() => {
                    setLocation({ ...emptyLocation });
                    setCrop("");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Reset filters
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {renderLeaderboardCard("Top Locations", locationData, "location")}
              {renderLeaderboardCard("Top Crops", cropData, "crop")}
              {renderLeaderboardCard("Top Brands", brandData, "brand")}
              <Card className="w-full shadow-md rounded-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Top Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {userData.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3">No user data.</div>
                  ) : (
                    <div className="space-y-2">
                      {userData.map((u, idx) => {
                        const rank = u.rank ?? idx + 1;
                        const bgClass = rankColorFromNormalized(Number(u.average_normalized_score ?? 1.5)).bgClass;
                        return (
                          <div key={u.user_id ?? idx} className="flex items-center justify-between py-2">
                            <div className="flex items-start space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${bgClass}`}>
                                {rank}
                              </div>
                              <div className="text-sm">
                                <div className="font-medium break-words">{u.user_name}</div>
                                <div className="text-xs text-gray-500">{u.submission_count ?? 0} submissions</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">{u.submission_count ?? 0}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {loading && (
        <div className="fixed bottom-4 right-4 p-3 bg-white border rounded shadow">Updating leaderboards…</div>
      )}
    </div>
  );
};

export default LeaderboardPage;