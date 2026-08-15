"use client";

import { useEffect, useRef, useState } from "react";
import { sendQuickMessage } from "@/app/admin/actions";
import { QUICK_MESSAGE_LABELS } from "@/lib/notifications/quick-message-labels";

const QUICK_MESSAGES: {
  type: string;
  label: string;
  prompt?: string;
  promptDefault?: string;
}[] = [
  {
    type: "pickup_on_way",
    label: QUICK_MESSAGE_LABELS.pickup_on_way,
    prompt: "ETA?",
    promptDefault: "15 minutes",
  },
  { type: "pickup_arrived", label: QUICK_MESSAGE_LABELS.pickup_arrived },
  {
    type: "pickup_cant_reach",
    label: QUICK_MESSAGE_LABELS.pickup_cant_reach,
    prompt: "How many minutes will you wait?",
    promptDefault: "10",
  },
  { type: "pickup_15min", label: QUICK_MESSAGE_LABELS.pickup_15min },
  { type: "pickup_ready", label: QUICK_MESSAGE_LABELS.pickup_ready },
  {
    type: "dropoff_on_way",
    label: QUICK_MESSAGE_LABELS.dropoff_on_way,
    prompt: "ETA?",
    promptDefault: "15 minutes",
  },
  {
    type: "no_response_warning",
    label: QUICK_MESSAGE_LABELS.no_response_warning,
  },
  {
    type: "leave_review_or_tip",
    label: QUICK_MESSAGE_LABELS.leave_review_or_tip,
  },
];

export default function QuickMessageButtons({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentType, setSentType] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function send(type: string, promptText?: string, promptDefault?: string) {
    let extra = "";
    if (promptText) {
      const value = window.prompt(promptText, promptDefault);
      if (value === null) return;
      extra = value;
    }
    setSending(type);
    const formData = new FormData();
    formData.set("appointmentId", appointmentId);
    formData.set("type", type);
    formData.set("extra", extra);
    await sendQuickMessage(formData);
    setSending(null);
    setSentType(type);
    setOpen(false);
    setTimeout(() => setSentType(null), 2000);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
      >
        {sentType ? "Sent ✓" : "Quick email ▾"}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          {QUICK_MESSAGES.map((m) => (
            <button
              key={m.type}
              type="button"
              disabled={sending === m.type}
              onClick={() => send(m.type, m.prompt, m.promptDefault)}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground/90 transition-colors hover:bg-accent-tint disabled:opacity-50"
            >
              {sending === m.type ? "Sending…" : m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
