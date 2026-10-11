import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY,
  blankDay,
  cloneActivities,
  editActivity,
  examplePlan,
  getDay,
  insertActivity,
  moveBoundary,
  newStore,
  removeActivity,
  shiftDate,
  totals,
  validActivities,
  validStore,
  weekDates,
} from "../src/planner.ts";
const ensureFullDay = (activities) => {
  assert.ok(validActivities(activities));
  assert.equal(
    Object.values(totals(activities)).reduce((sum, value) => sum + value, 0),
    DAY,
  );
};

test("the example covers a full day, including sleep on both sides of midnight", () => {
  const plan = examplePlan();
  ensureFullDay(plan);
  assert.equal(totals(plan).Sleep, 480);
  assert.equal(totals(plan).Work, 450);
});
test("boundary dragging snaps to five minutes and adjusts both neighbors", () => {
  const plan = examplePlan();
  const moved = moveBoundary(plan, 1, 433);
  ensureFullDay(moved);
  assert.equal(moved[0].end, 435);
  assert.equal(moved[1].start, 435);
  assert.equal(plan[0].end, 420);
});
test("boundaries cannot swallow neighbors or move midnight", () => {
  const plan = examplePlan();
  const low = moveBoundary(plan, 1, -1000);
  const high = moveBoundary(plan, 1, 10000);
  assert.equal(low[0].end, 5);
  assert.equal(high[1].start, 475);
  ensureFullDay(low);
  ensureFullDay(high);
  assert.deepEqual(moveBoundary(plan, 0, 40), plan);
  assert.deepEqual(moveBoundary(plan, plan.length, 40), plan);
});
test("inserting an activity splits the old segment and preserves full-day coverage", () => {
  const plan = examplePlan();
  const next = insertActivity(plan, {
    id: "test",
    name: "Read",
    category: "Personal",
    start: 570,
    end: 630,
  });
  ensureFullDay(next);
  assert.equal(next.length, plan.length + 2);
  assert.equal(totals(next).Personal, 120);
  assert.equal(totals(next).Work, 390);
});
test("an activity can replace several segments without leaving gaps", () => {
  const next = insertActivity(examplePlan(), {
    id: "test",
    name: "Day trip",
    category: "Leisure",
    start: 300,
    end: 1000,
  });
  ensureFullDay(next);
  assert.equal(next.find((a) => a.id === "test").end, 1000);
});
test("invalid ranges and unsnapped times are rejected", () => {
  for (const [start, end] of [
    [600, 590],
    [-5, 20],
    [1400, 1450],
    [421, 450],
    [420, 421],
  ])
    assert.throws(() =>
      insertActivity(examplePlan(), {
        id: "test",
        name: "Invalid",
        category: "Other",
        start,
        end,
      }),
    );
});
test("editing times reallocates adjacent time while midnight stays fixed", () => {
  const plan = examplePlan();
  const next = editActivity(plan, {
    ...plan[1],
    start: 430,
    end: 490,
    name: "New morning",
  });
  ensureFullDay(next);
  assert.equal(next[0].end, 430);
  assert.equal(next[2].start, 490);
  assert.throws(() => editActivity(plan, { ...plan[0], start: 5 }));
  assert.throws(() => editActivity(plan, { ...plan[1], end: 510 }));
});
test("deleting gives time to a neighbor and never removes the entire day", () => {
  const plan = examplePlan();
  ensureFullDay(removeActivity(plan, plan[0].id));
  ensureFullDay(removeActivity(plan, plan[6].id));
  const only = blankDay().Plan;
  assert.deepEqual(removeActivity(only, only[0].id), only);
});
test("cloning records preserves activities with independent identifiers", () => {
  const plan = examplePlan();
  const copy = cloneActivities(plan);
  ensureFullDay(copy);
  assert.notEqual(copy[0].id, plan[0].id);
  copy[0].name = "Edited";
  assert.notEqual(plan[0].name, copy[0].name);
});
test("weekday templates apply only to new matching days, never to existing records", () => {
  const store = newStore("2026-10-11");
  store.templates.push({
    id: "t",
    name: "Weekday",
    weekdays: [1, 2, 3, 4, 5],
    activities: examplePlan(),
  });
  assert.equal(getDay(store, "2026-10-12").Plan.length, 13);
  assert.equal(getDay(store, "2026-10-17").Plan.length, 1);
  assert.equal(
    getDay(store, "2026-10-11").Plan[0].id,
    store.records["2026-10-11"].Plan[0].id,
  );
  assert.equal(getDay(store, "2026-10-12").Actual.length, 1);
});
test("calendar navigation handles month/year boundaries and Monday-based weeks", () => {
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(weekDates("2026-10-11"), [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ]);
});
test("backup validation rejects gaps, duplicate IDs, unknown categories and invalid dates", () => {
  const store = newStore("2026-10-11");
  assert.ok(validStore(JSON.parse(JSON.stringify(store))));
  const plan = examplePlan();
  assert.equal(
    validActivities([{ ...plan[0], end: 415 }, ...plan.slice(1)]),
    false,
  );
  assert.equal(
    validActivities(
      plan.map((a, i) => (i === 1 ? { ...a, id: plan[0].id } : a)),
    ),
    false,
  );
  assert.equal(
    validActivities([
      { id: "x", name: "Invalid", category: "Shopping", start: 0, end: DAY },
    ]),
    false,
  );
  assert.equal(
    validStore({ ...store, records: { "2026-02-31": blankDay() } }),
    false,
  );
});
