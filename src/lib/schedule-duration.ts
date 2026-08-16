// Appointments only ever store a start time, not a duration — there's
// nothing in the data model to size a calendar block with. These are
// reasonable estimates for how long each service actually takes in the
// chair, used purely to size/position blocks on the admin time-grid
// (src/components/admin-schedule-grid.tsx). Never used for pricing,
// availability, or conflict prevention.
const BASE_MINUTES: Record<string, number> = {
  bath: 60,
  trim: 90,
  haircut: 150,
  puppyIntro: 45,
  lightTrim: 75,
  fleaBath: 45,
  fleaBathTidy: 75,
  standalone: 30,
};

export function estimateDurationMinutes(
  service: string,
  addOns: string[],
): number {
  let minutes = BASE_MINUTES[service] ?? 60;

  if (addOns.some((a) => /de-shed/i.test(a))) minutes += 20;
  if (addOns.some((a) => /color pop|showstopper|fantasy/i.test(a))) {
    minutes += 30;
  }
  if (addOns.some((a) => /pickup.*drop-off|drop-off.*pickup/i.test(a))) {
    minutes += 15;
  }

  return minutes;
}
