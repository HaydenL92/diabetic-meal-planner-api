"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";

const API_BASE = "http://localhost:8000";


type USDAFoodSearchResult = {
  fdc_id: number;
  description: string;
  calories_kcal: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
};

type Meal = {
  id: number;
  name: string;
  description: string | null;
  calories_kcal: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  glycemic_index: number | null;
  tags: string | null;
  photo_url: string | null;
};

type MealLog = {
  id: number;
  meal_id: number;
  bg_before: number | null;
  bg_after: number | null;
  timestamp: string;
};

type MealAnalysis = {
  meal_id: number;
  name: string;
  carbs_g: number | null;
  glycemic_index: number | null;
  glycemic_load: number | null;
  impact_category: string;
};

export default function MealsPage() {
  const [token, setToken] = useState<string | null>(null);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [analysis, setAnalysis] = useState<MealAnalysis[]>([]);

  // Create meal form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [glycemicIndex, setGlycemicIndex] = useState("");
  const [tags, setTags] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Meal log form state
  const [selectedMealId, setSelectedMealId] = useState<string>("");
  const [bgBefore, setBgBefore] = useState("");
  const [bgAfter, setBgAfter] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loadingMealCreate, setLoadingMealCreate] = useState(false);
  const [loadingLogCreate, setLoadingLogCreate] = useState(false);

  const [usdaQuery, setUsdaQuery] = useState("");
  const [usdaResults, setUsdaResults] = useState<USDAFoodSearchResult[]>([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [usdaError, setUsdaError] = useState<string | null>(null);

  const [newMeal, setNewMeal] = useState({
  name: "",
  description: "",
  calories_kcal: null as number | null,
  carbs_g: null as number | null,
  protein_g: null as number | null,
  fat_g: null as number | null,
  fiber_g: null as number | null,
  sugar_g: null as number | null,
  glycemic_index: null as number | null,
  tags: "",
  photo_url: "",
});

  // Load token on first render
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("access_token");
    if (saved) {
      setToken(saved);
    }
  }, []);

  function getAuthToken() {
    if (token) return token;
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  async function fetchMeals() {
    const jwt = getAuthToken();
    if (!jwt) {
      setError("Not logged in.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/meals`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Error fetching meals:", data);
        setError("Failed to load meals.");
        return;
      }

      const data = (await res.json()) as Meal[];
      setMeals(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load meals.");
    }
  }

  async function fetchMealAnalysis() {
    const jwt = getAuthToken();
    if (!jwt) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/meals/analysis/all`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Error fetching meal analysis:", data);
        return;
      }

      const data = (await res.json()) as MealAnalysis[];
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function searchUsdaFoods() {
  if (!usdaQuery.trim()) {
    setUsdaError("Please enter a search term.");
    return;
  }

  const token = getAuthToken();
  if (!token) {
    setUsdaError("You must be logged in to search USDA foods.");
    return;
  }

  setUsdaLoading(true);
  setUsdaError(null);

  try {
    const params = new URLSearchParams({
      q: usdaQuery,
      page: "1",
      page_size: "10",
    });

    const resp = await fetch(
      `http://127.0.0.1:8000/food-search/search-foods?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API error ${resp.status}: ${text}`);
    }

    const data = (await resp.json()) as USDAFoodSearchResult[];
    setUsdaResults(data);
  } catch (err: any) {
    console.error(err);
    setUsdaError(err.message ?? "Failed to search foods.");
  } finally {
    setUsdaLoading(false);
  }
}

  async function fetchLogs() {
    const jwt = getAuthToken();
    if (!jwt) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/meals/logs`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Error fetching meal logs:", data);
        return;
      }

      const data = (await res.json()) as MealLog[];
      setLogs(data);
    } catch (err) {
      console.error(err);
    }
  }

  // When we have a token, load meals + logs + analysis
  useEffect(() => {
    if (!token) return;
    fetchMeals();
    fetchLogs();
    fetchMealAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreateMeal(e: FormEvent) {
    e.preventDefault();
    const jwt = getAuthToken();
    if (!jwt) {
      setError("Not logged in.");
      return;
    }

    setLoadingMealCreate(true);
    setError(null);

    const payload = {
      name,
      description: description || null,
      calories_kcal: calories ? parseFloat(calories) : null,
      carbs_g: carbs ? parseFloat(carbs) : null,
      protein_g: protein ? parseFloat(protein) : null,
      fat_g: fat ? parseFloat(fat) : null,
      fiber_g: fiber ? parseFloat(fiber) : null,
      sugar_g: sugar ? parseFloat(sugar) : null,
      glycemic_index: glycemicIndex ? parseFloat(glycemicIndex) : null,
      tags: tags || null,
      photo_url: photoUrl || null,
    };

    try {
      const res = await fetch(`${API_BASE}/meals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Error creating meal:", data);
        setError(
          (data && (data.detail as string)) || "Error creating meal."
        );
      } else {
        // Clear form
        setName("");
        setDescription("");
        setCalories("");
        setCarbs("");
        setProtein("");
        setFat("");
        setFiber("");
        setSugar("");
        setGlycemicIndex("");
        setTags("");
        setPhotoUrl("");

        // Refresh list + analysis
        fetchMeals();
        fetchMealAnalysis();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error creating meal.");
    } finally {
      setLoadingMealCreate(false);
    }
  }

  async function handleCreateLog(e: FormEvent) {
    e.preventDefault();
    const jwt = getAuthToken();
    if (!jwt) {
      setError("Not logged in.");
      return;
    }

    if (!selectedMealId) {
      setError("Please select a meal to log.");
      return;
    }

    setLoadingLogCreate(true);
    setError(null);

    const payload = {
      meal_id: parseInt(selectedMealId, 10),
      bg_before: bgBefore ? parseFloat(bgBefore) : null,
      bg_after: bgAfter ? parseFloat(bgAfter) : null,
    };

    try {
      const res = await fetch(`${API_BASE}/meals/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Error creating meal log:", data);
        setError(
          (data && (data.detail as string)) || "Error logging meal."
        );
      } else {
        // Clear form
        setSelectedMealId("");
        setBgBefore("");
        setBgAfter("");

        // Refresh logs
        fetchLogs();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error logging meal.");
    } finally {
      setLoadingLogCreate(false);
    }
  }

  const isLoggedIn = !!getAuthToken();

  function getMealNameById(id: number): string {
    const meal = meals.find((m) => m.id === id);
    return meal ? meal.name : `Meal #${id}`;
  }

  function getAnalysisForMeal(id: number): MealAnalysis | undefined {
    return analysis.find((a) => a.meal_id === id);
  }

  function useUsdaResult(result: USDAFoodSearchResult) {
  setNewMeal((prev) => ({
    ...prev,
    name: result.description,
    description: result.description,
    calories_kcal: result.calories_kcal,
    carbs_g: result.carbs_g,
    protein_g: result.protein_g,
    fat_g: result.fat_g,
    fiber_g: result.fiber_g,
    sugar_g: result.sugar_g,
    // leave GI/tags/photo as-is so you can fill them in manually
  }));
}

  function impactBadgeClasses(impact: string) {
    switch (impact) {
      case "low":
        return "bg-emerald-900/60 text-emerald-200 border-emerald-500/60";
      case "medium":
        return "bg-amber-900/60 text-amber-200 border-amber-500/60";
      case "high":
        return "bg-red-900/60 text-red-200 border-red-500/60";
      default:
        return "bg-slate-800 text-slate-200 border-slate-600";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Meals</h1>
            <p className="text-sm text-slate-400">
              Define meals with nutrition info, log them, and see their impact on your blood glucose.
            </p>
          </div>
          {!isLoggedIn && (
            <p className="text-xs text-red-400">
              You&apos;re not logged in. Go to the dashboard and log in first.
            </p>
          )}
        </header>

        {error && (
          <div className="mb-3 text-sm text-red-300 bg-red-900/30 border border-red-700 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {/* USDA Food Search */}
<section className="mt-8 bg-slate-900 border border-slate-700 rounded-xl p-4">
  <h2 className="text-lg font-semibold mb-3">
    Search foods (USDA FoodData Central)
  </h2>

  <div className="flex flex-col md:flex-row gap-3 mb-3">
    <input
      type="text"
      className="flex-1 rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm"
      placeholder="Search for a food (e.g. 'apple', 'chicken breast')"
      value={usdaQuery}
      onChange={(e) => setUsdaQuery(e.target.value)}
    />
    <button
      type="button"
      onClick={searchUsdaFoods}
      disabled={usdaLoading}
      className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
    >
      {usdaLoading ? "Searching..." : "Search"}
    </button>
  </div>

  {usdaError && (
    <p className="text-sm text-red-400 mb-2">{usdaError}</p>
  )}

  {usdaResults.length > 0 && (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {usdaResults.map((f) => (
        <div
          key={f.fdc_id}
          className="border border-slate-700 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
        >
          <div>
            <p className="font-medium text-sm">{f.description}</p>
            <p className="text-xs text-slate-300 mt-1">
              {f.calories_kcal ?? "–"} kcal · {f.carbs_g ?? "–"}g carbs ·{" "}
              {f.protein_g ?? "–"}g protein · {f.fat_g ?? "–"}g fat
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Fiber: {f.fiber_g ?? "–"}g · Sugar: {f.sugar_g ?? "–"}g
            </p>
          </div>

          <button
            type="button"
            onClick={() => useUsdaResult(f)}
            className="self-start md:self-auto px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-xs font-medium"
          >
            Use in meal form
          </button>
        </div>
      ))}
    </div>
  )}

  {!usdaLoading && !usdaError && usdaResults.length === 0 && (
    <p className="text-xs text-slate-500">
      Search to see foods from USDA and click o
      ne to fill in the meal form.
    </p>
  )}
</section>

        {/* Create Meal */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-xl font-semibold mb-3">Create a Meal</h2>

          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={handleCreateMeal}
          >
            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Meal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Calories"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Carbs (g)"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Protein (g)"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Fat (g)"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Fiber (g)"
              value={fiber}
              onChange={(e) => setFiber(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Sugar (g)"
              value={sugar}
              onChange={(e) => setSugar(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Glycemic Index"
              value={glycemicIndex}
              onChange={(e) => setGlycemicIndex(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded col-span-1 md:col-span-2"
              placeholder="Photo URL (optional)"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />

            <button
              type="submit"
              disabled={loadingMealCreate || !isLoggedIn}
              className="col-span-1 md:col-span-2 bg-emerald-600 p-2 rounded font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {loadingMealCreate ? "Saving..." : "Create Meal"}
            </button>
          </form>
        </section>

        {/* Log a Meal */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-xl font-semibold mb-3">Log a Meal</h2>

          <form
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            onSubmit={handleCreateLog}
          >
            <select
              className="bg-slate-800 p-2 rounded"
              value={selectedMealId}
              onChange={(e) => setSelectedMealId(e.target.value)}
              required
            >
              <option value="">Select a meal...</option>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="BG before (mg/dL)"
              value={bgBefore}
              onChange={(e) => setBgBefore(e.target.value)}
            />

            <input
              className="bg-slate-800 p-2 rounded"
              placeholder="BG after (mg/dL)"
              value={bgAfter}
              onChange={(e) => setBgAfter(e.target.value)}
            />

            <button
              type="submit"
              disabled={loadingLogCreate || !isLoggedIn}
              className="col-span-1 md:col-span-3 bg-indigo-600 p-2 rounded font-semibold hover:bg-indigo-500 disabled:opacity-50"
            >
              {loadingLogCreate ? "Logging..." : "Save Meal Log"}
            </button>
          </form>
        </section>

        {/* Meal List */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Your Meals</h2>
            <p className="text-xs text-slate-500">
              Impact is based on carbs × glycemic index (glycemic load).
            </p>
          </div>

          {meals.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No meals yet. Create one above.
            </p>
          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meals.map((m) => {
                const a = getAnalysisForMeal(m.id);

                return (
                <Link
                    key={m.id}
                    href={`/meals/${m.id}`}
                    className="block bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-emerald-500 hover:bg-slate-700 transition-colors"
                >
                    <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-lg font-semibold">{m.name}</h3>
                        {m.description && (
                        <p className="text-sm text-slate-300">{m.description}</p>
                        )}
                    </div>

                    {a && (
                        <span
                        className={
                            "text-xs px-2 py-1 rounded-full border " +
                            impactBadgeClasses(a.impact_category)
                        }
                        >
                        {a.impact_category === "unknown"
                            ? "Impact unknown"
                            : `${a.impact_category} impact`}
                        </span>
                    )}
                    </div>

                    {m.photo_url && (
                    <img
                        src={m.photo_url}
                        alt={m.name}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                    )}

                    <p className="text-sm mt-2 text-slate-400">
                    {m.calories_kcal ?? "–"} kcal · {m.carbs_g ?? "–"}g carbs
                    <br />
                    Protein: {m.protein_g ?? "–"}g · Fat: {m.fat_g ?? "–"}g
                    </p>

                    {a && (
                    <p className="text-xs text-slate-300 mt-2">
                        GL:{" "}
                        {a.glycemic_load != null
                        ? a.glycemic_load.toFixed(1)
                        : "–"}{" "}
                        {a.carbs_g != null && a.glycemic_index != null && (
                        <>
                            ({a.carbs_g}g × GI {a.glycemic_index})
                        </>
                        )}
                    </p>
                    )}

                    {m.tags && (
                    <p className="text-xs text-slate-500 mt-2">Tags: {m.tags}</p>
                    )}
                </Link>
                );
            })}
            </div>
          )}
        </section>

        {/* Meal Logs */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-xl font-semibold mb-3">Recent Meal Logs</h2>

          {logs.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No meal logs yet. Log a meal above.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const delta =
                  log.bg_before != null && log.bg_after != null
                    ? log.bg_after - log.bg_before
                    : null;
                const date = new Date(log.timestamp);

                return (
                  <div
                    key={log.id}
                    className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold">
                        {getMealNameById(log.meal_id)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {date.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-sm text-slate-200">
                      <p>
                        BG before:{" "}
                        {log.bg_before != null ? `${log.bg_before} mg/dL` : "–"}
                      </p>
                      <p>
                        BG after:{" "}
                        {log.bg_after != null ? `${log.bg_after} mg/dL` : "–"}
                      </p>
                      {delta != null && (
                        <p
                          className={
                            "text-xs mt-1 " +
                            (delta > 0
                              ? "text-red-300"
                              : delta < 0
                              ? "text-emerald-300"
                              : "text-slate-300")
                          }
                        >
                          Change: {delta > 0 ? "+" : ""}
                          {delta} mg/dL
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
