// src/pages/LeaderboardPage.tsx
import React, { useEffect, useState } from "react";
import {
  fetchLocationLeaderboard,
  fetchCropLeaderboard,
  fetchBrandLeaderboard,
  fetchUserLeaderboard,
  LeaderboardEntry,
} from "../lib/fetchLeaderboards";
import { rankColorFromNormalized } from "../lib/getBrixColor";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const LeaderboardPage: React.FC = () => {
  const [locationData, setLocationData] = useState<LeaderboardEntry[]>([]);
  const [cropData, setCropData] = useState<LeaderboardEntry[]>([]);
  const [brandData, setBrandData] = useState<LeaderboardEntry[]>([]);
  const [userData, setUserData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchLocationLeaderboard(),
      fetchCropLeaderboard(),
      fetchBrandLeaderboard(),
      fetchUserLeaderboard(),
    ])
      .then(([loc, crop, brand, user]) => {
        setLocationData(loc || []);
        setCropData(crop || []);
        setBrandData(brand || []);
        setUserData(user || []);
      })
      .catch((err) => {
        console.error("Error fetching leaderboards:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const renderTable = (
    title: string,
    data: LeaderboardEntry[],
    labelKey: string
  ) => (
    <Card className="w-full shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-gray-500 p-3">
            No leaderboard data for this category.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data.map((entry, idx) => {
              const label =
                (entry as any)[`${labelKey}_label`] ||
                (entry as any)[`${labelKey}_name`] ||
                "Unknown";
              const score = entry.average_normalized_score ?? null;
              const rank = entry.rank ?? idx + 1;

              const { bgClass } = score
                ? rankColorFromNormalized(score)
                : { bgClass: "bg-gray-400" };

              return (
                <div
                  key={entry[`${labelKey}_id`] ?? label}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-sm font-bold text-gray-600 w-6 flex-shrink-0">
                      {rank}
                    </span>
                    <span
                      className="truncate max-w-[200px] font-medium"
                      title={label}
                    >
                      {label}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${bgClass}`}
                  >
                    {score !== null ? score.toFixed(2) : "-"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {loading ? (
        <div className="col-span-full text-center text-gray-500">
          Loading leaderboards...
        </div>
      ) : (
        <>
          {renderTable("Top Locations", locationData, "location")}
          {renderTable("Top Crops", cropData, "crop")}
          {renderTable("Top Brands", brandData, "brand")}
          <Card className="w-full shadow-md rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top Users</CardTitle>
            </CardHeader>
            <CardContent>
              {userData.length === 0 ? (
                <div className="text-sm text-gray-500 p-3">
                  No user leaderboard data.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {userData.map((u, idx) => (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <span className="text-sm font-bold text-gray-600 w-6 flex-shrink-0">
                          {u.rank ?? idx + 1}
                        </span>
                        <span
                          className="truncate max-w-[200px] font-medium"
                          title={u.user_name}
                        >
                          {u.user_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {u.submission_count} submissions
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LeaderboardPage;
