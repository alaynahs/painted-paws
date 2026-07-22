"use client";

import { useEffect, useState } from "react";
import PawIcon from "./paw-icon";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function DatePickerCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  loadUnavailableDates,
}: {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  loadUnavailableDates?: (startDate: string, endDate: string) => Promise<string[]>;
}) {
  const selected = parseISO(value || maxDate || minDate || toISO(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  ));
  const min = minDate ? parseISO(minDate) : null;
  const max = maxDate ? parseISO(maxDate) : null;
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());

  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInThisMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInThisMonth; d++) cells.push(d);

  useEffect(() => {
    if (!loadUnavailableDates) return;
    let cancelled = false;
    const start = toISO(viewYear, viewMonth, 1);
    const end = toISO(viewYear, viewMonth, daysInThisMonth);
    loadUnavailableDates(start, end).then((dates) => {
      if (!cancelled) setUnavailable(new Set(dates));
    });
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth, daysInThisMonth, loadUnavailableDates]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const earliestYear = Math.min(
    min?.getFullYear() ?? today.getFullYear() - 25,
    today.getFullYear() - 25,
  );
  const latestYear = Math.max(
    max?.getFullYear() ?? today.getFullYear() + 1,
    today.getFullYear() + 1,
  );
  const yearOptions: number[] = [];
  for (let y = latestYear; y >= earliestYear; y--) yearOptions.push(y);

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Previous month"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-tint hover:text-accent-dark"
        >
          ‹
        </button>
        <div className="flex items-center gap-1.5">
          <PawIcon className="h-4 w-4 shrink-0 text-accent-dark" />
          <select
            aria-label="Month"
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="rounded-lg border-none bg-transparent font-serif text-lg text-foreground outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="rounded-lg border-none bg-transparent font-serif text-lg text-foreground outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Next month"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-tint hover:text-accent-dark"
        >
          ›
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted">
        {DAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateObj = new Date(viewYear, viewMonth, d);
          const iso = toISO(viewYear, viewMonth, d);
          const isUnavailable = unavailable.has(iso);
          const isOutOfRange =
            (min !== null && dateObj < min) || (max !== null && dateObj > max) || isUnavailable;
          const isSelected = iso === value;
          const isToday = dateObj.getTime() === today.getTime();

          return (
            <button
              key={i}
              type="button"
              disabled={isOutOfRange}
              title={isUnavailable ? "Not available" : undefined}
              onClick={() => onChange(iso)}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-sm transition-colors disabled:cursor-not-allowed sm:h-12 sm:w-12 ${
                isUnavailable
                  ? "text-muted/40 line-through decoration-muted/60"
                  : "disabled:text-muted/40"
              } ${
                isSelected
                  ? "bg-accent font-medium text-white"
                  : isToday
                    ? "border border-accent-dark font-medium text-accent-dark"
                    : "text-foreground/80 hover:bg-accent-tint"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
