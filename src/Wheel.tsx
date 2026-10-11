import { useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { CategoryIcon } from "./Icons";
import {
  DAY,
  type Activity,
  categoryMeta,
  timeLabel,
  durationLabel,
} from "./planner";

const C = 230;
function point(time: number, radius: number) {
  const angle = (time / DAY) * 2 * Math.PI - Math.PI / 2;
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) };
}
function arc(start: number, end: number, outer: number, inner: number) {
  const padding = Math.min(0.7, (end - start) / 5);
  const startAngle = start + padding,
    endAngle = Math.min(end - padding, startAngle + DAY - 0.01);
  const a = point(startAngle, outer),
    b = point(endAngle, outer),
    c = point(endAngle, inner),
    d = point(startAngle, inner);
  const large = endAngle - startAngle > DAY / 2 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;
}
export default function Wheel({
  activities,
  comparison,
  mode,
  onBoundary,
  onEdit,
}: {
  activities: Activity[];
  comparison?: Activity[];
  mode: string;
  onBoundary: (index: number, time: number) => void;
  onEdit: (activity: Activity) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);
  const [hovered, setHovered] = useState<Activity | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  function drag(clientX: number, clientY: number) {
    if (dragging.current === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 460 - C,
      y = ((clientY - rect.top) / rect.height) * 460 - C;
    let minutes =
      (((Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) /
        (Math.PI * 2)) *
      DAY;
    const original = activities[dragging.current].start;
    if (Math.abs(minutes + DAY - original) < Math.abs(minutes - original))
      minutes += DAY;
    if (Math.abs(minutes - DAY - original) < Math.abs(minutes - original))
      minutes -= DAY;
    const snapped = Math.max(
      activities[dragging.current - 1].start + 5,
      Math.min(
        activities[dragging.current].end - 5,
        Math.round(minutes / 5) * 5,
      ),
    );
    onBoundary(dragging.current, snapped);
    setDragTime(snapped);
  }
  return (
    <div className="wheel-container">
      <svg
        ref={svgRef}
        className="time-wheel"
        viewBox="0 0 460 460"
        role="group"
        aria-label={`${mode} 24-hour time wheel`}
        onPointerMove={(e) => drag(e.clientX, e.clientY)}
        onPointerUp={(e) => {
          if (dragging.current !== null) {
            dragging.current = null;
            setDragTime(null);
            if (svgRef.current?.hasPointerCapture(e.pointerId))
              svgRef.current.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragging.current = null;
          setDragTime(null);
        }}
      >
        <circle cx={C} cy={C} r="164" fill="#f2f3ee" />
        <circle cx={C} cy={C} r={comparison ? 96 : 120} fill="white" />
        {Array.from({ length: 48 }, (_, i) => {
          const a = point(i * 30, 174),
            b = point(i * 30, i % 6 === 0 ? 181 : 177);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={i % 6 === 0 ? "#a0a69a" : "#d6dbd1"}
              strokeWidth="1"
            />
          );
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const p = point(i * 180, 203);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              className="wheel-hour"
            >
              {timeLabel(i * 180)}
            </text>
          );
        })}
        {activities.map((a) => {
          const meta = categoryMeta(a.category),
            mid = point((a.start + a.end) / 2, 142);
          return (
            <g
              key={a.id}
              onMouseEnter={() => {
                if (dragging.current === null) setHovered(a);
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <path
                className="wheel-segment"
                d={arc(a.start, a.end, 164, 120)}
                fill={meta.color}
                onClick={() => {
                  if (dragging.current === null) onEdit(a);
                }}
                tabIndex={0}
                role="button"
                aria-label={`${a.name}, ${timeLabel(a.start)} to ${timeLabel(a.end)}, ${durationLabel(a.end - a.start)}. Edit activity.`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEdit(a);
                  }
                }}
              >
                <title>{`${a.name} · ${timeLabel(a.start)}–${timeLabel(a.end)}`}</title>
              </path>
              {a.end - a.start >= 60 && (
                <g
                  transform={`translate(${mid.x - 9} ${mid.y - 9})`}
                  color={meta.dark}
                  pointerEvents="none"
                >
                  <CategoryIcon category={a.category} size={18} />
                </g>
              )}
            </g>
          );
        })}
        {comparison?.map((a) => (
          <path
            key={a.id}
            d={arc(a.start, a.end, 115, 98)}
            fill={categoryMeta(a.category).color}
          >
            <title>{`Actual: ${a.name} · ${timeLabel(a.start)}–${timeLabel(a.end)}`}</title>
          </path>
        ))}
        <text
          x={C}
          y={comparison ? 194 : 187}
          textAnchor="middle"
          className="wheel-eyebrow"
        >
          {dragTime !== null
            ? "ADJUSTING YOUR DAY"
            : hovered
              ? hovered.category.toUpperCase()
              : "A LITTLE INTENTION"}
        </text>
        <text
          x={C}
          y={245}
          textAnchor="middle"
          className={
            hovered || dragTime !== null ? "wheel-value small" : "wheel-value"
          }
        >
          {dragTime !== null ? (
            timeLabel(dragTime)
          ) : hovered ? (
            durationLabel(hovered.end - hovered.start)
          ) : (
            <>
              <tspan>24</tspan>
              <tspan className="wheel-h">h</tspan>
            </>
          )}
        </text>
        <text x={C} y={275} textAnchor="middle" className="wheel-caption">
          {hovered
            ? hovered.name.length > 26
              ? hovered.name.slice(0, 24) + "…"
              : hovered.name
            : comparison
              ? "Plan outside · Actual inside"
              : "A day of possibilities"}
        </text>
        {!hovered && !comparison && (
          <g transform="translate(219 291)" color="#98a28b">
            <path
              d="M11 17V4M11 11C4 11 1 6 2 2c6 0 9 3 9 9ZM11 14c7 0 11-5 10-10-6 0-10 4-10 10Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
        {activities.slice(1).map((a, i) => {
          const p = point(a.start, 164);
          return (
            <g
              key={a.id}
              className="boundary-handle"
              tabIndex={0}
              role="slider"
              aria-label={`Boundary between ${activities[i].name} and ${a.name}`}
              aria-valuemin={activities[i].start + 5}
              aria-valuemax={a.end - 5}
              aria-valuenow={a.start}
              aria-valuetext={timeLabel(a.start)}
              onKeyDown={(e) => {
                if (
                  ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  onBoundary(
                    i + 1,
                    a.start +
                      (e.key === "ArrowRight" || e.key === "ArrowUp" ? 5 : -5),
                  );
                }
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dragging.current = i + 1;
                setHovered(null);
                setDragTime(a.start);
                svgRef.current?.setPointerCapture(e.pointerId);
              }}
            >
              <circle cx={p.x} cy={p.y} r="11" fill="transparent" />
              <circle
                className="handle-dot"
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="white"
                stroke={categoryMeta(a.category).dark}
                strokeWidth="1.4"
              />
            </g>
          );
        })}
      </svg>
      <p className="wheel-instruction">
        <MousePointer2 size={13} /> Drag a divider to adjust <span>·</span>{" "}
        Snaps to 5 min
      </p>
    </div>
  );
}
