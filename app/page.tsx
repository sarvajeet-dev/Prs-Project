"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Prospect = {
  id: string;

  organization: {
    name: string;
    country:
      | "Singapore"
      | "Malaysia"
      | "Hong Kong";
    category:
      | "Healthcare"
      | "Education";
  };

  announcement: {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
    signals: string[];
  };

  fit: {
    score: number;
    reasons: string[];
  };

  contact?: {
    name: string;
    title: string;
    email?: string;
    emailSource?: string;
    linkedinUrl?: string;
    confidence:
      | "high"
      | "medium"
      | "low";
  };

  outreach?: {
    angle: string;
    subject: string;
    email: string;
  };
};

export default function Home() {
  const [prospects, setProspects] =
    useState<Prospect[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [country, setCountry] =
    useState("All");

  const [category, setCategory] =
    useState("All");

  const [search, setSearch] =
    useState("");

  async function loadProspects() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/prospects",
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load prospects"
        );
      }

      if (!data.success) {
        throw new Error(
          data.error ||
            "Failed to load prospects"
        );
      }

      setProspects(
        data.data ?? []
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProspects();
  }, []);

  const filtered =
    useMemo(() => {
      return prospects.filter(
        (prospect) => {
          const matchesCountry =
            country === "All" ||
            prospect.organization
              .country ===
              country;

          const matchesCategory =
            category === "All" ||
            prospect.organization
              .category ===
              category;

          const searchable =
            [
              prospect.organization
                .name,

              prospect.announcement
                .title,

              prospect.announcement
                .description,

              prospect.announcement
                .signals
                .join(" "),
            ]
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            searchable.includes(
              search.toLowerCase()
            );

          return (
            matchesCountry &&
            matchesCategory &&
            matchesSearch
          );
        }
      );
    }, [
      prospects,
      country,
      category,
      search,
    ]);

  const healthCount =
    prospects.filter(
      (item) =>
        item.organization
          .category ===
        "Healthcare"
    ).length;

  const educationCount =
    prospects.filter(
      (item) =>
        item.organization
          .category ===
        "Education"
    ).length;

  const contactCount =
    prospects.filter(
      (item) =>
        item.contact?.email
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                PR Intelligence
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Health 2.0 & Education 2.0
                prospect discovery
              </p>
            </div>

            <button
              onClick={loadProspects}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading
                ? "Searching..."
                : "Refresh PRs"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            title="Total prospects"
            value={prospects.length}
          />

          <Stat
            title="Healthcare"
            value={healthCount}
          />

          <Stat
            title="Education"
            value={educationCount}
          />

          <Stat
            title="Public emails"
            value={contactCount}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search organization, PR, signal..."
            className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:border-slate-500"
          />

          <select
            value={country}
            onChange={(event) =>
              setCountry(
                event.target.value
              )
            }
            className="rounded-lg border px-4 py-2 text-sm"
          >
            <option>All</option>
            <option>Singapore</option>
            <option>Malaysia</option>
            <option>Hong Kong</option>
          </select>

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
            className="rounded-lg border px-4 py-2 text-sm"
          >
            <option>All</option>
            <option>Healthcare</option>
            <option>Education</option>
          </select>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-20 text-center text-sm text-slate-500">
            Searching recent announcements...
          </div>
        )}

        {!loading &&
          !error &&
          filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-semibold text-slate-800">
                No matching prospects
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Try another filter or refresh
                the search.
              </p>
            </div>
          )}

        <div className="mt-6 grid gap-5">
          {filtered.map(
            (prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
              />
            )
          )}
        </div>
      </section>
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
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ProspectCard({
  prospect,
}: {
  prospect: Prospect;
}) {
  return (
    <article className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>
                {
                  prospect.organization
                    .category
                }
              </Badge>

              <Badge>
                {
                  prospect.organization
                    .country
                }
              </Badge>

              {prospect.announcement.signals.map(
                (signal) => (
                  <Badge key={signal}>
                    {signal}
                  </Badge>
                )
              )}
            </div>

            <h2 className="mt-3 text-xl font-bold text-slate-900">
              {
                prospect.organization
                  .name
              }
            </h2>

            <p className="mt-2 font-medium text-slate-800">
              {
                prospect.announcement
                  .title
              }
            </p>

            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
              {
                prospect.announcement
                  .description
              }
            </p>
          </div>

          <div className="flex h-fit shrink-0 flex-col items-center rounded-xl bg-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              Fit
            </span>

            <span className="text-3xl font-bold text-slate-900">
              {prospect.fit.score}
            </span>
          </div>
        </div>

        <div className="border-t pt-5">
          <p className="text-sm font-semibold text-slate-900">
            Why this prospect?
          </p>

          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {prospect.fit.reasons.map(
              (reason) => (
                <li
                  key={reason}
                  className="list-inside list-disc"
                >
                  {reason}
                </li>
              )
            )}
          </ul>
        </div>

        {prospect.contact && (
          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Decision maker
            </p>

            <p className="mt-2 font-medium">
              {
                prospect.contact
                  .name
              }
            </p>

            <p className="text-sm text-slate-500">
              {
                prospect.contact
                  .title
              }
            </p>

            {prospect.contact
              .email && (
              <p className="mt-2 text-sm font-medium text-green-700">
                {
                  prospect.contact
                    .email
                }
              </p>
            )}

            <p className="mt-1 text-xs text-slate-400">
              Confidence:{" "}
              {
                prospect.contact
                  .confidence
              }
            </p>
          </div>
        )}

        {prospect.outreach && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Outreach angle
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {
                prospect.outreach
                  .angle
              }
            </p>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                View email draft
              </summary>

              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-6 text-slate-700">
                {
                  prospect.outreach
                    .email
                }
              </div>
            </details>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t pt-5">
          <a
            href={
              prospect.announcement
                .url
            }
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            View PR →
          </a>

          {prospect.contact
            ?.linkedinUrl && (
            <a
              href={
                prospect.contact
                  .linkedinUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700"
            >
              LinkedIn →
            </a>
          )}

          {prospect.contact
            ?.email && (
            <a
              href={`mailto:${prospect.contact.email}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700"
            >
              Email →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}