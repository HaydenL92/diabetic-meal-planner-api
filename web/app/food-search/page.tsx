"use client";

import React, { useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

// Match the FastAPI response shape
type FoodNutrient = {
  name: string;
  unit_name: string;
  amount: number | null;
};

type FoodSearchItem = {
  fdc_id: number;
  description: string;
  brand_name?: string | null;
  data_type?: string | null;
  serving_size?: number | null;
  serving_size_unit?: string | null;
  nutrients: FoodNutrient[];
};

type FoodSearchResponse = {
  total_hits: number;
  page: number;
  page_size: number;
  foods: FoodSearchItem[];
};

export default function FoodSearchPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FoodSearchResponse | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/food-search/search-foods`);
      url.searchParams.set("q", query.trim());
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", "10");

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // If you later protect this endpoint, uncomment:
          // Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Food search error:", res.status, text);
        throw new Error(`Search failed with status ${res.status}`);
      }

      const data = (await res.json()) as FoodSearchResponse;
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to search foods");
    } finally {
      setIsLoading(false);
    }
  }

  function getKeyNutrient(
    nutrients: FoodNutrient[],
    nameIncludes: string
  ): FoodNutrient | undefined {
    return nutrients.find((n) =>
      n.name.toLowerCase().includes(nameIncludes.toLowerCase())
    );
  }

  function handleUseAsMeal(food: FoodSearchItem) {
    // For now, just log it – later we’ll wire this up to pre-fill your meal form
    console.log("Use as meal:", food);

    alert(
      `This is where we'll pre-fill the meal form.\n\nFood: ${food.description}`
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Food Search (USDA)
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-1">
              Search the USDA FoodData Central database and later turn results
              into meals with editable nutrition.
            </p>
          </div>
        </header>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center"
        >
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Search term
            </label>
            <input
              type="text"
              placeholder="e.g. apple, chicken breast, rice"
              className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-100 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Results summary */}
        {results && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {results.total_hits} result
              {results.total_hits !== 1 ? "s" : ""} found · Page {results.page}
            </span>
            {/* Simple paging for now – you can extend later */}
          </div>
        )}

        {/* Results grid */}
        {results && results.foods.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {results.foods.map((food) => {
              const carbs = getKeyNutrient(food.nutrients, "carbohydrate");
              const protein = getKeyNutrient(food.nutrients, "protein");
              const fat = getKeyNutrient(food.nutrients, "fat");
              const energy = getKeyNutrient(food.nutrients, "energy");

              return (
                <div
                  key={food.fdc_id}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-base md:text-lg font-semibold">
                      {food.description}
                    </h2>
                    <div className="text-xs text-slate-400 space-x-2">
                      {food.brand_name && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700">
                          {food.brand_name}
                        </span>
                      )}
                      {food.data_type && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 capitalize">
                          {food.data_type.replace(/_/g, " ").toLowerCase()}
                        </span>
                      )}
                    </div>

                    {food.serving_size && (
                      <p className="text-xs text-slate-300">
                        Serving: {food.serving_size}{" "}
                        {food.serving_size_unit?.toLowerCase()}
                      </p>
                    )}
                  </div>

                  {/* Nutrients row */}
                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                    {energy && (
                      <div className="bg-slate-900/80 rounded-xl px-2 py-1 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">
                          Energy
                        </div>
                        <div className="font-semibold">
                          {energy.amount ?? "–"} {energy.unit_name}
                        </div>
                      </div>
                    )}
                    {carbs && (
                      <div className="bg-slate-900/80 rounded-xl px-2 py-1 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">Carbs</div>
                        <div className="font-semibold">
                          {carbs.amount ?? "–"} {carbs.unit_name}
                        </div>
                      </div>
                    )}
                    {protein && (
                      <div className="bg-slate-900/80 rounded-xl px-2 py-1 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">
                          Protein
                        </div>
                        <div className="font-semibold">
                          {protein.amount ?? "–"} {protein.unit_name}
                        </div>
                      </div>
                    )}
                    {fat && (
                      <div className="bg-slate-900/80 rounded-xl px-2 py-1 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">Fat</div>
                        <div className="font-semibold">
                          {fat.amount ?? "–"} {fat.unit_name}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-500">
                      FDC ID: {food.fdc_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUseAsMeal(food)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition-colors"
                    >
                      Use as meal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!results && !isLoading && !error && (
          <div className="text-center text-sm text-slate-400 mt-10">
            Start by searching for a food above.
          </div>
        )}

        {/* No results state */}
        {results && results.foods.length === 0 && !isLoading && (
          <div className="text-center text-sm text-slate-400 mt-10">
            No foods found for &ldquo;{query}&rdquo;. Try a different term.
          </div>
        )}
      </div>
    </div>
  );
}
