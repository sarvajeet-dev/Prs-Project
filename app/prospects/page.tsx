
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type {
  DiscoveryResponse,
  Market,
  Prospect,
  Signal,
  Contact,
} from "@/lib/types";
import { decodeGoogleNewsUrl } from "@/lib/utils/decode-google-news";

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

  const [emailModal, setEmailModal] = useState<{
    prospect: Prospect;
    contact: Contact | null;
  } | null>(null);

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
  /* Email generation mutation                                               */
  /* ------------------------------------------------------------------------ */

  async function generateEmail(
    prospect: Prospect,
    contact: Contact | null
  ) {
    const response = await fetch(
      "/api/generate-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospect,
          contact,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(
        data?.error ||
          `Email generation failed (HTTP ${response.status})`
      );
    }

    return data;
  }

  const emailMutation = useMutation({
    mutationFn: (data: {
      prospect: Prospect;
      contact: Contact | null;
    }) => generateEmail(data.prospect, data.contact),
  });

  /* ------------------------------------------------------------------------ */
  /* Get cached prospects (hydration-safe)                                   */
  /* ------------------------------------------------------------------------ */

  /*
   * Must start as [] on both server and first client render,
   * otherwise sessionStorage data causes a hydration mismatch
   * (server sees no window → 0, client sees cached data → N).
   * We load from sessionStorage in useEffect below, which fires
   * after hydration completes.
   */
  const [cachedProspects, setCachedProspects] =
    useState<Prospect[]>([]);

  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem("prospects");

      if (stored) {
        setCachedProspects(
          JSON.parse(stored) as Prospect[]
        );
      }
    } catch {
      /* ignore corrupt session storage */
    }
  }, []);

  useEffect(() => {
    if (discoveryMutation.data) {
      setCachedProspects(
        discoveryMutation.data.prospects
      );
    }
  }, [discoveryMutation.data]);

  /*
   * Prefer the latest mutation response.
   * If there isn't one, use sessionStorage.
   */
  const prospects =
    discoveryMutation.data?.prospects ??
    cachedProspects;

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
            ? "Searching free sources..."
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
        <>
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
                onGenerateEmail={(
                  contact
                ) =>
                  setEmailModal({
                    prospect,
                    contact:
                      contact ||
                      prospect.organization
                        .primaryContact ||
                      null,
                  })
                }
                emailMutation={emailMutation}
              />
            ))}
          </div>

          {emailModal && (
            <EmailModal
              prospect={emailModal.prospect}
              contact={emailModal.contact}
              isLoading={
                emailMutation.isPending
              }
              onClose={() =>
                setEmailModal(null)
              }
              onGenerate={() => {
                emailMutation.mutate({
                  prospect:
                    emailModal.prospect,
                  contact: emailModal.contact,
                });
              }}
              emailData={emailMutation.data}
              error={emailMutation.error as Error | null}
            />
          )}
        </>

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
  onGenerateEmail,
  emailMutation,
}: {
  prospect: Prospect;
  onGenerateEmail: (
    contact: Contact | null
  ) => void;
  emailMutation: any;
}) {
  const initialContacts: Contact[] =
    prospect.organization.contacts &&
    prospect.organization.contacts.length > 0
      ? prospect.organization.contacts
      : prospect.organization.primaryContact
        ? [prospect.organization.primaryContact]
        : [];

  const [contactsState, setContactsState] =
    useState<Contact[]>(initialContacts);

  const contactState: Contact | null =
    contactsState[0] || null;

  const [isEnriching, setIsEnriching] =
    useState(false);

  const [enrichError, setEnrichError] =
    useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<
    string[]
  >([]);

  async function findContact() {
    setIsEnriching(true);
    setEnrichError(null);
    setDiagnostics([]);

    try {
      const response = await fetch(
        "/api/enrich-prospect",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            prospect,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Enrichment failed"
        );
      }

      const contacts: Contact[] = Array.isArray(
        data.contacts
      )
        ? data.contacts
        : data.contact
          ? [data.contact]
          : [];

      if (Array.isArray(data.diagnostics)) {
        setDiagnostics(data.diagnostics);
      }

      if (contacts.length > 0) {
        setContactsState(contacts);
        prospect.organization.contacts = contacts;
        prospect.organization.primaryContact =
          contacts[0];
      } else {
        setEnrichError("No contact found");
      }

      if (data.website) {
        prospect.organization.website = data.website;
      }
    } catch (error) {
      setEnrichError(
        error instanceof Error
          ? error.message
          : "Failed to find contact"
      );
    } finally {
      setIsEnriching(false);
    }
  }

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
            {stripHtmlClient(
              prospect.organization.name
            )}
          </h2>

          {/* PR title */}
          <h3
            style={{
              margin: "10px 0",
            }}
          >
            {stripHtmlClient(
              prospect.announcement.title
            )}
          </h3>

          {/* Description */}
          <p
            style={{
              color: "#555",
              lineHeight: "1.6",
              marginBottom: "10px",
            }}
          >
            {stripHtmlClient(
              prospect.announcement.description
            )}
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
      {/* Contact Information                                                 */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          marginTop: "18px",
          paddingTop: "18px",
          borderTop: "1px solid #eee",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <strong>
            Contacts
            {contactsState.length > 1 && (
              <span
                style={{
                  color: "#666",
                  fontWeight: "normal",
                  marginLeft: "6px",
                }}
              >
                ({contactsState.length})
              </span>
            )}
          </strong>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <button
              onClick={findContact}
              disabled={isEnriching}
              style={{
                padding: "6px 12px",
                background: isEnriching
                  ? "#ccc"
                  : "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: isEnriching
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isEnriching
                ? "Finding..."
                : contactsState.length === 0
                  ? "Find Contact"
                  : "Refresh"}
            </button>
          </div>
        </div>

        {contactsState.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {contactsState.map((c, i) => (
              <ContactCard
                key={`${c.email}-${i}`}
                contact={c}
                isPrimary={i === 0}
                onUseInEmail={() =>
                  onGenerateEmail(c)
                }
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "#fff8e1",
              padding: "12px",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#8a6d3b",
            }}
          >
            <div>
              {enrichError
                ? enrichError
                : "No contact enriched yet. Click 'Find Contact' to search."}
            </div>

            {diagnostics.length > 0 && (
              <details
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    color: "#5a4a1c",
                  }}
                >
                  Why? ({diagnostics.length} step
                  {diagnostics.length === 1 ? "" : "s"})
                </summary>

                <ul
                  style={{
                    margin: "6px 0 0",
                    paddingLeft: "18px",
                  }}
                >
                  {diagnostics.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
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
          flexWrap: "wrap",
        }}
      >
        {prospect.announcement.url && (
          <ViewPRButton url={prospect.announcement.url} />
        )}

        <button
          onClick={() =>
            onGenerateEmail(contactState)
          }
          disabled={emailMutation.isPending}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            background: "#0066cc",
            color: "#fff",
            border: "none",
            cursor:
              emailMutation.isPending
                ? "not-allowed"
                : "pointer",
            fontSize: "14px",
            opacity:
              emailMutation.isPending
                ? 0.7
                : 1,
          }}
        >
          {emailMutation.isPending
            ? "Generating..."
            : "Generate Email"}
        </button>
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
/* View PR Button                                                             */
/* -------------------------------------------------------------------------- */

function ViewPRButton({ url }: { url: string }) {
  const href = useMemo(
    () => decodeGoogleNewsUrl(url),
    [url]
  );

  return (
    <a
      href={href}
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
  );
}

/* -------------------------------------------------------------------------- */
/* Contact Card                                                               */
/* -------------------------------------------------------------------------- */

function ContactCard({
  contact,
  isPrimary,
  onUseInEmail,
}: {
  contact: Contact;
  isPrimary: boolean;
  onUseInEmail: () => void;
}) {
  const displayName =
    contact.name ||
    (contact.firstName && contact.lastName
      ? `${contact.firstName} ${contact.lastName}`
      : contact.firstName
        ? capitalize(contact.firstName)
        : null);

  const sourceLabel =
    contact.source ||
    (contact.emailType === "pr-page"
      ? "Press release"
      : contact.emailType === "website"
        ? "Company website"
        : contact.emailType === "role-mailbox"
          ? "Company website (role)"
          : contact.emailType === "pr-distributor"
            ? "PR distributor"
            : contact.emailType === "pr-publisher"
              ? "Publisher"
              : contact.emailType === "pattern"
                ? "Pattern guess"
                : "Fallback");

  const sourceColor =
    contact.emailType === "website"
      ? "#1b7f3d"
      : contact.emailType === "pr-page"
        ? "#1366d6"
        : contact.emailType === "role-mailbox"
          ? "#8a6d3b"
          : contact.emailType === "pr-distributor"
            ? "#9c4221"
            : contact.emailType === "pr-publisher"
              ? "#6b4e9b"
              : "#999";

  return (
    <div
      style={{
        background: "#f9f9f9",
        padding: "12px",
        borderRadius: "6px",
        border: isPrimary
          ? "1px solid #d4e3f5"
          : "1px solid transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "4px",
            }}
          >
            <strong>
              {displayName || "Decision Maker"}
            </strong>

            {isPrimary && (
              <span
                style={{
                  fontSize: "10px",
                  background: "#0066cc",
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Primary
              </span>
            )}

            <span
              style={{
                fontSize: "11px",
                color: sourceColor,
                background: "#fff",
                border: `1px solid ${sourceColor}`,
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              {sourceLabel}
            </span>
          </div>

          {contact.title && (
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "4px",
              }}
            >
              {contact.title}
            </div>
          )}

          {contact.email ? (
            <div
              style={{
                fontSize: "13px",
                color: "#0066cc",
                wordBreak: "break-all",
              }}
            >
              📧 {contact.email}
            </div>
          ) : (
            <div
              style={{
                fontSize: "13px",
                color: "#999",
                fontStyle: "italic",
              }}
            >
              Email not available
            </div>
          )}

          {contact.sourceUrl && (
            <a
              href={contact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "11px",
                color: "#999",
                textDecoration: "underline",
                marginTop: "4px",
                display: "inline-block",
                wordBreak: "break-all",
              }}
            >
              source
            </a>
          )}
        </div>

        {contact.email && (
          <button
            onClick={onUseInEmail}
            style={{
              padding: "6px 10px",
              fontSize: "12px",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Use for email
          </button>
        )}
      </div>
    </div>
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
        : "Click 'Discover New PRs' to start searching."}
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

function stripHtmlClient(
  content: string = ""
): string {
  if (!content) return "";

  let cleaned = content;

  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // Decode common HTML entities
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&hellip;": "...",
    "&mdash;": "—",
    "&ndash;": "–",
  };

  Object.entries(entities).forEach(
    ([entity, replacement]) => {
      cleaned = cleaned.replace(
        new RegExp(entity, "g"),
        replacement
      );
    }
  );

  // Decode numeric entities
  cleaned = cleaned.replace(
    /&#(\d+);/g,
    (_, code) =>
      String.fromCharCode(
        parseInt(code, 10)
      )
  );

  // Remove any remaining entities
  cleaned = cleaned.replace(
    /&[a-z]+;/gi,
    " "
  );

  // Collapse whitespace
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
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

/* -------------------------------------------------------------------------- */
/* Email Modal                                                               */
/* -------------------------------------------------------------------------- */

function EmailModal({
  prospect,
  contact,
  isLoading,
  onClose,
  onGenerate,
  emailData,
  error,
}: {
  prospect: Prospect;
  contact: Contact | null;
  isLoading: boolean;
  onClose: () => void;
  onGenerate: () => void;
  emailData?: any;
  error?: Error | null;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          maxWidth: "700px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "30px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
            }}
          >
            Generate Email Draft
          </h2>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {!emailData && (
          <>
            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <strong>To:</strong>

              <div
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  background: "#f9f9f9",
                  borderRadius: "6px",
                }}
              >
                {contact?.name || "Decision Maker"}

                {contact?.title && (
                  <>
                    <br />
                    <small style={{ color: "#666" }}>
                      {contact.title}
                    </small>
                  </>
                )}

                {contact?.email && (
                  <>
                    <br />
                    <small
                      style={{
                        color: "#0066cc",
                      }}
                    >
                      {contact.email}
                    </small>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <strong>Organization:</strong>

              <div
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  background: "#f9f9f9",
                  borderRadius: "6px",
                }}
              >
                {prospect.organization.name}

                <br />

                <small style={{ color: "#666" }}>
                  {prospect.announcement.title}
                </small>
              </div>
            </div>

            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <strong>Signals Detected:</strong>

              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                {prospect.announcement.signals.map(
                  (signal) => (
                    <span
                      key={signal}
                      style={{
                        background:
                          "#e8f4f8",
                        padding:
                          "4px 10px",
                        borderRadius:
                          "14px",
                        fontSize: "12px",
                      }}
                    >
                      {capitalize(signal)}
                    </span>
                  )
                )}
              </div>
            </div>

            <button
              onClick={onGenerate}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "12px",
                background:
                  isLoading ? "#ccc" : "#0066cc",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: isLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isLoading
                ? "Generating..."
                : "Generate Personalized Email"}
            </button>

            {error && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  background: "#fdecea",
                  border: "1px solid #f5c2c7",
                  color: "#842029",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                {error.message ||
                  "Email generation failed. See server logs."}
              </div>
            )}
          </>
        )}

        {emailData && (
          <EmailPreview emailData={emailData} />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Email Preview                                                              */
/* -------------------------------------------------------------------------- */

function EmailPreview({ emailData }: { emailData: any }) {
  const [copied, setCopied] =
    useState(false);

  const emailBody =
    emailData.email.body;

  const handleCopy = () => {
    const fullEmail =
      `Subject: ${emailData.email.subject}\n\n${emailBody}`;

    navigator.clipboard
      .writeText(fullEmail)
      .then(() => {
        setCopied(true);
        setTimeout(
          () => setCopied(false),
          2000
        );
      });
  };

  return (
    <div>
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          background: "#f0f8ff",
          borderRadius: "6px",
        }}
      >
        <strong>Outreach Angle:</strong>

        <p
          style={{
            marginTop: "8px",
            marginBottom: 0,
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          {emailData.outreachAngle}
        </p>
      </div>

      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <strong>Email Draft:</strong>

        <div
          style={{
            marginTop: "12px",
            padding: "15px",
            background: "#fafafa",
            borderRadius: "6px",
            border: "1px solid #eee",
            fontSize: "13px",
            lineHeight: "1.6",
            fontFamily:
              "'Courier New', monospace",
          }}
        >
          <div
            style={{
              marginBottom: "10px",
              color: "#666",
            }}
          >
            <strong>To:</strong>{" "}
            {emailData.meta.contactName}
          </div>

          <div
            style={{
              marginBottom: "15px",
              color: "#666",
            }}
          >
            <strong>Subject:</strong>{" "}
            {emailData.email.subject}
          </div>

          <div
            style={{
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {emailBody}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: "12px",
            background: "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {copied
            ? "Copied to clipboard!"
            : "Copy Email"}
        </button>

        <button
          onClick={() => {
            if (!emailData.meta.contactEmail) return;
            window.location.href =
              `mailto:${emailData.meta.contactEmail}` +
              `?subject=${encodeURIComponent(emailData.email.subject)}` +
              `&body=${encodeURIComponent(emailBody)}`;
          }}
          disabled={!emailData.meta.contactEmail}
          title={
            emailData.meta.contactEmail
              ? `Opens your email client to send to ${emailData.meta.contactEmail}`
              : "No contact email available for this prospect"
          }
          style={{
            flex: 1,
            padding: "12px",
            background: emailData.meta.contactEmail
              ? "#28a745"
              : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: emailData.meta.contactEmail
              ? "pointer"
              : "not-allowed",
          }}
        >
          {emailData.meta.contactEmail
            ? "Send Email"
            : "No email on file"}
        </button>
      </div>
    </div>
  );
}
