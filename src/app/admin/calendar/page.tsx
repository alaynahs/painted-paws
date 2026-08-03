import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import PawIcon from "@/components/paw-icon";
import CalendarDayCell from "@/components/calendar-day-cell";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayISO() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { month: monthParam } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells: { iso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    const cellDate = new Date(year, month, dayNum);
    cells.push({
      iso: toISO(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()),
      day: cellDate.getDate(),
      inMonth: cellDate.getMonth() === month,
    });
  }

  const gridStart = cells[0].iso;
  const gridEnd = cells[cells.length - 1].iso;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appointment_date, appointment_hour, pets(name)")
    .neq("status", "cancelled")
    .gte("appointment_date", gridStart)
    .lte("appointment_date", gridEnd)
    .order("appointment_hour", { ascending: true });

  const appointmentsByDay: Record<
    string,
    { id: string; hour: number; petName: string }[]
  > = {};
  for (const appt of appointments ?? []) {
    const list = appointmentsByDay[appt.appointment_date] ?? [];
    const pet = Array.isArray(appt.pets) ? appt.pets[0] : appt.pets;
    list.push({
      id: appt.id,
      hour: appt.appointment_hour,
      petName: pet?.name ?? "Unknown pet",
    });
    appointmentsByDay[appt.appointment_date] = list;
  }

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const today = todayISO();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Admin
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-foreground">Calendar</h1>
        <Link
          href="/admin"
          className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Week view
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin/calendar?month=${prevYear}-${pad(prevMonth + 1)}`}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          ← Previous month
        </Link>
        <p className="flex items-center gap-2 text-center font-serif text-lg text-foreground">
          <PawIcon className="h-4 w-4 text-accent-dark" />
          {MONTH_NAMES[month]} {year}
        </p>
        <Link
          href={`/admin/calendar?month=${nextYear}-${pad(nextMonth + 1)}`}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
        >
          Next month →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted sm:gap-2">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((cell) => (
          <CalendarDayCell
            key={cell.iso}
            iso={cell.iso}
            day={cell.day}
            inMonth={cell.inMonth}
            isToday={cell.iso === today}
            appointments={appointmentsByDay[cell.iso] ?? []}
          />
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Each paw print is one scheduled appointment. Hover or tap a day to
        preview times and pets, click a booking to open it directly, or jump
        to its week in the schedule.
      </p>
    </div>
  );
}
