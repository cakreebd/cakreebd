export function addCalendarMonth(date: Date) {
  const deadline = new Date(date);
  const day = deadline.getUTCDate();
  deadline.setUTCDate(1);
  deadline.setUTCMonth(deadline.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0),
  ).getUTCDate();
  deadline.setUTCDate(Math.min(day, lastDay));
  return deadline;
}

export function formatJobDeadline(date: Date) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeZone: "Asia/Dhaka",
  }).format(date);
}
