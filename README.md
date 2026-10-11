# Timepie

A personal, single-user 24-hour planner and tracker. A quiet desktop-first dashboard for making room for what matters.

## Run locally

Requires Node.js 24 and npm. No backend, account, API keys, or database are needed.

```sh
npm ci
npm run dev
```

## What you can do

- Plan a midnight-to-midnight day on a colored, circular time wheel.
- Drag dividers to resize neighboring activities, snapping to five minutes. Keyboard users can focus a divider and press arrow keys.
- Click a wheel segment or timeline block to edit its name, category, and times. Add and delete activities from the activity table.
- Keep separate **Plan** and **Actual** schedules. Use the plan as a starting point for actual tracking, or compare both rings, category hours, and timelines.
- Browse dates with Previous Day / Next Day or the date picker. Copy yesterday's schedule for the current mode.
- Save a weekday template, choose its matching weekdays, and apply it to any selected date. The first matching template automatically supplies a plan for new dates; it never replaces an existing record.
- Review a Monday-to-Sunday weekly summary with category averages and percentages. Averages include saved day records only; viewing an empty day does not count it as a recorded day.
- Export and restore JSON backups from storage settings.

The first visit includes an editable starter plan for today; Actual begins with untracked time. Other dates start unallocated unless a template matches. Activities always cover 24 hours without gaps or overlaps. Adding an activity replaces its time range; editing adjusts neighbors; deleting gives time to a neighboring activity. Split overnight activities at midnight.

## Data and privacy

All records and templates save automatically in this browser's `localStorage`, under `timepie.v1`. They remain on this browser and device. Clearing site data removes them; export a backup to keep or move your records. The interface reports storage failures and preserves unreadable existing data until you restore a valid backup. There are no analytics or external runtime requests; fonts are bundled with the app.

## Validation

```sh
npm test          # Scheduling, dates, templates, and backup validation
npm run test:e2e  # Real browser workflows using Playwright
npm run build    # Type-check and production build
npm run preview  # Serve the production build
```

Browser tests use `/usr/bin/chromium` when available. Otherwise install Chromium with `npx playwright install chromium`. You can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use another Chromium installation.

The production build is static and can be served from `dist/` by any static web host. Browser records are specific to the host's origin; export a backup before moving to another host.

## Implementation

React, TypeScript, Vite, Lucide icons, and self-hosted DM Sans / Manrope fonts. Scheduling and validation live in `src/planner.ts`; the interactive SVG wheel is in `src/Wheel.tsx`. Date navigation uses local calendar dates, without UTC or daylight-saving offsets changing the 24-hour schedule.
