"use client";

import { useState } from "react";
import WaiverSection, {
  WAIVER_DEFAULTS,
  isWaiverValid,
  type WaiverState,
} from "@/components/waiver-section";

export default function StandaloneWaiverForm({
  appointmentId,
  action,
}: {
  appointmentId: string;
  action: (formData: FormData) => void;
}) {
  const [waiver, setWaiver] = useState<WaiverState>(WAIVER_DEFAULTS);
  const updateWaiver = (patch: Partial<WaiverState>) =>
    setWaiver((w) => ({ ...w, ...patch }));

  return (
    <form action={action}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <WaiverSection value={waiver} onChange={updateWaiver} />
      <button
        type="submit"
        disabled={!isWaiverValid(waiver)}
        className="mt-4 w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isWaiverValid(waiver) ? "Sign Waiver" : "Complete the waiver to continue"}
      </button>
    </form>
  );
}
