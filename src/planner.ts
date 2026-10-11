export const DAY = 1440;
export const STEP = 5;
export const CATEGORIES = [
  { id: "Sleep", color: "#9eb9b4", dark: "#56756f" },
  { id: "Work", color: "#bbcf96", dark: "#657b42" },
  { id: "Commute", color: "#c5c3d7", dark: "#79728e" },
  { id: "Exercise", color: "#e5bc8e", dark: "#9c7043" },
  { id: "Meals", color: "#edda9d", dark: "#a18a3d" },
  { id: "Family", color: "#dba8a3", dark: "#9f6b67" },
  { id: "Personal", color: "#adc4d9", dark: "#637f97" },
  { id: "Leisure", color: "#cbb5cd", dark: "#8c6b8f" },
  { id: "Other", color: "#d8dbd3", dark: "#808779" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];
export type Mode = "Plan" | "Actual";
export type Activity = {
  id: string;
  name: string;
  category: Category;
  start: number;
  end: number;
};
export type DayRecord = Record<Mode, Activity[]>;
export type Template = {
  id: string;
  name: string;
  weekdays: number[];
  activities: Activity[];
};
export type Store = {
  version: 1;
  records: Record<string, DayRecord>;
  templates: Template[];
};
export const STORAGE_KEY = "timepie.v1";
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}
export function shiftDate(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
export function weekDates(date: string): string[] {
  const start = shiftDate(date, -((parseDate(date).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
}
export function timeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  return `${h ? `${h}h` : ""}${h && m ? " " : ""}${m ? `${m}m` : ""}` || "0h";
}
export function decimalHours(minutes: number): string {
  return (minutes / 60).toFixed(1).replace(/\.0$/, "");
}
export function percent(minutes: number): string {
  return `${((minutes / DAY) * 100).toFixed(1)}%`;
}
export const categoryMeta = (category: Category) =>
  CATEGORIES.find((c) => c.id === category)!;
export const cloneActivities = (activities: Activity[]) =>
  activities.map((a) => ({ ...a, id: uid() }));
export function blankDay(): DayRecord {
  return {
    Plan: [
      {
        id: uid(),
        name: "Unallocated time",
        category: "Other",
        start: 0,
        end: DAY,
      },
    ],
    Actual: [
      {
        id: uid(),
        name: "Untracked time",
        category: "Other",
        start: 0,
        end: DAY,
      },
    ],
  };
}
export function examplePlan(): Activity[] {
  const entries: [string, Category, number][] = [
    ["A good night’s sleep", "Sleep", 420],
    ["Morning routine", "Personal", 480],
    ["Breakfast", "Meals", 510],
    ["On the way to work", "Commute", 540],
    ["Deep work", "Work", 720],
    ["Lunch & a little reset", "Meals", 780],
    ["Afternoon focus", "Work", 1050],
    ["Heading home", "Commute", 1080],
    ["Move your body", "Exercise", 1140],
    ["Time with family", "Family", 1200],
    ["Dinner", "Meals", 1230],
    ["A little me time", "Leisure", 1380],
    ["Wind down & sleep", "Sleep", DAY],
  ];
  let start = 0;
  return entries.map(([name, category, end]) => {
    const a = { id: uid(), name, category, start, end };
    start = end;
    return a;
  });
}
export function newStore(today: string): Store {
  const day = blankDay();
  day.Plan = examplePlan();
  return { version: 1, records: { [today]: day }, templates: [] };
}
export function getDay(store: Store, date: string): DayRecord {
  if (store.records[date]) return store.records[date];
  const day = blankDay();
  const template = store.templates.find((t) =>
    t.weekdays.includes(parseDate(date).getDay()),
  );
  if (template) day.Plan = cloneActivities(template.activities);
  return day;
}
export function totals(activities: Activity[]): Record<Category, number> {
  const result = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<
    Category,
    number
  >;
  activities.forEach((a) => {
    result[a.category] += a.end - a.start;
  });
  return result;
}
export function moveBoundary(
  activities: Activity[],
  index: number,
  value: number,
): Activity[] {
  if (index < 1 || index >= activities.length) return activities;
  const time = Math.max(
    activities[index - 1].start + STEP,
    Math.min(activities[index].end - STEP, Math.round(value / STEP) * STEP),
  );
  return activities.map((a, i) =>
    i === index - 1
      ? { ...a, end: time }
      : i === index
        ? { ...a, start: time }
        : a,
  );
}
export function insertActivity(
  activities: Activity[],
  activity: Activity,
): Activity[] {
  if (
    !Number.isInteger(activity.start) ||
    !Number.isInteger(activity.end) ||
    activity.start % STEP ||
    activity.end % STEP ||
    activity.start < 0 ||
    activity.end > DAY ||
    activity.end - activity.start < STEP
  )
    throw new Error("Choose a valid time range in 5-minute intervals.");
  const result: Activity[] = [];
  for (const a of activities) {
    if (a.end <= activity.start || a.start >= activity.end) result.push(a);
    else {
      if (a.start < activity.start) result.push({ ...a, end: activity.start });
      if (a.end > activity.end)
        result.push({ ...a, id: uid(), start: activity.end });
    }
  }
  result.push(activity);
  return result.sort((a, b) => a.start - b.start);
}
export function removeActivity(activities: Activity[], id: string): Activity[] {
  const index = activities.findIndex((a) => a.id === id);
  if (index < 0 || activities.length === 1) return activities;
  const copy = activities.map((a) => ({ ...a }));
  if (index > 0) copy[index - 1].end = copy[index].end;
  else copy[1].start = 0;
  copy.splice(index, 1);
  return copy;
}
export function validActivities(value: unknown): value is Activity[] {
  if (!Array.isArray(value) || !value.length) return false;
  let end = 0;
  const ids = new Set();
  for (const a of value) {
    if (
      !a ||
      typeof a.id !== "string" ||
      ids.has(a.id) ||
      typeof a.name !== "string" ||
      !a.name.trim() ||
      a.name.length > 100 ||
      !CATEGORIES.some((c) => c.id === a.category) ||
      !Number.isInteger(a.start) ||
      !Number.isInteger(a.end) ||
      a.start !== end ||
      a.end - a.start < STEP ||
      a.start % STEP ||
      a.end % STEP
    )
      return false;
    ids.add(a.id);
    end = a.end;
  }
  return end === DAY;
}
export function validStore(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const s = value as Store;
  if (
    s.version !== 1 ||
    !s.records ||
    typeof s.records !== "object" ||
    Array.isArray(s.records) ||
    !Array.isArray(s.templates)
  )
    return false;
  return (
    Object.entries(s.records).every(
      ([key, day]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(key) &&
        dateKey(parseDate(key)) === key &&
        day &&
        validActivities(day.Plan) &&
        validActivities(day.Actual),
    ) &&
    s.templates.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.name === "string" &&
        t.name.trim() &&
        t.name.length <= 60 &&
        Array.isArray(t.weekdays) &&
        t.weekdays.length &&
        t.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
        validActivities(t.activities),
    )
  );
}
export function editActivity(
  activities: Activity[],
  updated: Activity,
): Activity[] {
  const index = activities.findIndex((a) => a.id === updated.id);
  if (index < 0) throw new Error("This activity no longer exists.");
  if (
    updated.start % STEP ||
    updated.end % STEP ||
    updated.end - updated.start < STEP
  )
    throw new Error(
      "Use 5-minute intervals, with at least 5 minutes per activity.",
    );
  if (
    (index === 0 && updated.start !== 0) ||
    (index === activities.length - 1 && updated.end !== DAY)
  )
    throw new Error("The day must begin at 00:00 and end at 24:00.");
  if (
    (index > 0 && updated.start < activities[index - 1].start + STEP) ||
    (index < activities.length - 1 &&
      updated.end > activities[index + 1].end - STEP)
  )
    throw new Error("Leave at least 5 minutes for each neighboring activity.");
  return activities.map((a, i) =>
    i === index
      ? updated
      : i === index - 1
        ? { ...a, end: updated.start }
        : i === index + 1
          ? { ...a, start: updated.end }
          : a,
  );
}
