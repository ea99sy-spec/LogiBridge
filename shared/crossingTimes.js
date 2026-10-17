// "Best time to cross": every queue report (from drivers, companies and GPS) is added to a
// running average per crossing, weekday and part of the day, in border local time (UTC+3).
// Levels: 0 clear, 1 under 2 h, 2: 2–6 h, 3: 6–12 h, 4: over 12 h.
export const SLOTS = ["night", "morning", "afternoon", "evening"]; // 0–6, 6–12, 12–18, 18–24
export const MIN_REPORTS = 3;

export function slotOf(iso) {
  const local = new Date(Date.parse(iso) + 3 * 3600000);
  return { day: local.getUTCDay(), slot: Math.floor(local.getUTCHours() / 6) };
}

// Adds one report to the stored averages (registered world only).
export function addCrossingStat(s, crossing, level, at, demo) {
  if (demo || !crossing || !(level >= 0 && level <= 4)) return;
  const { day, slot } = slotOf(at || new Date().toISOString());
  s.crossingStats ||= {};
  const grid = (s.crossingStats[crossing] ||= Array.from({ length: 7 }, () => SLOTS.map(() => [0, 0])));
  grid[day][slot][0] += level;
  grid[day][slot][1] += 1;
}

// Average level per cell (null without enough reports) and the best times.
export function crossingTimes(stats, crossing) {
  const grid = stats?.[crossing];
  if (!grid) return { cells: null, best: [], reports: 0 };
  let reports = 0;
  const cells = grid.map((row) =>
    row.map(([sum, count]) => {
      reports += count;
      return count >= MIN_REPORTS
        ? { avg: Math.round((sum / count) * 10) / 10, count }
        : { avg: null, count };
    }),
  );
  const best = [];
  cells.forEach((row, day) => row.forEach((c, slot) => c.avg !== null && best.push({ day, slot, ...c })));
  best.sort((a, b) => a.avg - b.avg || b.count - a.count);
  return { cells, best: best.slice(0, 3), reports };
}
