"use client";

import { useState } from "react";

export type YesNo = "yes" | "no" | null;

export interface WaiverState {
  vaccinatedLast24h: YesNo;
  behavioralConcerns: YesNo;
  behavioralNote: string;
  seniorOrSpecialNeeds: YesNo;
  seniorNote: string;
  severelyMatted: YesNo;
  mattedNote: string;
  emergencyConsent: boolean;
  photoConsent: boolean;
  liabilityAccepted: boolean;
  signedName: string;
}

export const WAIVER_DEFAULTS: WaiverState = {
  vaccinatedLast24h: null,
  behavioralConcerns: null,
  behavioralNote: "",
  seniorOrSpecialNeeds: null,
  seniorNote: "",
  severelyMatted: null,
  mattedNote: "",
  // Neither is a separate checkbox — both are covered by the single
  // liability acceptance below, so they're implicitly agreed to.
  emergencyConsent: true,
  photoConsent: true,
  liabilityAccepted: false,
  signedName: "",
};

export function isWaiverValid(w: WaiverState): boolean {
  return (
    w.vaccinatedLast24h === "no" &&
    w.liabilityAccepted &&
    w.signedName.trim() !== ""
  );
}

function YesNoPills({
  value,
  onChange,
}: {
  value: YesNo;
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      {(["no", "yes"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            value === v
              ? "border-accent bg-accent text-white"
              : "border-border bg-card text-foreground/80 hover:border-accent-dark"
          }`}
        >
          {v === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

type ExplainKey = "behavioral" | "senior" | "matted";

const EXPLAIN_CONFIG: Record<
  ExplainKey,
  { title: string; prompt: string; field: keyof WaiverState }
> = {
  behavioral: {
    title: "Tell us a bit more",
    prompt: "What should we know about your dog's behavior during grooming?",
    field: "behavioralNote",
  },
  senior: {
    title: "Tell us a bit more",
    prompt: "What should we know about your pet's age or health condition?",
    field: "seniorNote",
  },
  matted: {
    title: "Tell us a bit more",
    prompt:
      "Can you tell us a bit about the matting, how severe, and where on the body?",
    field: "mattedNote",
  },
};

export default function WaiverSection({
  value,
  onChange,
}: {
  value: WaiverState;
  onChange: (patch: Partial<WaiverState>) => void;
}) {
  const [activeModal, setActiveModal] = useState<ExplainKey | "vaccinated24h" | null>(
    null,
  );
  const [draftNote, setDraftNote] = useState("");
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function openExplain(key: ExplainKey) {
    setDraftNote((value[EXPLAIN_CONFIG[key].field] as string) ?? "");
    setActiveModal(key);
  }

  function saveExplain() {
    if (activeModal && activeModal !== "vaccinated24h") {
      onChange({ [EXPLAIN_CONFIG[activeModal].field]: draftNote });
    }
    setActiveModal(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <input type="hidden" name="waiverSignedName" value={value.signedName} />
      <input type="hidden" name="waiverSignedDate" value={today} />
      <input
        type="hidden"
        name="waiverVaccinatedLast24h"
        value={String(value.vaccinatedLast24h === "yes")}
      />
      <input
        type="hidden"
        name="waiverBehavioralConcerns"
        value={String(value.behavioralConcerns === "yes")}
      />
      <input
        type="hidden"
        name="waiverBehavioralNote"
        value={value.behavioralNote}
      />
      <input
        type="hidden"
        name="waiverSeniorOrSpecialNeeds"
        value={String(value.seniorOrSpecialNeeds === "yes")}
      />
      <input type="hidden" name="waiverSeniorNote" value={value.seniorNote} />
      <input
        type="hidden"
        name="waiverSeverelyMatted"
        value={String(value.severelyMatted === "yes")}
      />
      <input type="hidden" name="waiverMattedNote" value={value.mattedNote} />
      <input
        type="hidden"
        name="waiverEmergencyConsent"
        value={String(value.emergencyConsent)}
      />
      <input
        type="hidden"
        name="waiverPhotoConsent"
        value={String(value.photoConsent)}
      />
      <input
        type="hidden"
        name="waiverLiabilityAccepted"
        value={String(value.liabilityAccepted)}
      />

      <h3 className="font-serif text-lg text-foreground">
        Groomer Safety Waiver
      </h3>
      <p className="mt-1 text-xs text-muted">
        Required before every appointment: a few quick questions, then sign
        below.
      </p>

      <p className="mt-3 text-xs font-medium text-foreground/80">
        Full waiver text (scroll to read):
      </p>
      <div className="mt-2 max-h-36 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-3 text-xs text-muted">
          <p>
            <strong className="text-foreground/90">
              Look Great Guarantee.
            </strong>{" "}
            If you&apos;re not happy with something about your pet&apos;s
            haircut, let us know within 3 days of the appointment and
            we&apos;ll fix it free of charge.
          </p>
          <p>
            <strong className="text-foreground/90">
              Vaccination &amp; Health Policy.
            </strong>{" "}
            Your pet must be current on all mandatory vaccinations, including
            Rabies, and we may request valid proof from your veterinarian.
            For your pet&apos;s safety, services will not be administered
            within 24 hours of receiving a new vaccination.
          </p>
          <p>
            <strong className="text-foreground/90">
              Emergency Medical Authorization.
            </strong>{" "}
            In the event of a medical emergency during care, you grant full
            authority to seek veterinary attention from the nearest available
            clinic. If the emergency stems from a pre-existing or underlying
            health condition your pet already had, you agree to cover the
            resulting veterinary costs. If it results directly from an error
            on our part during the appointment, Painted Paws will cover those
            costs instead.
          </p>
          <p>
            <strong className="text-foreground/90">
              Matting &amp; Shave-Down Consent.
            </strong>{" "}
            Severely matted coats can cause skin irritation or expose
            pre-existing conditions. You authorize a shave-down for your
            pet&apos;s comfort and safety if needed, and understand
            additional handling fees may apply.
          </p>
          <p>
            <strong className="text-foreground/90">
              Assumption of Risk.
            </strong>{" "}
            Grooming carries inherent risks, including but not limited to
            nicks, cuts, or abrasions from clippers, scissors, or nail
            trimming; skin or coat reactions to shampoos or other products;
            stress-related behavior or minor injury; and aggravation of
            pre-existing or undiagnosed health conditions. You voluntarily
            assume these risks on behalf of yourself and your pet.
          </p>
          <p>
            <strong className="text-foreground/90">
              Behavioral &amp; Refusal of Service.
            </strong>{" "}
            You must disclose any history of biting, aggression, or high
            anxiety during grooming. We may use a humane safety muzzle, and
            reserve the right to halt or refuse service if your pet poses a
            safety hazard.
          </p>
          <p>
            <strong className="text-foreground/90">
              Senior &amp; Special Needs Care.
            </strong>{" "}
            Grooming can be physically stressful for senior or chronically
            ill pets. Services are performed at your own risk, with
            procedures minimized or stopped as needed to preserve safety.
          </p>
          <p>
            <strong className="text-foreground/90">
              Photo &amp; Media Release.
            </strong>{" "}
            You grant permission for photos or video of your pet to be used
            for marketing, website design, and social media.
          </p>
          <p className="font-semibold text-foreground/90 uppercase">
            Release of Liability. To the fullest extent permitted by law, you
            release, waive, and discharge Painted Paws and its owner from any
            and all claims, demands, or causes of action arising from
            ordinary negligence in connection with grooming services,
            including the risks described above. This release does not apply
            to gross negligence or intentional misconduct.
          </p>
          <p>
            <strong className="text-foreground/90">
              Indemnification.
            </strong>{" "}
            You agree to indemnify and hold harmless Painted Paws from any
            claims, costs, or legal fees brought by a third party (including
            family members or veterinarians) arising from your pet&apos;s
            care, except where caused by Painted Paws&apos; gross negligence
            or intentional misconduct.
          </p>
          <p>
            <strong className="text-foreground/90">
              Severability &amp; Governing Law.
            </strong>{" "}
            If any part of this waiver is found unenforceable, the remaining
            terms remain in full effect. This agreement is governed by the
            laws of the State of Texas, and any dispute shall be resolved in
            the county where the appointment took place.
          </p>
          <p>
            <strong className="text-foreground/90">
              Liability Waiver Acknowledgement.
            </strong>{" "}
            By signing below, you confirm you have read, understood, and
            voluntarily accept these terms, and release Painted Paws from
            claims arising from inherent risks, hidden medical conditions, or
            accidents during the grooming session.
          </p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/90">
            Has your pet had any vaccination in the last 24 hours?
          </p>
          <YesNoPills
            value={value.vaccinatedLast24h}
            onChange={(v) => {
              onChange({ vaccinatedLast24h: v });
              if (v === "yes") setActiveModal("vaccinated24h");
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/90">
            Any history of biting, aggression, or high anxiety during
            grooming?
          </p>
          <YesNoPills
            value={value.behavioralConcerns}
            onChange={(v) => {
              onChange({ behavioralConcerns: v });
              if (v === "yes") openExplain("behavioral");
            }}
          />
        </div>
        {value.behavioralConcerns === "yes" && value.behavioralNote && (
          <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
            {value.behavioralNote}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/90">
            Is your pet a senior, or do they have a chronic health condition?
          </p>
          <YesNoPills
            value={value.seniorOrSpecialNeeds}
            onChange={(v) => {
              onChange({ seniorOrSpecialNeeds: v });
              if (v === "yes") openExplain("senior");
            }}
          />
        </div>
        {value.seniorOrSpecialNeeds === "yes" && value.seniorNote && (
          <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
            {value.seniorNote}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/90">
            Is your pet&apos;s coat currently matted?
          </p>
          <YesNoPills
            value={value.severelyMatted}
            onChange={(v) => {
              onChange({ severelyMatted: v });
              if (v === "yes") openExplain("matted");
            }}
          />
        </div>
        {value.severelyMatted === "yes" && (
          <p className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-foreground">
            A shave-down may be needed for your pet&apos;s comfort and safety.
            Additional handling fees may apply.
          </p>
        )}
        {value.severelyMatted === "yes" && value.mattedNote && (
          <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
            {value.mattedNote}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <label className="flex items-start gap-2 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={value.liabilityAccepted}
            onChange={(e) => onChange({ liabilityAccepted: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
          />
          I have read and voluntarily accept the full waiver above. Thank you
          for helping us keep every pup safe and happy! 🐾
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="waiver-signature"
          >
            E-signature (type your full name)
          </label>
          <input
            id="waiver-signature"
            type="text"
            value={value.signedName}
            onChange={(e) => onChange({ signedName: e.target.value })}
            placeholder="Full name"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm italic text-foreground outline-none focus:border-accent-dark"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Date</label>
          <p className="mt-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted">
            {today}
          </p>
        </div>
      </div>

      {activeModal === "vaccinated24h" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              Let&apos;s pick another date
            </p>
            <p className="mt-1 text-sm text-muted">
              For your pet&apos;s safety, we can&apos;t groom within 24 hours
              of a new vaccine. Please pick a later date, or contact us to
              reschedule.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Okay, got it
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal && activeModal !== "vaccinated24h" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-foreground">
              {EXPLAIN_CONFIG[activeModal].title}
            </p>
            <p className="mt-1 text-sm text-muted">
              {EXPLAIN_CONFIG[activeModal].prompt}
            </p>
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              rows={3}
              placeholder="Optional, but it helps us prepare"
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={saveExplain}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
