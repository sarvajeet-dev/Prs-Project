"use client";

import { useEffect, useMemo, useState } from "react";

type Country =
  | "Singapore"
  | "Malaysia"
  | "Hong Kong";

type PressRelease = {
  id: string;
  title: string;
  company: string;
  country: Country;
  publishedAt: string;
  description: string;
  url: string;
  source: string;
};

export default function Home() {
  const [releases, setReleases] = useState<
    PressRelease[]
  >([]);

  const [country, setCountry] = useState<
    Country | "All"
  >("All");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchReleases() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/press-release"
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch press releases"
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message ||
              "Failed to fetch press releases"
          );
        }

        setReleases(result.data);
      } catch (error) {
        console.error(error);

        setError(
          "Unable to load press releases."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchReleases();
  }, []);

  const filteredReleases = useMemo(() => {
    return releases.filter((release) => {
      const matchesCountry =
        country === "All" ||
        release.country === country;

      const searchText =
        `${release.title} ${release.company} ${release.description}`
          .toLowerCase();

      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );

      return (
        matchesCountry &&
        matchesSearch
      );
    });
  }, [releases, country, search]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Latest Press Releases
          </h1>

          <p className="mt-2 text-gray-600">
            Singapore · Malaysia · Hong Kong
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
          
          {/* Country buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              "All",
              "Singapore",
              "Malaysia",
              "Hong Kong",
            ].map((item) => (
              <button
                key={item}
                onClick={() =>
                  setCountry(
                    item as Country | "All"
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  country === item
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search press releases..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
          />
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            title="Total PRs"
            value={filteredReleases.length}
          />

          <Stat
            title="Singapore"
            value={
              releases.filter(
                (r) =>
                  r.country ===
                  "Singapore"
              ).length
            }
          />

          <Stat
            title="Malaysia / Hong Kong"
            value={
              releases.filter(
                (r) =>
                  r.country ===
                    "Malaysia" ||
                  r.country ===
                    "Hong Kong"
              ).length
            }
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border bg-white p-10 text-center">
            Loading press releases...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredReleases.length === 0 && (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
              No press releases found.
            </div>
          )}

        {/* PR list */}
        {!loading &&
          !error &&
          filteredReleases.length > 0 && (
            <div className="space-y-4">
              {filteredReleases.map(
                (release) => (
                  <PressReleaseCard
                    key={release.id}
                    release={release}
                  />
                )
              )}
            </div>
          )}
      </div>
    </main>
  );
}

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

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function PressReleaseCard({
  release,
}: {
  release: PressRelease;
}) {
  const formattedDate =
    new Date(
      release.publishedAt
    ).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <article className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md">
      {/* Country + date */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-black font-medium">
          {release.country}
        </span>

        <span className="text-gray-500">
          {formattedDate}
        </span>

        <span className="text-gray-400">
          {release.source}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900">
        {release.title}
      </h2>

      {/* Publisher */}
      {release.company && (
        <p className="mt-2 font-medium text-gray-700">
          {release.company}
        </p>
      )}

      {/* Description */}
      {release.description && (
        <p className="mt-3 line-clamp-3 text-gray-600">
          {release.description}
        </p>
      )}

      {/* URL */}
      <div className="mt-5">
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Read PR →
        </a>
      </div>
    </article>
  );
}