// Works out when each module opens for a batch.
//
// Dates are calendar days ("2026-11-01"). A module opens at midnight India time on its
// date: the batch's start date plus the module's unlock_after_days, unless the batch has
// its own date for that module. Students who join late get everything already open,
// because dates count from the batch start, not from when they enrolled.

export interface BatchSchedule {
  batch_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  module_dates: { module_id: string; unlock_date: string }[];
}

const INDIA_OFFSET = "+05:30";

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function opensAt(day: string): Date {
  return new Date(`${day}T00:00:00${INDIA_OFFSET}`);
}

export function isOpen(day: string, now: Date = new Date()): boolean {
  return now.getTime() >= opensAt(day).getTime();
}

export function moduleUnlockDate(
  batch: Pick<BatchSchedule, "start_date" | "module_dates">,
  module_id: string,
  unlock_after_days: number
): { date: string; overridden: boolean } {
  const own = batch.module_dates.find((m) => m.module_id === module_id);
  if (own) return { date: own.unlock_date, overridden: true };
  return { date: addDays(batch.start_date, Math.max(0, unlock_after_days)), overridden: false };
}
