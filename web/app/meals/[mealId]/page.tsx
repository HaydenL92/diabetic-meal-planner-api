"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

type MealDetail = {
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
  timestamp: string | null;
};

function calcGlycemicLoad(meal: MealDetail): number | null {
  if (meal.carbs_g == null || meal.glycemic_index == null) return null;
  return (meal.carbs_g * meal.glycemic_index) / 100;
}

function impactFromGL(gl: number | null): string {
  if (gl == null) return "unknown";
  if (gl < 10) return "low";
  if (gl < 20) return "medium";
  return "high";
}

function impactBadgeClasses(impact: string): string {
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

export default function MealDetailPage({
  params,
}: {
  params: { mealId: string };
}) {
  const router = useRouter();
  const [meal, setMeal] = useState<MealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    const jwt = getAuthToken();
    if (!jwt) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Try to get the id from params first
    let effectiveMealId = params?.mealId;

    // Fallback: parse the id from the URL (e.g. /meals/4)
    if (!effectiveMealId && typeof window !== "undefined") {
      const segments = window.location.pathname.split("/").filter(Boolean);
      // e.g. ["meals", "4"] → we want "4"
      effectiveMealId = segments[segments.length - 1];
      console.log("Fallback mealId from URL:", effectiveMealId);
    }

    if (!effectiveMealId) {
      setError("Missing meal id");
      setLoading(false);
      return;
    }

    async function fetchMeal() {
      try {
        const res = await fetch(`${API_BASE}/meals/${effectiveMealId}`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const detail =
            (data && (data.detail as string)) || "Failed to load meal.";
          setError(detail);
          setLoading(false);
          return;
        }

        const data = (await res.json()) as MealDetail;
        setMeal(data);
      } catch (err: any) {
        console.error("Error fetching meal", err);
        setError(err.message || "Failed to load meal.");
      } finally {
        setLoading(false);
      }
    }

    fetchMeal();
  }, [params]);


  const gl = meal ? calcGlycemicLoad(meal) : null;
  const impact = impactFromGL(gl);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.back()}
              className="text-xs text-slate-400 hover:text-slate-200 mb-1"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold">
              {meal ? meal.name : "Meal"}
            </h1>
          </div>
          <Link
            href="/meals"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            View all meals
          </Link>
        </div>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          {loading && <p className="text-sm text-slate-400">Loading meal…</p>}

          {!loading && error && (
            <p className="text-sm text-amber-300">{error}</p>
          )}

          {!loading && !error && meal && (
            <>
              <div className="flex flex-col md:flex-row gap-4">
                {meal.photo_url && (
                  <div className="w-full md:w-1/3">
                    <img
                      src={meal.photo_url}
                      alt={meal.name}
                      className="w-full h-40 object-cover rounded-xl border border-slate-700"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {gl != null && (
                      <span className="text-sm text-slate-300">
                        Glycemic load:{" "}
                        <span className="font-semibold">{gl.toFixed(1)}</span>
                      </span>
                    )}
                    <span
                      className={
                        "inline-flex items-center text-xs px-2 py-1 rounded-full border " +
                        impactBadgeClasses(impact)
                      }
                    >
                      Impact: {impact}
                    </span>
                    {meal.tags && (
                      <span className="text-xs text-slate-400">
                        Tags: {meal.tags}
                      </span>
                    )}
                  </div>

                  {meal.description && (
                    <p className="text-sm text-slate-300">
                      {meal.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Calories</p>
                  <p className="font-semibold">
                    {meal.calories_kcal != null
                      ? `${meal.calories_kcal} kcal`
                      : "—"}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Carbs</p>
                  <p className="font-semibold">
                    {meal.carbs_g != null ? `${meal.carbs_g} g` : "—"}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Protein</p>
                  <p className="font-semibold">
                    {meal.protein_g != null ? `${meal.protein_g} g` : "—"}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Fat</p>
                  <p className="font-semibold">
                    {meal.fat_g != null ? `${meal.fat_g} g` : "—"}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Fiber</p>
                  <p className="font-semibold">
                    {meal.fiber_g != null ? `${meal.fiber_g} g` : "—"}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Sugar</p>
                  <p className="font-semibold">
                    {meal.sugar_g != null ? `${meal.sugar_g} g` : "—"}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Glycemic index</p>
                  <p className="font-semibold">
                    {meal.glycemic_index != null
                      ? meal.glycemic_index
                      : "—"}
                  </p>
                </div>
              </div>

              {meal.timestamp && (
                <p className="text-xs text-slate-500">
                  Created at: {new Date(meal.timestamp).toLocaleString()}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
