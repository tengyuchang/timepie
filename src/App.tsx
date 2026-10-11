import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  Ellipsis,
  FileUp,
  Layers2,
  Leaf,
  PanelLeftClose,
  Plus,
  Repeat2,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Wheel from "./Wheel";
import { CategoryIcon } from "./Icons";
import {
  CATEGORIES,
  DAY,
  STORAGE_KEY,
  categoryMeta,
  cloneActivities,
  dateKey,
  decimalHours,
  durationLabel,
  editActivity,
  getDay,
  insertActivity,
  moveBoundary,
  newStore,
  parseDate,
  percent,
  removeActivity,
  shiftDate,
  timeLabel,
  totals,
  uid,
  validStore,
  weekDates,
  type Activity,
  type Category,
  type Mode,
  type Store,
  type Template,
} from "./planner";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_OPTIONS = Array.from({ length: 289 }, (_, i) => i * 5);
type Page = "daily" | "weekly" | "templates";
type Modal =
  | { type: "activity"; activity?: Activity }
  | { type: "template" }
  | { type: "help" }
  | { type: "storage" }
  | { type: "confirm"; title: string; description: string; action: () => void }
  | null;
function loadStore(today: string): { store: Store; error: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (validStore(parsed)) return { store: parsed, error: "" };
      return {
        store: newStore(today),
        error:
          "Saved data is unreadable and has been preserved. Restore a valid backup to resume saving; new changes stay in this session.",
      };
    }
    return { store: newStore(today), error: "" };
  } catch {
    return {
      store: newStore(today),
      error:
        "Saved data or browser storage is unavailable. Existing data is preserved; changes stay in this session. Restore a valid backup to resume saving.",
    };
  }
}
function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`logo-mark ${small ? "small" : ""}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <path d="M17 5a13 13 0 1 0 13 13H17V5Z" fill="currentColor" />
        <path
          d="M21 3v11h11A12 12 0 0 0 21 3Z"
          fill="currentColor"
          opacity=".45"
        />
      </svg>
    </span>
  );
}
function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      ref.current?.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex="0"]',
      );
    focusables()?.[1]?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const elements = focusables();
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="icon-button close-modal"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={19} />
        </button>
        <div className="modal-emblem">
          <Leaf size={22} />
        </div>
        <h2 id="modal-title">{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
function ActivityForm({
  activity,
  activities,
  mode,
  onSave,
  onDelete,
  onClose,
}: {
  activity?: Activity;
  activities: Activity[];
  mode: Mode;
  onSave: (a: Activity) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(activity?.name ?? "");
  const [category, setCategory] = useState<Category>(
    activity?.category ?? "Personal",
  );
  const [start, setStart] = useState(activity?.start ?? 540);
  const [end, setEnd] = useState(activity?.end ?? 600);
  const [error, setError] = useState("");
  const index = activity
    ? activities.findIndex((a) => a.id === activity.id)
    : -1;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your activity a name.");
      return;
    }
    if (end <= start) {
      setError(
        "End time must be after start time. Split overnight activities at midnight.",
      );
      return;
    }
    const next = {
      id: activity?.id ?? uid(),
      name: name.trim(),
      category,
      start,
      end,
    };
    try {
      activity
        ? editActivity(activities, next)
        : insertActivity(activities, next);
      onSave(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <ModalShell
      title={activity ? "A little adjustment." : "Make time for something."}
      subtitle={`${activity ? "Edit" : "Add"} an activity to your ${mode.toLowerCase()}.`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className="field">
          Activity name
          <input
            required
            maxLength={100}
            placeholder="What are you making time for?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Category
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id}>{c.id}</option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            Start time
            <select
              aria-label="Start time"
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              disabled={!!activity && index === 0}
            >
              {TIME_OPTIONS.filter((t) => t < DAY).map((t) => (
                <option key={t} value={t}>
                  {timeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            End time
            <select
              aria-label="End time"
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
              disabled={!!activity && index === activities.length - 1}
            >
              {TIME_OPTIONS.filter((t) => t > 0).map((t) => (
                <option key={t} value={t}>
                  {timeLabel(t)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-duration">
          <Clock3 size={16} />
          <span>
            {end > start ? durationLabel(end - start) : "Choose a time range"}
          </span>
          {end > start && (
            <span className="muted">{percent(end - start)} of your day</span>
          )}
        </div>
        <p className="form-hint">
          {activity
            ? "Adjacent activities adjust with your changes. Each activity needs at least 5 minutes."
            : "This replaces time in your existing schedule. The rest of your day stays in place."}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {activity && activities.length > 1 && (
            <button
              type="button"
              className="button danger subtle"
              onClick={() => onDelete(activity.id)}
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
          <div className="action-spacer" />
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            <Check size={15} /> {activity ? "Save changes" : "Add activity"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
function Timeline({
  activities,
  comparison,
  onEdit,
}: {
  activities: Activity[];
  comparison?: Activity[];
  onEdit: (a: Activity) => void;
}) {
  const row = (list: Activity[], editable: boolean) => (
    <div className="timeline-track">
      {list.map((a) => (
        <button
          key={a.id}
          className="timeline-segment"
          style={{
            width: `${((a.end - a.start) / DAY) * 100}%`,
            background: categoryMeta(a.category).color,
          }}
          title={`${a.name} · ${timeLabel(a.start)}–${timeLabel(a.end)} · ${durationLabel(a.end - a.start)}`}
          onClick={() => {
            if (editable) onEdit(a);
          }}
          aria-label={`${a.name}, ${timeLabel(a.start)} to ${timeLabel(a.end)}`}
          disabled={!editable}
        >
          {a.end - a.start >= 110 && (
            <CategoryIcon category={a.category} size={14} />
          )}
        </button>
      ))}
    </div>
  );
  return (
    <div className="timeline-content">
      {comparison && <span className="timeline-row-label">Plan</span>}
      {row(activities, true)}
      {comparison && (
        <>
          <span className="timeline-row-label">Actual</span>
          {row(comparison, false)}
        </>
      )}
      <div className="timeline-hours">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i}>{timeLabel(i * 180)}</span>
        ))}
      </div>
    </div>
  );
}
function App() {
  const today = dateKey();
  const [initial] = useState(() => loadStore(today));
  const [store, setStore] = useState<Store>(initial.store);
  const [storageError, setStorageError] = useState(initial.error);
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<Mode>("Plan");
  const [page, setPage] = useState<Page>("daily");
  const [compare, setCompare] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<Category | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [saved, setSaved] = useState(!initial.error);
  const [storageRecovered, setStorageRecovered] = useState(false);
  const [templateName, setTemplateName] = useState("My weekday rhythm");
  const [templateDays, setTemplateDays] = useState([1, 2, 3, 4, 5]);
  const importRef = useRef<HTMLInputElement>(null);
  const day = useMemo(() => getDay(store, date), [store, date]);
  const activities = day[mode];
  const categoryTotals = totals(activities);
  const actualTotals = totals(day.Actual);
  const planTotals = totals(day.Plan);
  const dates = weekDates(date);
  const recordedDates = dates.filter((d) => store.records[d]);
  const weeklyTotals = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.id,
      recordedDates.reduce(
        (sum, d) => sum + totals(store.records[d][mode])[c.id],
        0,
      ) / (recordedDates.length || 1),
    ]),
  ) as Record<Category, number>;
  const plannedHours = DAY - categoryTotals.Other;
  useEffect(() => {
    if (initial.error && !storageRecovered) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      setSaved(true);
      setStorageError("");
    } catch {
      setSaved(false);
      setStorageError(
        "Browser storage is full or unavailable. Export your data to keep a backup.",
      );
    }
  }, [store, storageRecovered]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setFilter(null);
    setShowAll(false);
  }, [date, mode]);
  const closeModal = useMemo(() => () => setModal(null), []);
  function updateActivities(next: Activity[], targetMode = mode) {
    setSaved(false);
    setStore((s) => ({
      ...s,
      records: { ...s.records, [date]: { ...day, [targetMode]: next } },
    }));
  }
  function copyYesterday() {
    const previous = store.records[shiftDate(date, -1)];
    if (!previous) {
      setToast("No record for yesterday yet. Create one or apply a template.");
      return;
    }
    setModal({
      type: "confirm",
      title: "Bring yesterday into today?",
      description: `This replaces today’s ${mode.toLowerCase()} with yesterday’s ${mode.toLowerCase()}. Your other mode stays as it is.`,
      action: () => {
        updateActivities(cloneActivities(previous[mode]));
        setModal(null);
        setToast("Yesterday copied. Make it your own.");
      },
    });
  }
  function usePlan() {
    setModal({
      type: "confirm",
      title: "Start with your plan?",
      description:
        "Your actual record will become a copy of your plan. Adjust it to reflect how your day really went.",
      action: () => {
        updateActivities(cloneActivities(day.Plan), "Actual");
        setModal(null);
        setToast("Plan copied to Actual. Adjust as your day unfolds.");
      },
    });
  }
  function saveTemplate(e: FormEvent) {
    e.preventDefault();
    if (!templateName.trim() || !templateDays.length) return;
    const template: Template = {
      id: uid(),
      name: templateName.trim(),
      weekdays: templateDays,
      activities: cloneActivities(activities),
    };
    setStore((s) => ({ ...s, templates: [...s.templates, template] }));
    setModal(null);
    setToast("Template saved. New matching days will use it automatically.");
  }
  function applyTemplate(t: Template) {
    setModal({
      type: "confirm",
      title: `Use “${t.name}”?`,
      description: `This replaces your plan for ${parseDate(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}. Your actual record stays as it is.`,
      action: () => {
        updateActivities(cloneActivities(t.activities), "Plan");
        setMode("Plan");
        setPage("daily");
        setModal(null);
        setToast("Your template is in place.");
      },
    });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timepie-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Your data has been exported.");
  }
  async function importData(file: File) {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!validStore(data)) throw new Error("Invalid file");
      setModal({
        type: "confirm",
        title: "Restore your backup?",
        description:
          "This replaces all current records and templates with the contents of your backup. Export your current data first if you want to keep it.",
        action: () => {
          setStore(data);
          setStorageRecovered(true);
          setStorageError("");
          setModal(null);
          setToast("Backup restored. Welcome back.");
        },
      });
    } catch {
      setToast(
        "That file is not a valid Timepie backup. Your records are unchanged.",
      );
    }
  }
  function navigate(next: Page) {
    setPage(next);
    setMobileNav(false);
  }
  const filtered = activities.filter((a) => !filter || a.category === filter);
  const visibleActivities = showAll ? filtered : filtered.slice(0, 5);
  const longDate = parseDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const isToday = date === today;
  const changeDate = (days: number) => setDate((d) => shiftDate(d, days));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("daily");
          }}
        >
          <Logo />
          <span>
            timepie<span className="brand-period">.</span>
          </span>
        </a>
        <div className="sidebar-caption">MAKE ROOM FOR WHAT MATTERS</div>
        <div className="nav-section-title">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${page === "daily" ? "active" : ""}`}
            onClick={() => navigate("daily")}
          >
            <CalendarDays size={19} /> Daily planner{" "}
            <span className="nav-active-dot" />
          </button>
          <button
            className={`nav-item ${page === "weekly" ? "active" : ""}`}
            onClick={() => navigate("weekly")}
          >
            <ChartNoAxesColumnIncreasing size={19} /> Weekly overview
          </button>
          <button
            className={`nav-item ${page === "templates" ? "active" : ""}`}
            onClick={() => navigate("templates")}
          >
            <Layers2 size={19} /> My templates
            {store.templates.length > 0 && (
              <span className="nav-count">{store.templates.length}</span>
            )}
          </button>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Leaf size={19} strokeWidth={1.5} />
          </div>
          <h3>Time well spent.</h3>
          <p>
            You don’t need to do more.
            <br />
            Just make room for what
            <br />
            matters to you.
          </p>
          <span className="note-decoration">
            <svg width="65" height="64" viewBox="0 0 65 64" fill="none">
              <path
                d="M18 59C18 39 36 20 55 9M28 41C9 38 9 22 15 16c15 5 19 17 13 25ZM39 28c-3-18 9-27 19-25 2 13-7 24-19 25Z"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </span>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item help-link"
            onClick={() => setModal({ type: "help" })}
          >
            <CircleHelp size={18} /> A little guidance{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-user">
            <div className="avatar">Y</div>
            <div>
              <strong>Your personal space</strong>
              <span>Just you. Your own pace.</span>
            </div>
            <button
              className="icon-button"
              aria-label="Data and storage settings"
              onClick={() => setModal({ type: "storage" })}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <div className="nav-overlay" onClick={() => setMobileNav(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <PanelLeftClose size={18} />
            </button>
            <span>Your space</span>
            <ChevronRight size={13} />
            <strong>
              {page === "daily"
                ? "Daily planner"
                : page === "weekly"
                  ? "Weekly overview"
                  : "My templates"}
            </strong>
          </div>
          <div className="save-status">
            <span
              className={`status-dot ${!saved || storageError ? "warning" : ""}`}
            />
            {saved && !storageError
              ? "All changes saved"
              : "Saved in this session"}
            <span className="topbar-divider" />
            <button
              className="icon-button"
              title="Data is stored locally in this browser"
              aria-label="Open storage settings"
              onClick={() => setModal({ type: "storage" })}
            >
              <ShieldCheck size={18} />
            </button>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="storage-warning" role="alert">
              {storageError}
              <button onClick={exportData}>Export data</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "daily"
                  ? "SMALL PLANS. MEANINGFUL DAYS."
                  : page === "weekly"
                    ? "STEP BACK. SEE THE BIGGER PICTURE."
                    : "A GOOD RHYTHM IS WORTH REPEATING."}
              </div>
              <h1>
                {page === "daily"
                  ? "Your day, at a glance."
                  : page === "weekly"
                    ? "A little perspective."
                    : "Find your everyday rhythm."}
              </h1>
              <p>
                {page === "daily"
                  ? "Give your time a little intention. Make space for what matters."
                  : page === "weekly"
                    ? "Notice your patterns. Make room for a more balanced week."
                    : "Less planning from scratch. More time for living."}
              </p>
            </div>
            <div className="heading-detail">
              <span className="tiny-leaf">
                <Leaf size={18} />
              </span>
              <span>
                {page === "daily"
                  ? "24 hours. Make them yours."
                  : page === "weekly"
                    ? "Progress, at your own pace."
                    : "Your day. On repeat."}
              </span>
            </div>
          </div>
          <div className="planner-toolbar">
            <div className="date-navigation">
              <button
                className="icon-button"
                aria-label={
                  page === "weekly" ? "Previous week" : "Previous Day"
                }
                onClick={() => changeDate(page === "weekly" ? -7 : -1)}
              >
                <ChevronLeft size={17} />
              </button>
              <div className="date-label">
                <CalendarDays size={17} />
                <label className="date-picker-label">
                  <span>
                    {page === "weekly"
                      ? `${parseDate(dates[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${parseDate(dates[6]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : longDate}
                  </span>
                  <input
                    aria-label="Choose date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                  />
                </label>
                {isToday && page !== "weekly" && (
                  <span className="today-chip">Today</span>
                )}
              </div>
              <button
                className="icon-button"
                aria-label={page === "weekly" ? "Next week" : "Next Day"}
                onClick={() => changeDate(page === "weekly" ? 7 : 1)}
              >
                <ChevronRight size={17} />
              </button>
              {!isToday && (
                <button className="today-button" onClick={() => setDate(today)}>
                  Today
                </button>
              )}
            </div>
            <div className="toolbar-actions">
              {page === "daily" && (
                <button className="button subtle" onClick={copyYesterday}>
                  <Copy size={15} />
                  <span>Copy yesterday</span>
                </button>
              )}
              {page !== "weekly" && (
                <button
                  className="button template-button"
                  onClick={() => {
                    setTemplateDays([1, 2, 3, 4, 5]);
                    setModal({ type: "template" });
                  }}
                  title="Save as Weekday Template"
                >
                  <Layers2 size={15} />
                  <span>Save as template</span>
                </button>
              )}
            </div>
          </div>
          {page === "daily" && (
            <>
              <div className="mode-row">
                <div
                  className="segmented-control"
                  role="tablist"
                  aria-label="Schedule mode"
                >
                  {(["Plan", "Actual"] as const).map((m) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={mode === m && !compare}
                      className={mode === m && !compare ? "selected" : ""}
                      onClick={() => {
                        setMode(m);
                        setCompare(false);
                      }}
                    >
                      {m === "Plan" ? (
                        <CalendarDays size={15} />
                      ) : (
                        <CheckCheck size={15} />
                      )}{" "}
                      {m}
                    </button>
                  ))}
                  <button
                    role="tab"
                    aria-selected={compare}
                    className={compare ? "selected" : ""}
                    onClick={() => {
                      setCompare(true);
                      setMode("Plan");
                    }}
                  >
                    <Repeat2 size={15} /> Compare
                  </button>
                </div>
                <span className="mode-description">
                  {compare
                    ? "Your intentions, alongside your real day."
                    : mode === "Plan"
                      ? "A little structure for the day ahead."
                      : "How your day actually unfolded."}
                </span>
                {mode === "Actual" && !compare && (
                  <button className="use-plan" onClick={usePlan}>
                    <Copy size={13} /> Use plan as a starting point
                  </button>
                )}
              </div>
              <div className="dashboard-grid">
                <section className="card wheel-card">
                  <div className="card-header">
                    <div>
                      <h2>The shape of your day</h2>
                      <p>
                        {compare
                          ? "Two perspectives. One whole day."
                          : "Every moment has a place."}
                      </p>
                    </div>
                    <span className="outline-badge">
                      <span className="status-dot" />
                      {compare
                        ? "Plan + Actual"
                        : `${mode === "Plan" ? "Planned" : "Actual"} day`}
                    </span>
                  </div>
                  <Wheel
                    activities={activities}
                    comparison={compare ? day.Actual : undefined}
                    mode={mode}
                    onBoundary={(i, t) =>
                      updateActivities(moveBoundary(activities, i, t))
                    }
                    onEdit={(a) => setModal({ type: "activity", activity: a })}
                  />
                  <div className="wheel-card-footer">
                    <span>
                      <span className="status-dot" />
                      {durationLabel(plannedHours)}{" "}
                      {mode === "Plan" ? "intentionally planned" : "tracked"}
                    </span>
                    <span>
                      {activities.length} activities{" "}
                      <span className="footer-dot">·</span> 24h total
                    </span>
                  </div>
                </section>
                <section className="card category-card">
                  <div className="card-header">
                    <div>
                      <h2>
                        {compare
                          ? "Plan meets reality"
                          : "A little of everything"}
                      </h2>
                      <p>
                        {compare
                          ? "Hours by category, side by side."
                          : "Where your time finds a home."}
                      </p>
                    </div>
                    <ChartNoAxesColumnIncreasing size={19} className="muted" />
                  </div>
                  <div className="category-table-head">
                    <span>CATEGORY</span>
                    {compare ? (
                      <>
                        <span>PLAN</span>
                        <span>ACTUAL</span>
                      </>
                    ) : (
                      <>
                        <span>TIME</span>
                        <span>OF DAY</span>
                      </>
                    )}
                  </div>
                  <div className="category-list">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        className={`category-row ${filter === c.id ? "filtered" : ""}`}
                        onClick={() => {
                          setFilter(filter === c.id ? null : c.id);
                        }}
                        aria-label={`Filter activities by ${c.id}`}
                      >
                        <span className="category-name">
                          <span
                            className="category-icon"
                            style={{
                              backgroundColor: `${c.color}55`,
                              color: c.dark,
                            }}
                          >
                            <CategoryIcon category={c.id} size={15} />
                          </span>
                          {c.id}
                        </span>
                        <span className="category-hours">
                          {compare
                            ? `${decimalHours(planTotals[c.id])}h`
                            : durationLabel(categoryTotals[c.id])}
                        </span>
                        <span className="category-percent">
                          {compare
                            ? `${decimalHours(actualTotals[c.id])}h`
                            : percent(categoryTotals[c.id])}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="category-total">
                    <strong>A whole day</strong>
                    <strong>24h</strong>
                    <span>{compare ? "24h" : "100%"}</span>
                  </div>
                  <div className="balance-note">
                    <Sparkles size={16} />
                    <p>
                      {compare ? (
                        "Plans guide you. Real life makes them yours."
                      ) : (
                        <>
                          Balance looks different for everyone.
                          <br />
                          Find the rhythm that feels right for you.
                        </>
                      )}
                    </p>
                  </div>
                </section>
              </div>
              <section className="card timeline-card">
                <div className="card-header">
                  <div className="inline-heading">
                    <h2>Your day, in a line</h2>
                    <span>A midnight-to-midnight perspective</span>
                  </div>
                  <span className="tiny-label">00:00 — 24:00</span>
                </div>
                <Timeline
                  activities={activities}
                  comparison={compare ? day.Actual : undefined}
                  onEdit={(a) => setModal({ type: "activity", activity: a })}
                />
              </section>
              <section className="card activities-card">
                <div className="card-header">
                  <div className="inline-heading">
                    <h2>The moments that make it</h2>
                    <span className="number-badge">{filtered.length}</span>
                    {filter && (
                      <button
                        className="filter-chip"
                        onClick={() => setFilter(null)}
                      >
                        {filter}
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <button
                    className="button add-button"
                    onClick={() => setModal({ type: "activity" })}
                  >
                    <Plus size={15} /> Add activity
                  </button>
                </div>
                <div className="activity-table-wrap">
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>ACTIVITY</th>
                        <th>CATEGORY</th>
                        <th>TIME</th>
                        <th>DURATION</th>
                        <th>OF DAY</th>
                        <th>
                          <span className="sr-only">Edit</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleActivities.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() =>
                            setModal({ type: "activity", activity: a })
                          }
                        >
                          <td>
                            <span
                              className="activity-dot"
                              style={{
                                background: categoryMeta(a.category).color,
                              }}
                            />
                            <span>{a.name}</span>
                          </td>
                          <td>
                            <span
                              className="category-pill"
                              style={{
                                color: categoryMeta(a.category).dark,
                                backgroundColor: `${categoryMeta(a.category).color}33`,
                              }}
                            >
                              {a.category}
                            </span>
                          </td>
                          <td className="time-cell">
                            {timeLabel(a.start)} <span>–</span>{" "}
                            {timeLabel(a.end)}
                          </td>
                          <td>{durationLabel(a.end - a.start)}</td>
                          <td className="muted">{percent(a.end - a.start)}</td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Edit ${a.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ type: "activity", activity: a });
                              }}
                            >
                              <Ellipsis size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div className="empty-filter">
                      No {filter?.toLowerCase()} activities yet.{" "}
                      <button onClick={() => setModal({ type: "activity" })}>
                        Make room for one
                      </button>
                    </div>
                  )}
                </div>
                {filtered.length > 5 && (
                  <button
                    className="show-activities"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll
                      ? "Show less"
                      : `See all ${filtered.length} activities`}
                    <ChevronDown
                      size={14}
                      className={showAll ? "rotate" : ""}
                    />
                  </button>
                )}
              </section>
            </>
          )}
          {page === "weekly" && (
            <>
              <div className="mode-row">
                <div className="segmented-control">
                  {(["Plan", "Actual"] as const).map((m) => (
                    <button
                      className={mode === m ? "selected" : ""}
                      key={m}
                      onClick={() => setMode(m)}
                    >
                      {m === "Plan" ? (
                        <CalendarDays size={15} />
                      ) : (
                        <CheckCheck size={15} />
                      )}{" "}
                      {m}
                    </button>
                  ))}
                </div>
                <span className="mode-description">
                  {recordedDates.length} of 7 days recorded · Averages include
                  recorded days only
                </span>
              </div>
              <div className="weekly-stats">
                <div className="card stat-card">
                  <span>Days with a record</span>
                  <div>
                    {recordedDates.length}
                    <small> / 7</small>
                  </div>
                  <p>Every day is a fresh perspective.</p>
                </div>
                <div className="card stat-card">
                  <span>
                    Average {mode === "Plan" ? "planned" : "tracked"} time
                  </span>
                  <div>
                    {decimalHours(
                      recordedDates.length ? DAY - weeklyTotals.Other : 0,
                    )}
                    <small> hours / day</small>
                  </div>
                  <p>A little intention, day by day.</p>
                </div>
                <div className="card stat-card">
                  <span>Most time spent on</span>
                  <div className="stat-category">
                    {recordedDates.length
                      ? CATEGORIES.slice().sort(
                          (a, b) => weeklyTotals[b.id] - weeklyTotals[a.id],
                        )[0].id
                      : "No records"}
                  </div>
                  <p>There’s room for what matters.</p>
                </div>
              </div>
              <div className="weekly-grid">
                <section className="card week-chart">
                  <div className="card-header">
                    <div>
                      <h2>The rhythm of your week</h2>
                      <p>
                        {mode === "Plan" ? "Your intentions" : "Your real days"}
                        , from Monday to Sunday.
                      </p>
                    </div>
                    <span className="outline-badge">{mode}</span>
                  </div>
                  <div className="week-bars">
                    {dates.map((d) => {
                      const record = store.records[d],
                        total = record ? totals(record[mode]) : null;
                      return (
                        <button
                          className={`week-day ${d === date ? "selected-day" : ""}`}
                          key={d}
                          onClick={() => {
                            setDate(d);
                            setPage("daily");
                          }}
                          aria-label={`Open ${d}`}
                        >
                          <div
                            className={`week-bar ${!total ? "no-data" : ""}`}
                          >
                            {total ? (
                              CATEGORIES.slice()
                                .reverse()
                                .map(
                                  (c) =>
                                    total[c.id] > 0 && (
                                      <div
                                        key={c.id}
                                        style={{
                                          height: `${(total[c.id] / DAY) * 100}%`,
                                          background: c.color,
                                        }}
                                        title={`${c.id}: ${durationLabel(total[c.id])}`}
                                      />
                                    ),
                                )
                            ) : (
                              <span>
                                No
                                <br />
                                record
                              </span>
                            )}
                          </div>
                          <span className="week-day-label">
                            {WEEKDAYS[parseDate(d).getDay()]}
                          </span>
                          <span className="week-date-label">
                            {parseDate(d).getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="week-chart-legend">
                    {CATEGORIES.map((c) => (
                      <span key={c.id}>
                        <i style={{ background: c.color }} />
                        {c.id}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="card weekly-category">
                  <div className="card-header">
                    <div>
                      <h2>Your average day</h2>
                      <p>Average hours and share by category.</p>
                    </div>
                  </div>
                  <div className="category-table-head">
                    <span>CATEGORY</span>
                    <span>HOURS / DAY</span>
                    <span>OF DAY</span>
                  </div>
                  {CATEGORIES.map((c) => (
                    <div className="category-row" key={c.id}>
                      <span className="category-name">
                        <i
                          className="activity-dot"
                          style={{ background: c.color }}
                        />
                        {c.id}
                      </span>
                      <span className="category-hours">
                        {decimalHours(weeklyTotals[c.id])}h
                      </span>
                      <span className="category-percent">
                        {percent(weeklyTotals[c.id])}
                      </span>
                    </div>
                  ))}
                  <div className="category-total">
                    <strong>Total average</strong>
                    <strong>{recordedDates.length ? "24h" : "0h"}</strong>
                    <span>{recordedDates.length ? "100%" : "0%"}</span>
                  </div>
                </section>
              </div>
              {!recordedDates.length && (
                <div className="weekly-empty">
                  <Leaf size={24} />
                  <h3>A fresh week awaits.</h3>
                  <p>
                    Create a daily plan or actual record to see your weekly
                    patterns here.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setPage("daily")}
                  >
                    Plan a day <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
          {page === "templates" && (
            <>
              <div className="template-info">
                <Repeat2 size={18} />
                <p>
                  Templates give new days a head start. Matching days use the
                  first saved template automatically; existing records stay as
                  they are.
                </p>
              </div>
              {store.templates.length ? (
                <div className="template-grid">
                  {store.templates.map((t) => (
                    <section className="card saved-template" key={t.id}>
                      <div className="card-header">
                        <span className="template-emblem">
                          <Layers2 size={21} />
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${t.name}`}
                          onClick={() =>
                            setModal({
                              type: "confirm",
                              title: "Remove this template?",
                              description: `“${t.name}” will be deleted. Your existing day records will be kept.`,
                              action: () => {
                                setStore((s) => ({
                                  ...s,
                                  templates: s.templates.filter(
                                    (item) => item.id !== t.id,
                                  ),
                                }));
                                setModal(null);
                                setToast("Template removed.");
                              },
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h2>{t.name}</h2>
                      <div className="template-days">
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                          <span
                            className={t.weekdays.includes(d) ? "included" : ""}
                            key={d}
                          >
                            {WEEKDAYS[d][0]}
                          </span>
                        ))}
                      </div>
                      <div className="template-preview">
                        {t.activities.map((a) => (
                          <span
                            key={a.id}
                            style={{
                              background: categoryMeta(a.category).color,
                              width: `${((a.end - a.start) / DAY) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      <p>
                        {t.activities.length} activities <span>·</span> A full
                        24-hour rhythm
                      </p>
                      <button
                        className="button primary"
                        onClick={() => applyTemplate(t)}
                      >
                        Use for selected day <ArrowRight size={14} />
                      </button>
                    </section>
                  ))}
                </div>
              ) : (
                <section className="card template-empty">
                  <div className="template-empty-art">
                    <Layers2 size={42} strokeWidth={1} />
                    <span>
                      <Leaf size={18} />
                    </span>
                  </div>
                  <h2>A rhythm you can return to.</h2>
                  <p>
                    Build a day that feels good, then save it as a template.
                    <br />
                    Your next weekday will already have a little structure.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setPage("daily")}
                  >
                    Start with your daily plan <ArrowRight size={15} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setModal({ type: "template" })}
                  >
                    Save the current day as a template
                  </button>
                </section>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              <Logo small /> A little intention goes a long way.
            </span>
            <button onClick={() => setModal({ type: "storage" })}>
              <ShieldCheck size={13} /> Private & stored on this device
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal?.type === "activity" && (
        <ActivityForm
          activity={modal.activity}
          activities={activities}
          mode={mode}
          onClose={closeModal}
          onSave={(a) => {
            updateActivities(
              modal.activity
                ? editActivity(activities, a)
                : insertActivity(activities, a),
            );
            setModal(null);
            setToast(
              modal.activity
                ? "A little adjustment, saved."
                : "A new moment, made room for.",
            );
          }}
          onDelete={(id) => {
            updateActivities(removeActivity(activities, id));
            setModal(null);
            setToast(
              "Activity removed. Its time was given to the neighboring activity.",
            );
          }}
        />
      )}
      {modal?.type === "template" && (
        <ModalShell
          title="Keep a good rhythm."
          subtitle={`Save this ${mode.toLowerCase()} as a reusable weekday template.`}
          onClose={closeModal}
        >
          <form onSubmit={saveTemplate}>
            <label className="field">
              Template name
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
                maxLength={60}
              />
            </label>
            <div className="field">
              <span>Use automatically on</span>
              <div className="weekday-selector">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={templateDays.includes(d)}
                    className={templateDays.includes(d) ? "chosen" : ""}
                    onClick={() =>
                      setTemplateDays((days) =>
                        days.includes(d)
                          ? days.filter((day) => day !== d)
                          : [...days, d],
                      )
                    }
                  >
                    {WEEKDAYS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="template-modal-summary">
              <Layers2 size={18} />
              <span>
                {activities.length} activities <span>·</span> 24 hours{" "}
                <span>·</span> {mode} schedule
              </span>
            </div>
            <p className="form-hint">
              New days that match will start with this plan. Existing records
              are kept. You can apply a template to any selected day from My
              templates.
            </p>
            <div className="modal-actions">
              <div className="action-spacer" />
              <button type="button" className="button" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={!templateDays.length}
              >
                <Check size={15} /> Save template
              </button>
            </div>
          </form>
        </ModalShell>
      )}
      {modal?.type === "confirm" && (
        <ModalShell
          title={modal.title}
          subtitle={modal.description}
          onClose={closeModal}
        >
          <div className="modal-actions">
            <div className="action-spacer" />
            <button className="button" onClick={closeModal}>
              Cancel
            </button>
            <button className="button primary" onClick={modal.action}>
              Confirm <ArrowRight size={15} />
            </button>
          </div>
        </ModalShell>
      )}
      {modal?.type === "help" && (
        <ModalShell
          title="Your day. Your own pace."
          subtitle="A few small things to get you started."
          onClose={closeModal}
        >
          <div className="help-steps">
            <div>
              <span>01</span>
              <div>
                <h3>Give your day a little shape</h3>
                <p>
                  The wheel covers midnight to midnight. Click a segment to edit
                  it, or add an activity to make room in your schedule.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Adjust as you go</h3>
                <p>
                  Drag the small dots between segments. Dividers snap to 5
                  minutes. You can also focus a divider and use the arrow keys.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Make space for real life</h3>
                <p>
                  Plan holds your intentions. Actual tracks what happened. Copy
                  your plan into Actual and adjust it, then compare the two.
                </p>
              </div>
            </div>
            <div>
              <span>04</span>
              <div>
                <h3>Find your rhythm</h3>
                <p>
                  Save a weekday template, copy yesterday, and explore your
                  weekly averages. Overnight activities are split at midnight.
                </p>
              </div>
            </div>
          </div>
          <button className="button primary full-width" onClick={closeModal}>
            Make time for what matters <ArrowRight size={15} />
          </button>
        </ModalShell>
      )}
      {modal?.type === "storage" && (
        <ModalShell
          title="A space that’s just yours."
          subtitle="Your records stay in this browser, on this device. No account. No cloud sync."
          onClose={closeModal}
        >
          <div className="storage-details">
            <ShieldCheck size={23} />
            <div>
              <strong>
                {Object.keys(store.records).length} day records ·{" "}
                {store.templates.length} templates
              </strong>
              <p>
                Changes save automatically. Clearing browser data removes your
                records, so keep a backup of days you want to hold on to.
              </p>
            </div>
          </div>
          <button className="storage-action" onClick={exportData}>
            <Download size={18} />
            <span>
              <strong>Export a backup</strong>
              <small>Download all records and templates as JSON</small>
            </span>
            <ArrowDownToLine size={16} />
          </button>
          <button
            className="storage-action"
            onClick={() => importRef.current?.click()}
          >
            <FileUp size={18} />
            <span>
              <strong>Restore a backup</strong>
              <small>Replace your data with a Timepie export</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
          <button className="button full-width" onClick={closeModal}>
            Back to your day
          </button>
        </ModalShell>
      )}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import Timepie backup"
        onChange={(e) => {
          if (e.target.files?.[0]) void importData(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
export default App;
