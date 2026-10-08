
"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type {
  DiscoveryResponse,
  Market,
  Prospect,
  Signal,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MARKETS: Market[] = [
  "Singapore",
  "Malaysia",
  "Hong Kong",
];

const SIGNALS: Signal[] = [
  "funding",
  "launch",
  "expansion",
  "partnership",
  "leadership",
  "research",
  "initiative",
];

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

async function discover(payload: {
  markets: Market[];
  signals: Signal[];
}): Promise<DiscoveryResponse> {
  const response = await fetch("/api/discover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Discovery failed");
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProspectsPage() {
  const [market, setMarket] = useState<Market | "all">("all");

  const [category, setCategory] = useState<
    "all" | "healthcare" | "education"
  >("all");

  const [signal, setSignal] = useState<Signal | "all">("all");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  /* ------------------------------------------------------------------------ */
  /* Discovery mutation                                                      */
  /* ------------------------------------------------------------------------ */

  const discoveryMutation = useMutation({
    mutationFn: discover,

    onSuccess: (data) => {
      sessionStorage.setItem(
        "prospects",
        JSON.stringify(data.prospects)
      );

      sessionStorage.setItem(
        "prospects-meta",
        JSON.stringify(data.meta)
      );

      setPage(1);
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Get cached prospects                                                     */
  /* ------------------------------------------------------------------------ */

  const cachedProspects = useMemo(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = sessionStorage.getItem("prospects");

      if (!stored) {
        return [];
      }

      return JSON.parse(stored) as Prospect[];
    } catch {
      return [];
    }
  }, [discoveryMutation.data]);

  /*
   * Prefer the latest mutation response.
   * If there isn't one, use sessionStorage.
   */
  const prospects =
    discoveryMutation.data?.prospects ?? cachedProspects;

  /* ------------------------------------------------------------------------ */
  /* Filtering                                                                */
  /* ------------------------------------------------------------------------ */

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return prospects.filter((prospect) => {
      /* Market filter */
      if (
        market !== "all" &&
        prospect.organization.country !== market
      ) {
        return false;
      }

      /* Category filter */
      if (category !== "all") {
        const organizationCategory =
          prospect.organization.category;

        const categoryMatches =
          organizationCategory === category ||
          organizationCategory === "both";

        if (!categoryMatches) {
          return false;
        }
      }

      /* Signal filter */
      if (
        signal !== "all" &&
        !prospect.announcement.signals.includes(signal)
      ) {
        return false;
      }

      /* Search */
      if (searchText) {
        const haystack = [
          prospect.organization.name,
          prospect.announcement.title,
          prospect.announcement.description,
          prospect.announcement.source,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }, [
    prospects,
    market,
    category,
    signal,
    search,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Pagination                                                               */
  /* ------------------------------------------------------------------------ */

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  /*
   * If filters reduce the number of pages and the current page
   * becomes invalid, make sure we don't stay on an empty page.
   */
  const safePage = Math.min(page, totalPages);

  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const healthCount = prospects.filter(
    (item) =>
      item.organization.category === "healthcare" ||
      item.organization.category === "both"
  ).length;

  const educationCount = prospects.filter(
    (item) =>
      item.organization.category === "education" ||
      item.organization.category === "both"
  ).length;

  const highFitCount = prospects.filter(
    (item) => item.fit.score >= 70
  ).length;

  /* ------------------------------------------------------------------------ */
  /* Discovery                                                                */
  /* ------------------------------------------------------------------------ */

  function runDiscovery() {
    discoveryMutation.mutate({
      markets:
        market === "all"
          ? MARKETS
          : [market],

      signals:
        signal === "all"
          ? SIGNALS
          : [signal],
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Filter handlers                                                          */
  /* ------------------------------------------------------------------------ */

  function handleMarketChange(
    value: Market | "all"
  ) {
    setMarket(value);
    setPage(1);
  }

  function handleCategoryChange(
    value:
      | "all"
      | "healthcare"
      | "education"
  ) {
    setCategory(value);
    setPage(1);
  }

  function handleSignalChange(
    value: Signal | "all"
  ) {
    setSignal(value);
    setPage(1);
  }

  function handleSearchChange(
    value: string
  ) {
    setSearch(value);
    setPage(1);
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <main
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 8px",
            }}
          >
            PR Prospecting
          </h1>

          <p
            style={{
              color: "#666",
              margin: 0,
            }}
          >
            Health 2.0 & Education 2.0 opportunity discovery
          </p>
        </div>

        <button
          onClick={runDiscovery}
          disabled={discoveryMutation.isPending}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#111",
            color: "#fff",
            cursor: discoveryMutation.isPending
              ? "not-allowed"
              : "pointer",
            opacity: discoveryMutation.isPending
              ? 0.7
              : 1,
          }}
        >
          {discoveryMutation.isPending
            ? "Searching Tavily..."
            : "Discover New PRs"}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Error                                                              */}
      {/* ------------------------------------------------------------------ */}

      {discoveryMutation.isError && (
        <div
          style={{
            background: "#fee2e2",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#991b1b",
          }}
        >
          {discoveryMutation.error.message}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Success                                                             */}
      {/* ------------------------------------------------------------------ */}

      {discoveryMutation.data && (
        <div
          style={{
            background: "#ecfdf5",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          Found{" "}
          <strong>
            {discoveryMutation.data.meta.finalResults}
          </strong>{" "}
          relevant prospects from{" "}
          <strong>
            {discoveryMutation.data.meta.uniqueResults}
          </strong>{" "}
          unique search results.
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Stats                                                               */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        <Stat
          title="Total"
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
          title="High Fit"
          value={highFitCount}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "30px",
        }}
      >
        {/* Market */}
        <select
          value={market}
          onChange={(event) =>
            handleMarketChange(
              event.target.value as Market | "all"
            )
          }
          style={selectStyle}
        >
          <option value="all">
            All Markets
          </option>

          {MARKETS.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          value={category}
          onChange={(event) =>
            handleCategoryChange(
              event.target.value as
                | "all"
                | "healthcare"
                | "education"
            )
          }
          style={selectStyle}
        >
          <option value="all">
            All Categories
          </option>

          <option value="healthcare">
            Healthcare
          </option>

          <option value="education">
            Education
          </option>
        </select>

        {/* Signal */}
        <select
          value={signal}
          onChange={(event) =>
            handleSignalChange(
              event.target.value as Signal | "all"
            )
          }
          style={selectStyle}
        >
          <option value="all">
            All Signals
          </option>

          {SIGNALS.map((item) => (
            <option
              key={item}
              value={item}
            >
              {capitalize(item)}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          value={search}
          onChange={(event) =>
            handleSearchChange(
              event.target.value
            )
          }
          placeholder="Search organization or PR..."
          style={inputStyle}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Results                                                             */}
      {/* ------------------------------------------------------------------ */}

      {paginated.length === 0 ? (
        <EmptyState
          hasData={prospects.length > 0}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {paginated.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                          */}
      {/* ------------------------------------------------------------------ */}

      {filtered.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "15px",
            marginTop: "30px",
          }}
        >
          <button
            disabled={safePage <= 1}
            onClick={() =>
              setPage((value) =>
                Math.max(1, value - 1)
              )
            }
            style={paginationButtonStyle}
          >
            Previous
          </button>

          <span>
            Page {safePage} of {totalPages}
          </span>

          <button
            disabled={safePage >= totalPages}
            onClick={() =>
              setPage((value) =>
                Math.min(
                  totalPages,
                  value + 1
                )
              )
            }
            style={paginationButtonStyle}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat                                                                       */
/* -------------------------------------------------------------------------- */

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <div
        style={{
          color: "#666",
          fontSize: "14px",
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "30px",
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Prospect Card                                                              */
/* -------------------------------------------------------------------------- */

function ProspectCard({
  prospect,
}: {
  prospect: Prospect;
}) {
  return (
    <article
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "22px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
        }}
      >
        {/* Main information */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Badges */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "10px",
            }}
          >
            <Badge>
              {capitalize(
                prospect.organization.category
              )}
            </Badge>

            {prospect.organization.country && (
              <Badge>
                {prospect.organization.country}
              </Badge>
            )}

            {prospect.announcement.signals.map(
              (signal) => (
                <Badge key={signal}>
                  {capitalize(signal)}
                </Badge>
              )
            )}
          </div>

          {/* Organization */}
          <h2
            style={{
              margin: "5px 0",
            }}
          >
            {prospect.organization.name}
          </h2>

          {/* PR title */}
          <h3
            style={{
              margin: "10px 0",
            }}
          >
            {prospect.announcement.title}
          </h3>

          {/* Description */}
          <p
            style={{
              color: "#555",
              lineHeight: "1.6",
              marginBottom: "10px",
            }}
          >
            {prospect.announcement.description}
          </p>

          {/* Source */}
          <div
            style={{
              fontSize: "13px",
              color: "#777",
              marginTop: "10px",
            }}
          >
            Source:{" "}
            {prospect.announcement.source}

            {" · "}

            {prospect.announcement.publishedAt
              ? new Date(
                  prospect.announcement.publishedAt
                ).toLocaleDateString()
              : "Date unavailable"}
          </div>
        </div>

        {/* Fit score */}
        <div
          style={{
            minWidth: "100px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              fontWeight: "bold",
            }}
          >
            {prospect.fit.score}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#777",
            }}
          >
            Fit Score
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Relevance                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          marginTop: "18px",
          paddingTop: "18px",
          borderTop: "1px solid #eee",
        }}
      >
        <strong>
          Why this is relevant
        </strong>

        {prospect.fit.reasons.length > 0 && (
          <ul
            style={{
              marginTop: "10px",
            }}
          >
            {prospect.fit.reasons.map(
              (reason) => (
                <li key={reason}>
                  {reason}
                </li>
              )
            )}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Actions                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "15px",
        }}
      >
        {prospect.announcement.url && (
          <a
            href={
              prospect.announcement.url
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: "6px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            View PR
          </a>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        background: "#f1f5f9",
        padding: "5px 9px",
        borderRadius: "999px",
        fontSize: "12px",
      }}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({
  hasData,
}: {
  hasData: boolean;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 20px",
        border: "1px dashed #ccc",
        borderRadius: "12px",
      }}
    >
      {hasData
        ? "No prospects match your filters."
        : "Click 'Discover New PRs' to search Tavily."}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function capitalize(value: string) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  background: "#fff",
  fontSize: "14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
};

const paginationButtonStyle: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  background: "#fff",
  cursor: "pointer",
};
