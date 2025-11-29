"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


type LoginResponse = {
  access_token: string;
  token_type: string;
};

type BGReading = {
  id: number;
  value: number;
  context: string | null;
  created_at?: string;
};

type BGStatsToday = {
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  count: number;
};

type BGStatsDaily = {
  date: string; // ISO string from backend
  average: number | null;
  count: number;
};

type BGStats7Days = {
  daily: BGStatsDaily[];
};

type BGVariabilityStats = {
  mean: number | null;
  std_dev: number | null;
  coefficient_of_variation: number | null;
  count: number;
};

type MealSuggestion = {
  meal_id: number;
  name: string;
  glycemic_load: number | null;
  impact_category: string;
  carbs_g: number | null;
  glycemic_index: number | null;
};

type MealRecommendationResponse = {
  bg_now: number;
  bg_category: string;
  explanation: string;
  suggestions: MealSuggestion[];
};


const API_BASE = "http://localhost:8000";

export default function HomePage() {
  const [email, setEmail] = useState("testuser@example.com");
  const [password, setPassword] = useState("StrongPass123");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [bgReadings, setBgReadings] = useState<BGReading[]>([]);
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);

  const [newBgValue, setNewBgValue] = useState<string>("");
  const [newBgContext, setNewBgContext] = useState<string>("pre_meal");
  const [isSavingReading, setIsSavingReading] = useState(false);

  const [todayStats, setTodayStats] = useState<BGStatsToday | null>(null);
  const [stats7d, setStats7d] = useState<BGStats7Days | null>(null);
  const [variability, setVariability] = useState<BGVariabilityStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [recommendations, setRecommendations] = useState<MealRecommendationResponse | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const [healthStatus, setHealthStatus] = useState<string | null>(null);


    const chartData =
    stats7d?.daily.map((d) => ({
      dateLabel: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      average: d.average,
    })) ?? [];

    
  // Load token from localStorage on first render
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("access_token");
    if (saved) {
      setToken(saved);
    }
  }, []);

  // When we have a token, fetch readings
  useEffect(() => {
    if (!token) return;
    fetchBgReadings();
    fetchStats();
    fetchRecommendations();
  }, [token]);

  function getAuthToken() {
    if (token) return token;
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  async function handleLogin(e: FormEvent) {
  e.preventDefault();
  setError(null);
  setIsLoggingIn(true);

  try {
    // Build form-encoded body as required by OAuth2PasswordRequestForm
    const body = new URLSearchParams();
    body.append("username", email);   // backend treats username as email
    body.append("password", password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      // FastAPI usually returns {"detail": "..."} on errors
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : Array.isArray(data?.detail)
          ? data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : "Login failed";
      throw new Error(detail);
    }

    const login = data as LoginResponse;
    setToken(login.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", login.access_token);
    }
  } catch (err: any) {
    setError(err.message || "Login failed");
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
  } finally {
    setIsLoggingIn(false);
  }
}

  async function fetchBgReadings() {
    const jwt = getAuthToken();
    if (!jwt) {
      setError("Not logged in.");
      return;
    }

    setIsLoadingReadings(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/diabetes/bg-readings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        throw new Error(data.detail || "Failed to load readings");
      }

      setBgReadings(data as BGReading[]);
    } catch (err: any) {
      setError(err.message || "Failed to load readings");
    } finally {
      setIsLoadingReadings(false);
    }
  }

  async function fetchRecommendations() {
    const jwt = getAuthToken();
    if (!jwt) return;

    setRecLoading(true);
    setRecError(null);

    try {
      const res = await fetch(`${API_BASE}/diabetes/recommend-meals`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        // If backend returns 400 because no BG readings yet,
        // surface that message nicely.
        const data = await res.json().catch(() => null);
        const detail =
          (data && (data.detail as string)) ||
          "Could not fetch recommendations.";
        setRecError(detail);
        setRecommendations(null);
        return;
      }

      const data = (await res.json()) as MealRecommendationResponse;
      setRecommendations(data);
    } catch (err: any) {
      console.error("Error fetching recommendations", err);
      setRecError(err.message || "Failed to load recommendations.");
    } finally {
      setRecLoading(false);
    }
  }

  async function handleAddReading(e: FormEvent) {
    e.preventDefault();
    const jwt = getAuthToken();
    if (!jwt) {
      setError("Not logged in.");
      return;
    }

    if (!newBgValue) {
      setError("Please enter a BG value.");
      return;
    }

    setIsSavingReading(true);
    setError(null);

    try {
      const body = {
        value: Number(newBgValue),
        context: newBgContext || null,
      };

      const res = await fetch(`${API_BASE}/diabetes/bg-readings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        throw new Error(data.detail || "Failed to create reading");
      }

      setBgReadings((prev) => [data as BGReading, ...prev]);
      setNewBgValue("");
    } catch (err: any) {
      setError(err.message || "Failed to create reading");
    } finally {
      setIsSavingReading(false);
    }
  }

    function bgCategoryLabel(cat: string) {
    switch (cat) {
      case "low":
        return "Low";
      case "in_range":
        return "In range";
      case "mild_high":
        return "Slightly high";
      case "high":
        return "High";
      case "very_high":
        return "Very high";
      default:
        return cat;
    }
  }

  function bgCategoryBadgeClasses(cat: string) {
    switch (cat) {
      case "low":
        return "bg-sky-900/60 text-sky-200 border-sky-500/60";
      case "in_range":
        return "bg-emerald-900/60 text-emerald-200 border-emerald-500/60";
      case "mild_high":
        return "bg-amber-900/60 text-amber-200 border-amber-500/60";
      case "high":
        return "bg-red-900/60 text-red-200 border-red-500/60";
      case "very_high":
        return "bg-rose-900/70 text-rose-200 border-rose-500/70";
      default:
        return "bg-slate-800 text-slate-200 border-slate-600";
    }
  }

  async function fetchStats() {
    const jwt = getAuthToken();
    if (!jwt) return;

    setIsLoadingStats(true);
    setError(null);

    try {
      // Today stats
      {
        const res = await fetch(`${API_BASE}/diabetes/bg-stats/today`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = (await res.json()) as BGStatsToday;
        if (res.ok) {
          setTodayStats(data);
        } else {
          console.error("Error fetching today stats:", data);
        }
      }

      // 7d stats
      {
        const res = await fetch(`${API_BASE}/diabetes/bg-stats/7d`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = (await res.json()) as BGStats7Days;
        if (res.ok) {
          setStats7d(data);
        } else {
          console.error("Error fetching 7d stats:", data);
        }
      }

      // Variability stats
      {
        const res = await fetch(`${API_BASE}/diabetes/bg-stats/variability`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = (await res.json()) as BGVariabilityStats;
        if (res.ok) {
          setVariability(data);
        } else {
          console.error("Error fetching variability stats:", data);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch stats");
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function checkHealth() {
    setError(null);
    setHealthStatus(null);
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setHealthStatus(JSON.stringify(data));
    } catch (err: any) {
      setError(err.message || "Health check failed");
    }
  }

  function handleLogout() {
    setToken(null);
    setBgReadings([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
  }

  const isLoggedIn = !!getAuthToken();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center py-10 px-4">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">
              Diabetic Meal Planner{" "}
              <span className="text-emerald-400">Dashboard</span>
            </h1>
            <p className="text-sm text-slate-400">
              Backend: FastAPI + Postgres · Frontend: Next.js + Tailwind ·
              Authenticated with JWT
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={checkHealth}
              className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg"
            >
              Check /health
            </button>
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="text-xs bg-red-500 hover:bg-red-400 px-3 py-2 rounded-lg text-slate-950 font-semibold"
              >
                Log out
              </button>
            )}
          </div>
        </header>

        {/* Error & health messages */}
        {error && (
          <div className="bg-red-900/40 border border-red-600/60 text-sm text-red-200 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {healthStatus && (
          <div className="bg-emerald-900/30 border border-emerald-500/50 text-xs text-emerald-200 px-3 py-2 rounded-lg">
            Health: {healthStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Login card */}
          <section className="md:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold mb-2">
              {isLoggedIn ? "Logged in" : "Log in"}
            </h2>
            {!isLoggedIn ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1 text-sm">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 transition-colors py-2 text-sm font-semibold text-slate-950"
                >
                  {isLoggingIn ? "Logging in..." : "Log in"}
                </button>
                <p className="text-xs text-slate-500">
                  Make sure this user exists in the API via{" "}
                  <code className="bg-slate-800 rounded px-1">
                    POST /users
                  </code>
                  .
                </p>
              </form>
            ) : (
              <div className="text-sm space-y-2">
                <p className="text-emerald-300">
                  ✅ You are logged in. Token stored in localStorage.
                </p>
                <p className="text-xs text-slate-400 break-all">
                  <span className="font-semibold text-emerald-400">
                    Token:
                  </span>{" "}
                  {getAuthToken()?.slice(0, 40)}...
                </p>
                <button
                  onClick={fetchBgReadings}
                  className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg"
                >
                  Refresh BG readings
                </button>
              </div>
            )}
          </section>

          {/* BG readings & form */}
          <section className="md:col-span-2 flex flex-col gap-4">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-lg font-semibold mb-3">Add BG Reading</h2>
              {isLoggedIn ? (
                <form
                  onSubmit={handleAddReading}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                >
                  <div className="space-y-1 text-sm">
                    <label htmlFor="bg-value">BG value (mg/dL)</label>
                    <input
                      id="bg-value"
                      type="number"
                      inputMode="numeric"
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newBgValue}
                      onChange={(e) => setNewBgValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <label htmlFor="bg-context">Context</label>
                    <select
                      id="bg-context"
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newBgContext}
                      onChange={(e) => setNewBgContext(e.target.value)}
                    >
                      <option value="pre_meal">Pre-meal</option>
                      <option value="post_meal">Post-meal</option>
                      <option value="fasting">Fasting</option>
                      <option value="exercise">Exercise</option>
                      <option value="bedtime">Bedtime</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingReading}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 transition-colors py-2 text-sm font-semibold text-slate-950"
                  >
                    {isSavingReading ? "Saving..." : "Save reading"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-400">
                  Log in to add and view your blood glucose readings.
                </p>
              )}
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Recent BG Readings</h2>
                {isLoadingReadings && (
                  <span className="text-xs text-slate-400">Loading...</span>
                )}
              </div>
              {isLoggedIn ? (
                bgReadings.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No readings yet. Add your first one above.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {bgReadings.slice(0, 10).map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between bg-slate-800/80 border border-slate-700/70 rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold">
                            {r.value}{" "}
                            <span className="text-xs text-slate-400">
                              mg/dL
                            </span>
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.context || "unspecified"}
                          </p>
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="text-sm text-slate-400">
                  Log in to see your blood glucose history.
                </p>
              )}
            </div>
          </section>
        </div>
        {/* Stats summary row */}
        {isLoggedIn && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today stats */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                Today&apos;s BG
              </h3>
              {todayStats && todayStats.count > 0 ? (
                <div className="space-y-1 text-sm">
                  <p>
                    Avg:{" "}
                    <span className="font-semibold text-emerald-400">
                      {todayStats.average?.toFixed(1)} mg/dL
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Range: {todayStats.minimum?.toFixed(0)}–
                    {todayStats.maximum?.toFixed(0)} mg/dL
                  </p>
                  <p className="text-xs text-slate-500">
                    Readings today: {todayStats.count}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No readings recorded for today yet.
                </p>
              )}
            </div>

            {/* 7d stats (simple list for now) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                Last 7 days
              </h3>
              {stats7d && stats7d.daily.length > 0 ? (
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-slate-400">
                    Days with data: {stats7d.daily.length}
                  </p>
                  <ul className="text-xs space-y-1 max-h-28 overflow-y-auto pr-1">
                    {stats7d.daily.map((d) => (
                      <li key={d.date}>
                        <span className="text-slate-300">
                          {new Date(d.date).toLocaleDateString()}
                        </span>
                        {": "}
                        <span className="text-emerald-400">
                          {d.average?.toFixed(1) ?? "–"} mg/dL
                        </span>{" "}
                        <span className="text-slate-500">
                          ({d.count} reading{d.count === 1 ? "" : "s"})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No readings logged in the last 7 days.
                </p>
              )}
            </div>

            {/* Variability stats */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                Variability
              </h3>
              {variability && variability.count > 0 ? (
                <div className="space-y-1 text-sm">
                  <p>
                    Mean:{" "}
                    <span className="font-semibold text-emerald-400">
                      {variability.mean?.toFixed(1)} mg/dL
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Std dev:{" "}
                    {variability.std_dev !== null
                      ? `${variability.std_dev.toFixed(1)} mg/dL`
                      : "–"}
                  </p>
                  <p className="text-xs text-slate-400">
                    CV:{" "}
                    {variability.coefficient_of_variation !== null
                      ? `${(
                          variability.coefficient_of_variation * 100
                        ).toFixed(1)}%`
                      : "–"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Total readings: {variability.count}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Need more readings to compute variability.
                </p>
              )}
            </div>
          </section>
        )}

        {/* 7-day BG trend chart */}
        {isLoggedIn && (
          <section className="mt-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-100">
                7-Day BG Trend
              </h2>
              {isLoadingStats && (
                <span className="text-xs text-slate-400">Loading stats…</span>
              )}
            </div>
            {chartData.length === 0 ? (
              <p className="text-sm text-slate-400">
                No readings yet in the last 7 days to display a trend.
              </p>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="average"
                      dot={true}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}
                {/* Smart meal recommendations */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Suggested meals right now</h2>
              <p className="text-sm text-slate-400">
                Based on your latest blood glucose and the glycemic impact of your saved meals.
              </p>
            </div>

            {recommendations && (
              <div
                className={
                  "text-xs px-2 py-1 rounded-full border " +
                  bgCategoryBadgeClasses(recommendations.bg_category)
                }
              >
                BG {Math.round(recommendations.bg_now)} mg/dL ·{" "}
                {bgCategoryLabel(recommendations.bg_category)}
              </div>
            )}
          </div>

          {recLoading && (
            <p className="text-sm text-slate-400">Loading recommendations...</p>
          )}

          {!recLoading && recError && (
            <p className="text-sm text-amber-300">
              {recError}
            </p>
          )}

          {!recLoading && !recError && recommendations && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {recommendations.explanation}
              </p>

              {recommendations.suggestions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No suitable meals found yet. Try adding meals with carbs and glycemic index on the Meals page.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendations.suggestions.map((s) => (
                    <div
                      key={s.meal_id}
                      className="bg-slate-800 rounded-xl p-3 border border-slate-700"
                    >
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        GL:{" "}
                        {s.glycemic_load != null
                          ? s.glycemic_load.toFixed(1)
                          : "–"}{" "}
                        {s.carbs_g != null && s.glycemic_index != null && (
                          <>
                            ({s.carbs_g}g carbs × GI {s.glycemic_index})
                          </>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Impact: {s.impact_category}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
                {/* Quick link to Meals page */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Meals</h2>
              <p className="text-sm text-slate-400">
                View and manage your meals, see their glycemic impact, and log
                how they affect your blood glucose.
              </p>
            </div>
            <Link
              href="/meals"
              className="inline-flex items-center text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 transition-colors"
            >
              Go to Meals
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
