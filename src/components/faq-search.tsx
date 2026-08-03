"use client";

import { useMemo, useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  group: string;
  items: FaqItem[];
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "do",
  "does",
  "i",
  "my",
  "can",
  "you",
  "your",
  "to",
  "of",
  "for",
  "in",
  "on",
  "and",
  "or",
  "what",
  "how",
  "if",
  "it",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreItem(normalizedQuery: string, words: string[], item: FaqItem): number {
  if (!normalizedQuery) return 0;
  const nQuestion = normalize(item.q);
  const nAnswer = normalize(item.a);
  let score = 0;
  if (nQuestion.includes(normalizedQuery)) score += 15;
  if (nAnswer.includes(normalizedQuery)) score += 6;
  for (const w of words) {
    if (nQuestion.includes(w)) score += 4;
    if (nAnswer.includes(w)) score += 1;
  }
  return score;
}

const MAX_RESULTS = 6;

export default function FaqSearch({ groups }: { groups: FaqGroup[] }) {
  const [query, setQuery] = useState("");

  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.group }))),
    [groups],
  );

  const results = useMemo(() => {
    const nq = normalize(query);
    if (!nq) return null;
    const words = nq.split(" ").filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    return flatItems
      .map((item) => ({ item, score: scoreItem(nq, words, item) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [query, flatItems]);

  return (
    <div>
      <div className="mt-8">
        <label htmlFor="faq-search" className="sr-only">
          Search the FAQ
        </label>
        <div className="relative">
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your question… e.g. &quot;do you take cats&quot;"
            className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm text-foreground outline-none focus:border-accent-dark"
          />
        </div>
      </div>

      <div className="mt-10">
        {results === null ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.group}>
                <h2 className="font-serif text-xl text-foreground">
                  {group.group}
                </h2>
                <div className="mt-4 space-y-5">
                  {group.items.map((item) => (
                    <div
                      key={item.q}
                      className="rounded-2xl border border-border bg-card p-5"
                    >
                      <p className="font-medium text-foreground">{item.q}</p>
                      <p className="mt-1.5 text-sm text-muted">{item.a}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : results.length > 0 ? (
          <section>
            <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
              Closest match{results.length === 1 ? "" : "es"}
            </p>
            <div className="mt-4 space-y-5">
              {results.map((item, i) => (
                <div
                  key={item.q}
                  className={`rounded-2xl border p-5 ${
                    i === 0
                      ? "border-accent-dark/40 bg-accent-tint"
                      : "border-border bg-card"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-accent-dark">
                    {item.group}
                  </p>
                  <p className="mt-1 font-medium text-foreground">{item.q}</p>
                  <p className="mt-1.5 text-sm text-muted">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-foreground">
              No matching questions found for &quot;{query}&quot;.
            </p>
            <p className="mt-1.5 text-sm text-muted">
              Try different words, or email us at{" "}
              <a
                href="mailto:booking@paintedpawsaustin.com"
                className="text-accent-dark hover:underline"
              >
                booking@paintedpawsaustin.com
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
