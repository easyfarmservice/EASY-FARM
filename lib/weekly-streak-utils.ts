/**
 * Weekly Streak cycle utilities
 * Handles Asia/Kolkata timezone calculations, ISO week numbering,
 * cycle boundary determinations and consecutive streak calculations.
 */

export interface WeeklyCycleInfo {
  cycle_id: string; // e.g. '2026-W45'
  start_date: string; // 'YYYY-MM-DD' (Monday)
  end_date: string;   // 'YYYY-MM-DD' (Sunday)
  delivery_date: string; // 'YYYY-MM-DD' (Sunday)
  year: number;
  week_number: number;
}

/**
 * Returns current date/time converted to Asia/Kolkata
 */
export function getNowInKolkata(): Date {
  const now = new Date();
  const kolkataStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(kolkataStr);
}

/**
 * Given a date or ISO string, calculates the standard Easy Farm weekly cycle:
 * Monday 00:00:00 through Sunday 23:59:59 (Delivery on Sunday).
 */
export function getWeeklyCycleForDate(inputDate?: Date | string | null): WeeklyCycleInfo {
  const d = inputDate ? (typeof inputDate === 'string' ? new Date(inputDate) : new Date(inputDate)) : getNowInKolkata();
  
  // Normalize date to Asia/Kolkata string YYYY-MM-DD
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 'en-CA' outputs YYYY-MM-DD
  const [y, m, dayNum] = dateStr.split('-').map(Number);
  
  // Target UTC date representation
  const target = new Date(Date.UTC(y, m - 1, dayNum));
  const day = target.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

  // Calculate Monday of this week (if day === 0 (Sunday), Monday was 6 days ago)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() + diffToMonday);

  // Sunday of this week is Monday + 6 days
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  // ISO 8601 week number calculation based on Thursday
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - (firstDay - 1) + 3);

  const weekNumber = Math.round(
    ((thursday.getTime() - firstThursday.getTime()) / 86400000) / 7
  ) + 1;

  const isoYear = thursday.getUTCFullYear();
  const padWeek = String(weekNumber).padStart(2, '0');
  const cycle_id = `${isoYear}-W${padWeek}`;

  const formatIsoDate = (dt: Date) => dt.toISOString().split('T')[0];

  return {
    cycle_id,
    start_date: formatIsoDate(monday),
    end_date: formatIsoDate(sunday),
    delivery_date: formatIsoDate(sunday),
    year: isoYear,
    week_number: weekNumber,
  };
}

/**
 * Returns difference in weeks between two cycle IDs (e.g. '2026-W45' and '2026-W44')
 * If cycleB immediately follows cycleA, returns 1.
 */
export function getWeeksBetweenCycles(cycleA: string, cycleB: string): number {
  if (cycleA === cycleB) return 0;
  
  const parseCycle = (c: string) => {
    const [yStr, wStr] = c.split('-W');
    return { year: parseInt(yStr, 10), week: parseInt(wStr, 10) };
  };

  const a = parseCycle(cycleA);
  const b = parseCycle(cycleB);

  // Convert year & week to approximate ordinal week number
  const ordA = a.year * 52 + a.week;
  const ordB = b.year * 52 + b.week;

  return ordB - ordA;
}

/**
 * Returns the immediate previous cycle ID (e.g., '2026-W45' -> '2026-W44')
 */
export function getPreviousCycleId(cycleId: string): string {
  const [yStr, wStr] = cycleId.split('-W');
  let y = parseInt(yStr, 10);
  let w = parseInt(wStr, 10);

  if (w <= 1) {
    y -= 1;
    w = 52; // standard 52 weeks
  } else {
    w -= 1;
  }

  return `${y}-W${String(w).padStart(2, '0')}`;
}

