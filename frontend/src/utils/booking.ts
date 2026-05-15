export type SearchMode = "one-time" | "long-term";

export type BookingParams = {
  mode: SearchMode;
  location: string;
  date: string;
  startTime?: string;
  endTime?: string;
  toDate?: string;
  durationHours?: number;
};

export function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getDurationHours(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  return Math.max((endTotal - startTotal) / 60, 0);
}

export function isValidTimeRange(startTime: string, endTime: string) {
  return getDurationHours(startTime, endTime) > 0;
}

export function isValidDateRange(fromDate: Date, toDate: Date) {
  return toDate.getTime() >= fromDate.getTime();
}

export function getDateRangeDays(fromDate: Date, toDate: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const fromStart = new Date(fromDate);
  const toStart = new Date(toDate);

  fromStart.setHours(0, 0, 0, 0);
  toStart.setHours(0, 0, 0, 0);

  return Math.max(
    Math.floor((toStart.getTime() - fromStart.getTime()) / dayMs) + 1,
    1,
  );
}

export function getBookingHours(booking: BookingParams) {
  if (booking.durationHours) {
    return booking.durationHours;
  }

  if (booking.mode === "long-term") {
    return 24;
  }

  if (!booking.startTime || !booking.endTime) {
    return 1;
  }

  return getDurationHours(booking.startTime, booking.endTime);
}

export function getBookingSummaryLabel(booking: BookingParams) {
  return booking.mode === "long-term" ? "Long-term parking" : "Short parking";
}

export function getBookingDateSummary(booking: BookingParams) {
  if (booking.mode === "long-term") {
    return `${booking.date} - ${booking.toDate ?? booking.date}`;
  }

  return `${booking.date} • ${booking.startTime ?? ""}-${
    booking.endTime ?? ""
  }`;
}

export function formatDuration(hours: number) {
  if (Number.isInteger(hours)) {
    return `${hours}h`;
  }

  return `${hours.toFixed(1)}h`;
}
