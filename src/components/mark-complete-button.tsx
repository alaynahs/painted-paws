"use client";

import { useEffect, useRef, useState } from "react";
import { markAppointmentComplete } from "@/app/admin/actions";
import { CheckoutIcon } from "@/components/stage-icons";

const OPTIONS: { includeTip: boolean; includePhotos: boolean; label: string }[] = [
  { includeTip: true, includePhotos: true, label: "Review + tip, with photos" },
  { includeTip: true, includePhotos: false, label: "Review + tip, no photos" },
  { includeTip: false, includePhotos: true, label: "Review only, with photos" },
  { includeTip: false, includePhotos: false, label: "Review only, no photos" },
];

export default function MarkCompleteButton({
  appointmentId,
  customerEmail,
  compact = false,
  tile = false,
}: {
  appointmentId: string;
  customerEmail?: string | null;
  compact?: boolean;
  tile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<(typeof OPTIONS)[number] | null>(null);
  const [email, setEmail] = useState(customerEmail ?? "");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setChosen(null);
    setEmail(customerEmail ?? "");
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close() reads customerEmail via closure, which doesn't change per-render in a way that should re-arm this listener
  }, [open]);

  async function send() {
    if (!chosen) return;
    setSending(true);
    await markAppointmentComplete(
      appointmentId,
      chosen.includeTip,
      chosen.includePhotos,
      email.trim(),
    );
  }

  const triggerClass = tile
    ? "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-accent-dark bg-accent-tint px-2 py-3 text-center transition-colors hover:bg-accent-dark hover:text-white"
    : compact
      ? "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
      : "rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark";

  return (
    <div ref={ref} className={tile ? "relative" : "relative inline-block"}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass}>
        {tile ? (
          <>
            <CheckoutIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Checkout</span>
          </>
        ) : compact ? (
          "Mark Complete ▾"
        ) : (
          "Mark Complete / Sent Home ▾"
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          {!chosen ? (
            OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setChosen(opt)}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-accent-tint"
              >
                {opt.label}
              </button>
            ))
          ) : (
            <div className="p-1.5">
              <p className="text-xs font-medium text-foreground">{chosen.label}</p>
              <label className="mt-2 block text-[11px] text-muted" htmlFor="mark-complete-email">
                Send to
              </label>
              <input
                id="mark-complete-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent-dark"
              />
              <p className="mt-1 text-[10px] text-muted">
                Just for this email — won&apos;t change their saved email.
              </p>
              <div className="mt-2.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setChosen(null)}
                  disabled={sending}
                  className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !email.trim()}
                  className="flex-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
