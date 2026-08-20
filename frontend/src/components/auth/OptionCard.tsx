import type { ReactNode } from "react";

/**
 * Selectable card used by the onboarding choice steps.
 *
 * A real <button> with `aria-pressed` rather than a styled div, so it is
 * reachable by Tab, activated by Enter and Space, and announced as a toggle.
 */
export function OptionCard({
  label,
  icon,
  selected = false,
  onSelect,
}: {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border px-4 py-5 transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60
        ${
          selected
            ? "border-white bg-white/[0.09] shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
            : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
        }`}
    >
      {icon ? <span className="text-white/85">{icon}</span> : null}
      <span className="text-[14px] font-medium text-white/90">{label}</span>
    </button>
  );
}

/**
 * Larger card showing a light/dark UI preview for the theme step.
 */
export function ThemeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: "light" | "dark";
  selected: boolean;
  onSelect: () => void;
}) {
  const isLight = mode === "light";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex flex-col items-center gap-3 rounded-xl focus-visible:outline-none`}
    >
      <span
        className={`block w-full overflow-hidden rounded-xl border-2 transition ${
          selected
            ? "border-white"
            : "border-transparent group-hover:border-white/30"
        }`}
      >
        {/* A miniature of the workspace rather than a screenshot: it stays
            accurate as the product changes and costs no image request. */}
        <span
          className="flex h-[118px] w-full gap-1.5 p-2.5"
          style={{ background: isLight ? "#f7f7f5" : "#1b1b1e" }}
        >
          <span className="flex flex-1 flex-col gap-1.5">
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{
                background: "linear-gradient(140deg,#ff9a3c,#ff5c7a,#7b6bff)",
              }}
            />
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                className="block h-3.5 w-full rounded"
                style={{ background: isLight ? "#e6e6e2" : "#2c2c30" }}
              />
            ))}
          </span>
          <span
            className="block w-[38%] rounded"
            style={{ background: isLight ? "#ededea" : "#252528" }}
          />
        </span>
      </span>
      <span className="text-[14px] font-medium text-white/90">
        {isLight ? "Light" : "Dark"}
      </span>
    </button>
  );
}
