export type Interval = { start: number; end: number };

const dayMinutes = 1440;
const grid = 5;
const choiceStep = 15;
const literalPattern = /^\{(\[\d+,\d+\)(,\[\d+,\d+\))*)?\}$/;

// PostgREST returns int4multirange as "{[600,840),[900,1140)}".
export function parseHours(literal: string): Interval[] | null {
  if (!literalPattern.test(literal)) return null;
  return [...literal.matchAll(/\[(\d+),(\d+)\)/g)].map((match) => ({
    start: Number(match[1]),
    end: Number(match[2]),
  }));
}

export function formatHours(intervals: Interval[]): string {
  return `{${intervals.map((i) => `[${i.start},${i.end})`).join(",")}}`;
}

export function areValidIntervals(intervals: Interval[]): boolean {
  const fits = intervals.every(
    (i) =>
      Number.isInteger(i.start) &&
      Number.isInteger(i.end) &&
      i.start >= 0 &&
      i.end <= dayMinutes &&
      i.start < i.end &&
      i.start % grid === 0 &&
      i.end % grid === 0,
  );
  if (!fits) return false;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  return sorted.every(
    (i, index) => index === 0 || sorted[index - 1].end <= i.start,
  );
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const merged: Interval[] = [];
  for (const interval of [...intervals].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function timeLabel(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function intervalsLabel(intervals: Interval[]): string {
  return intervals
    .map((i) => `${timeLabel(i.start)}–${timeLabel(i.end)}`)
    .join(", ");
}

// A value saved outside the grid, for example by an agent, stays selectable.
export function timeChoices(edge: "start" | "end", current: number): number[] {
  const first = edge === "start" ? 0 : choiceStep;
  const count = dayMinutes / choiceStep;
  const choices = Array.from(
    { length: count },
    (_, i) => first + i * choiceStep,
  );
  if (!choices.includes(current)) choices.push(current);
  return choices.sort((a, b) => a - b);
}
