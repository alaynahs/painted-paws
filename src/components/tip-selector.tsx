"use client";

import { useState } from "react";
import { payTip } from "@/app/book/actions";

const PRESETS = [15, 20, 25] as const;

export default function TipSelector({
  appointmentId,
  price,
}: {
  appointmentId: string;
  price: number;
}) {
  const [selected, setSelected] = useState<number | "custom" | "none">("none");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tipDollars =
    selected === "none"
      ? 0
      : selected === "custom"
        ? Number(customAmount) || 0
        : Math.round(price * (selected / 100) * 100) / 100;

  const tipCents = Math.max(0, Math.round(tipDollars * 100));

  return (
    <form
      action={payTip}
      onSubmit={() => setSubmitting(true)}
      className="space-y-6"
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="tipCents" value={tipCents} />

      <div>
        <label className="text-sm font-medium text-foreground">
          Add a tip for your groomer?
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelected("none")}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              selected === "none"
                ? "border-accent bg-accent text-white"
                : "border-border bg-card text-foreground/80 hover:border-accent-dark"
            }`}
          >
            No tip
          </button>
          {PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setSelected(pct)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selected === pct
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-foreground/80 hover:border-accent-dark"
              }`}
            >
              {pct}% (${((price * pct) / 100).toFixed(2)})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected("custom")}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              selected === "custom"
                ? "border-accent bg-accent text-white"
                : "border-border bg-card text-foreground/80 hover:border-accent-dark"
            }`}
          >
            Custom
          </button>
        </div>
        {selected === "custom" && (
          <div className="mt-3">
            <label className="text-xs text-muted" htmlFor="customTip">
              Custom tip amount ($)
            </label>
            <input
              id="customTip"
              type="number"
              min={0}
              step={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="mt-1 w-32 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || tipCents <= 0}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Redirecting to payment…"
          : tipCents > 0
            ? `Send $${(tipCents / 100).toFixed(2)} Tip`
            : "Pick a tip amount"}
      </button>
    </form>
  );
}
