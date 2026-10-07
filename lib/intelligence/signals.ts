import type {
  Signal,
} from "@/lib/types/prospect";

const SIGNAL_RULES: Record<
  Signal,
  string[]
> = {
  Funding: [
    "funding",
    "investment",
    "invests",
    "invested",
    "raises",
    "raised",
    "financing",
    "capital",
    "fund",
    "grant",
  ],

  Launch: [
    "launch",
    "launches",
    "launched",
    "introduces",
    "introduced",
    "unveils",
    "unveiled",
    "debut",
  ],

  Expansion: [
    "expansion",
    "expands",
    "expanded",
    "new facility",
    "new centre",
    "new center",
    "opens",
    "opening",
    "enters",
    "market expansion",
  ],

  Partnership: [
    "partnership",
    "partner",
    "partners",
    "collaboration",
    "collaborates",
    "alliance",
    "agreement",
    "joint venture",
    "memorandum",
    "mou",
  ],

  "Leadership Change": [
    "appointed",
    "appoints",
    "appointed as",
    "new ceo",
    "new chief",
    "joins as",
    "named ceo",
    "leadership",
    "executive appointment",
  ],

  Research: [
    "research",
    "study",
    "clinical trial",
    "clinical study",
    "findings",
    "researchers",
    "research project",
    "research initiative",
  ],

  "New Initiative": [
    "initiative",
    "program",
    "programme",
    "initiative launched",
    "centre",
    "center",
    "project",
    "new service",
    "new platform",
  ],

  Award: [
    "award",
    "awarded",
    "recognised",
    "recognized",
    "recognition",
    "honour",
    "honored",
    "winner",
  ],
};

export function detectSignals(
  text: string
): Signal[] {
  const normalized =
    text.toLowerCase();

  return (
    Object.entries(
      SIGNAL_RULES
    ) as [Signal, string[]][]
  )
    .filter(([, keywords]) =>
      keywords.some((keyword) =>
        normalized.includes(keyword)
      )
    )
    .map(([signal]) => signal);
}