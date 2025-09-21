import { useEffect, useState } from "react";
import { fetchBrandLeaderboard, fetchCropLeaderboard, fetchLocationLeaderboard } from "@/lib/fetchLeaderboards";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import LocationModal from "@/components/common/LocationModal";

export default function LeaderboardPage() {
  const { user } = useAuth();

  // Filters default to user's location
  const [country, setCountry] = useState(user?.country || "");
  const [state, setState] = useState(user?.state || "");
  const [city, setCity] = useState(user?.city || "");

  const [brands, setBrands] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // refetch whenever filters change
  useEffect(() => {
    const run = async () => {
      const [b, c, l] = await Promise.all([
        fetchBrandLeaderboard({ country, state, city }),
        fetchCropLeaderboard({ country, state, city }),
        fetchLocationLeaderboard({ country, state, city }),
      ]);
      setBrands(b || []);
      setCrops(c || []);
      setLocations(l || []);
    };
    run();
  }, [country, state, city]);

  return (
    <div className="flex h-full">
      {/* Sidebar Filters */}
      <aside className="w-64 border-r p-4 space-y-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
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
      </aside>

      {/* Leaderboards */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Best Locations</h2>
            <ul className="space-y-1">
              {locations.map((loc, i) => (
                <li key={i}>{loc.name} ({loc.score})</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Best Brands</h2>
            <ul className="space-y-1">
              {brands.map((brand, i) => (
                <li key={i}>{brand.name} ({brand.score})</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Most Submissions</h2>
            <ul className="space-y-1">
              {crops.map((crop, i) => (
                <li key={i}>{crop.name} ({crop.score})</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>

      {/* Modal if location not set */}
      {!user?.country && <LocationModal />}
    </div>
  );
}
