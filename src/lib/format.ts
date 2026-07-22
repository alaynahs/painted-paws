export function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${period}`;
}

export function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
