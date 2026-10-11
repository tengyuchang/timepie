import { test, expect, type Page } from "@playwright/test";
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("timepie.v1")!));
const recordDate = (page: Page) =>
  page.locator('input[aria-label="Choose date"]').inputValue();
async function addActivity(page: Page, name: string) {
  await page.getByRole("button", { name: "Add activity", exact: true }).click();
  await page.getByLabel("Activity name").fill(name);
  await page.getByLabel("Category", { exact: true }).selectOption("Exercise");
  await page.getByLabel("Start time", { exact: true }).selectOption("540");
  await page.getByLabel("End time", { exact: true }).selectOption("600");
  await page
    .getByRole("button", { name: "Add activity", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your day, at a glance." }),
  ).toBeVisible();
});
test("wheel drag snaps, preserves day coverage, and saves after reload", async ({
  page,
}) => {
  const date = await recordDate(page);
  const handle = page.getByRole("slider").first();
  await expect(handle).toHaveAttribute("aria-valuenow", "420");
  const box = (await page.locator(".time-wheel").boundingBox())!;
  const pos = (minutes: number) => {
    const angle = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
    return {
      x: box.x + (box.width * (230 + 164 * Math.cos(angle))) / 460,
      y: box.y + (box.height * (230 + 164 * Math.sin(angle))) / 460,
    };
  };
  const start = pos(420),
    end = pos(437);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "435");
  const plan = (await saved(page)).records[date].Plan;
  expect(plan[0].end).toBe(435);
  expect(plan[1].start).toBe(435);
  expect(
    plan.reduce(
      (sum: number, a: { start: number; end: number }) => sum + a.end - a.start,
      0,
    ),
  ).toBe(1440);
  await page.reload();
  await expect(page.getByRole("slider").first()).toHaveAttribute(
    "aria-valuenow",
    "435",
  );
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("slider").first()).toHaveAttribute(
    "aria-valuenow",
    "440",
  );
});
test("adding, editing and deleting activities keeps a complete schedule", async ({
  page,
}) => {
  const date = await recordDate(page);
  await addActivity(page, "Morning walk");
  await expect(
    page.getByRole("button", {
      name: "Morning walk, 09:00 to 10:00, 1h. Edit activity.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Morning walk, 09:00 to 10:00, 1h. Edit activity.",
    })
    .click();
  await page.getByLabel("Activity name").fill("Morning run");
  await page.getByLabel("End time", { exact: true }).selectOption("615");
  await page.getByRole("button", { name: "Save changes" }).click();
  expect(
    (await saved(page)).records[date].Plan.find(
      (a: { name: string }) => a.name === "Morning run",
    ).end,
  ).toBe(615);
  await page
    .getByRole("button", {
      name: "Morning run, 09:00 to 10:15, 1h 15m. Edit activity.",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const plan = (await saved(page)).records[date].Plan;
  expect(plan.some((a: { name: string }) => a.name === "Morning run")).toBe(
    false,
  );
  expect(
    plan.reduce(
      (sum: number, a: { start: number; end: number }) => sum + a.end - a.start,
      0,
    ),
  ).toBe(1440);
});
test("Actual is independent, can start from Plan, and comparison shows both", async ({
  page,
}) => {
  const date = await recordDate(page);
  const plan = (await saved(page)).records[date].Plan;
  await page.getByRole("tab", { name: "Actual", exact: true }).click();
  await expect(page.locator(".outline-badge")).toContainText("Actual day");
  await expect(
    page.getByRole("button", {
      name: "Untracked time, 00:00 to 24:00, 24h. Edit activity.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use plan as a starting point" })
    .click();
  await page.getByRole("button", { name: /Confirm/ }).click();
  await addActivity(page, "Actual walk");
  expect((await saved(page)).records[date].Plan).toEqual(plan);
  expect(
    (await saved(page)).records[date].Actual.some(
      (a: { name: string }) => a.name === "Actual walk",
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Plan meets reality" }),
  ).toBeVisible();
  await expect(page.locator(".timeline-track")).toHaveCount(2);
});
test("navigation and Copy Yesterday preserve independent dated records", async ({
  page,
}) => {
  const date = await recordDate(page);
  await addActivity(page, "Yesterday’s walk");
  await page.getByRole("button", { name: "Next Day", exact: true }).click();
  const nextDate = await recordDate(page);
  expect(nextDate).not.toEqual(date);
  await expect(
    page.getByRole("button", {
      name: "Unallocated time, 00:00 to 24:00, 24h. Edit activity.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy yesterday" }).click();
  await page.getByRole("button", { name: /Confirm/ }).click();
  const store = await saved(page);
  expect(
    store.records[nextDate].Plan.map((a: { name: string }) => a.name),
  ).toEqual(store.records[date].Plan.map((a: { name: string }) => a.name));
  expect(store.records[nextDate].Plan[0].id).not.toEqual(
    store.records[date].Plan[0].id,
  );
  await page.getByRole("button", { name: "Previous Day", exact: true }).click();
  expect(await recordDate(page)).toEqual(date);
});
test("templates persist and are automatically applied to a new weekday", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Save as template" }).click();
  await page.getByLabel("Template name").fill("My focused weekdays");
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await page.getByRole("button", { name: /My templates/ }).click();
  await expect(
    page.getByRole("heading", { name: "My focused weekdays" }),
  ).toBeVisible();
  await page.getByLabel("Choose date").fill("2030-01-07");
  await page
    .getByRole("button", { name: "Daily planner", exact: true })
    .click();
  await expect(page.locator(".wheel-segment")).toHaveCount(13);
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  await page.reload();
  await page.getByRole("button", { name: /My templates/ }).click();
  await expect(
    page.getByRole("heading", { name: "My focused weekdays" }),
  ).toBeVisible();
});
test("weekly averages use recorded days and an empty week is distinct", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Weekly overview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your average day" }),
  ).toBeVisible();
  await expect(
    page.locator(".weekly-category .category-row").filter({ hasText: "Sleep" }),
  ).toContainText("8h");
  await expect(
    page.locator(".weekly-category .category-row").filter({ hasText: "Sleep" }),
  ).toContainText("33.3%");
  await page.getByLabel("Choose date").fill("2030-03-04");
  await expect(
    page.getByRole("heading", { name: "A fresh week awaits." }),
  ).toBeVisible();
  await expect(page.locator(".category-total")).toContainText("0h");
});
test("backup export, import and data recovery validate the format", async ({
  page,
}) => {
  await addActivity(page, "Backup walk");
  await page.getByRole("button", { name: "Open storage settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export a backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^timepie-.*\.json$/);
  const data = await saved(page);
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  await expect(
    page.getByRole("heading", { name: "Restore your backup?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Confirm/ }).click();
  expect(await saved(page)).toEqual(data);
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.getByRole("status")).toContainText(
    "not a valid Timepie backup",
  );
  expect(await saved(page)).toEqual(data);
});
test("responsive layout has no horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Weekly overview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little perspective." }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
test("unreadable saved data is preserved until a valid backup is restored", async ({
  page,
}) => {
  const backup = await saved(page);
  await page.evaluate(() =>
    localStorage.setItem("timepie.v1", '{"version":99,"records":{}}'),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Saved data is unreadable",
  );
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => localStorage.getItem("timepie.v1"))).toBe(
    '{"version":99,"records":{}}',
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page.getByRole("button", { name: /Confirm/ }).click();
  await expect(page.getByRole("alert")).not.toBeVisible();
  expect(await saved(page)).toEqual(backup);
});
test("saved templates can be applied and removed without deleting day records", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Save as template" }).click();
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await page.getByRole("button", { name: "Next Day", exact: true }).click();
  const date = await recordDate(page);
  await page.getByRole("button", { name: /My templates/ }).click();
  await page.getByRole("button", { name: "Use for selected day" }).click();
  await page.getByRole("button", { name: /Confirm/ }).click();
  await expect(page.locator(".wheel-segment")).toHaveCount(13);
  await page.getByRole("button", { name: /My templates/ }).click();
  await page.getByRole("button", { name: "Delete My weekday rhythm" }).click();
  await page.getByRole("button", { name: /Confirm/ }).click();
  expect((await saved(page)).templates).toHaveLength(0);
  expect((await saved(page)).records[date].Plan).toHaveLength(13);
});
