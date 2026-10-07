"use client";

import { useEffect, useMemo, useState } from "react";

type Country =
  | "Singapore"
  | "Malaysia"
  | "Hong Kong";

type Category =
  | "Healthcare"
  | "Education";

type PressRelease = {
  id: string;
  title: string;
  companies: string[];
  publisher: string;
  country: Country;
  category: Category;
  publishedAt: string;
  description: string;
  url: string;
  source: string;
};

export default function Home() {
  const [releases, setReleases] =
    useState<PressRelease[]>([]);

  const [country, setCountry] =
    useState<
      "All" | Country
    >("All");

  const [category, setCategory] =
    useState<
      "All" | Category
    >("All");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Fetch data
  |--------------------------------------------------------------------------
  */

  async function fetchReleases() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/press-release"
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch releases"
        );
      }

      const result =
        await response.json();

      if (!result.success) {
        throw new Error(
          result.message
        );
      }

      setReleases(
        result.data
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load press releases."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Initial load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchReleases();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Filter results
  |--------------------------------------------------------------------------
  */

  const filteredReleases =
    useMemo(() => {
      return releases.filter(
        (release) => {
          /*
           * Country
           */

          const countryMatch =
            country === "All" ||
            release.country ===
              country;

          /*
           * Category
           */

          const categoryMatch =
            category === "All" ||
            release.category ===
              category;

          /*
           * Search
           */

          const text =
            `
              ${release.title}
              ${release.description}
              ${release.publisher}
              ${release.country}
              ${release.category}
            `.toLowerCase();

          const searchMatch =
            text.includes(
              search.toLowerCase()
            );

          return (
            countryMatch &&
            categoryMatch &&
            searchMatch
          );
        }
      );
    }, [
      releases,
      country,
      category,
      search,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Stats
  |--------------------------------------------------------------------------
  */

  const healthcareCount =
    releases.filter(
      (release) =>
        release.category ===
        "Healthcare"
    ).length;

  const educationCount =
    releases.filter(
      (release) =>
        release.category ===
        "Education"
    ).length;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}

      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Healthcare & Education
            PR Monitor
          </h1>

          <p className="mt-2 text-gray-500">
            Singapore · Malaysia ·
            Hong Kong · Last 14 days
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat
            title="Total PRs"
            value={
              releases.length
            }
          />

          <Stat
            title="Healthcare"
            value={
              healthcareCount
            }
          />

          <Stat
            title="Education"
            value={
              educationCount
            }
          />
        </div>

        {/* Filters */}

        <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          {/* Country */}

          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Country
            </p>

            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={
                  country === "All"
                }
                onClick={() =>
                  setCountry("All")
                }
              >
                All
              </FilterButton>

              <FilterButton
                active={
                  country ===
                  "Singapore"
                }
                onClick={() =>
                  setCountry(
                    "Singapore"
                  )
                }
              >
                🇸🇬 Singapore
              </FilterButton>

              <FilterButton
                active={
                  country ===
                  "Malaysia"
                }
                onClick={() =>
                  setCountry(
                    "Malaysia"
                  )
                }
              >
                🇲🇾 Malaysia
              </FilterButton>

              <FilterButton
                active={
                  country ===
                  "Hong Kong"
                }
                onClick={() =>
                  setCountry(
                    "Hong Kong"
                  )
                }
              >
                🇭🇰 Hong Kong
              </FilterButton>
            </div>
          </div>

          {/* Category */}

          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Industry
            </p>

            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={
                  category === "All"
                }
                onClick={() =>
                  setCategory("All")
                }
              >
                All
              </FilterButton>

              <FilterButton
                active={
                  category ===
                  "Healthcare"
                }
                onClick={() =>
                  setCategory(
                    "Healthcare"
                  )
                }
              >
                🏥 Healthcare
              </FilterButton>

              <FilterButton
                active={
                  category ===
                  "Education"
                }
                onClick={() =>
                  setCategory(
                    "Education"
                  )
                }
              >
                🎓 Education
              </FilterButton>
            </div>
          </div>

          {/* Search */}

          <input
            type="text"
            placeholder="Search PRs..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>

        {/* Loading */}

        {loading && (
          <div className="rounded-xl border bg-white p-10 text-center">
            Loading latest PRs...
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {/* Results */}

        {!loading &&
          !error &&
          filteredReleases.length ===
            0 && (
            <div className="rounded-xl border bg-white p-10 text-center">
              <p className="text-gray-500">
                No PRs found.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredReleases.length >
            0 && (
            <div className="space-y-4">
              {filteredReleases.map(
                (release) => (
                  <PRCard
                    key={
                      release.id
                    }
                    release={
                      release
                    }
                  />
                )
              )}
            </div>
          )}
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| Stat
|--------------------------------------------------------------------------
*/

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Filter button
|--------------------------------------------------------------------------
*/

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-black text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| PR Card
|--------------------------------------------------------------------------
*/

function PRCard({
  release,
}: {
  release: PressRelease;
}) {
  const publishedDate =
    new Date(
      release.publishedAt
    );

  return (
    <article className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md">
      {/* Tags */}

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {release.country}
        </span>

        {release.category ===
        "Healthcare" ? (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            🏥 Healthcare
          </span>
        ) : (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            🎓 Education
          </span>
        )}
      </div>

      {/* Title */}

      <h2 className="text-xl font-semibold text-gray-900">
        {release.title}
      </h2>

      {/* Publisher */}

      {release.publisher && (
        <p className="mt-2 text-sm font-medium text-gray-600">
          Publisher:{" "}
          {release.publisher}
        </p>
      )}

      {/* Date */}

      <p className="mt-1 text-sm text-gray-400">
        {publishedDate.toLocaleString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        )}
      </p>

      {/* Description */}

      {release.description && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
          {release.description}
        </p>
      )}

      {/* Read */}

      <div className="mt-5">
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Read Article →
        </a>
      </div>
    </article>
  );
}