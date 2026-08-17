import { useState } from "react";
import {
  Coffee,
  MapPin,
  Menu,
  Sparkles,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { PromptComposer } from "@/components/shell/PromptComposer";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type QuickChip = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
};

/** Restaurant / cafe quick-start prompts for the home dashboard. */
const QUICK_CHIPS: QuickChip[] = [
  {
    id: "cafe",
    label: "Cafe website",
    icon: Coffee,
    prompt:
      "Build an elegant cafe website with hero, menu, about, gallery, and reservation.",
  },
  {
    id: "restaurant",
    label: "Fine dining",
    icon: UtensilsCrossed,
    prompt:
      "Create a premium fine-dining restaurant site with menu, chef story, gallery, and table booking.",
  },
  {
    id: "bistro",
    label: "Neighborhood bistro",
    icon: Wine,
    prompt:
      "Design a warm neighborhood bistro website with seasonal menu, about, location, and reservations.",
  },
  {
    id: "opening",
    label: "Grand opening",
    icon: Sparkles,
    prompt:
      "Build a grand-opening landing page for a new restaurant with hero, menu highlights, and reserve CTA.",
  },
  {
    id: "local",
    label: "Local spot",
    icon: MapPin,
    prompt:
      "Create a local cafe site focused on location, hours, signature drinks, and walk-in friendly vibe.",
  },
];

type HomeDashboardProps = {
  userName?: string;
  onStartBuild: (prompt: string) => void;
  disabled?: boolean;
  /** Opens the mobile workspace drawer (< md). */
  onOpenMenu?: () => void;
};

/**
 * Lovable-style starting page: mesh gradient, greeting, prompt, quick chips.
 */
export function HomeDashboard({
  userName = "John",
  onStartBuild,
  disabled = false,
  onOpenMenu,
}: HomeDashboardProps) {
  const [prompt, setPrompt] = useState("");

  /**
   * Fills the composer with a quick-start template; user still clicks Build.
   */
  function fillFromChip(chip: QuickChip) {
    if (disabled) return;
    setPrompt(chip.prompt);
  }

  return (
    <main
      className="lovable-mesh relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      aria-label="Dashboard"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex shrink-0 flex-col gap-2 px-3 pt-3 sm:gap-3 sm:px-4 sm:pt-5 md:items-center md:pt-6">
        <div className="flex items-center justify-between gap-2 md:contents">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            {onOpenMenu ? (
              <button
                type="button"
                onClick={onOpenMenu}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-black/35 text-white/90 backdrop-blur-md transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Open workspace navigation"
              >
                <Menu className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            <div className="flex min-w-0 items-center gap-2">
              <BrandMark className="size-7" />
              <span className="truncate text-[13px] font-medium text-white/90">
                {BRAND_NAME}
              </span>
            </div>
          </div>
        </div>

        <div
          className="inline-flex w-full max-w-xl items-center gap-2 self-stretch rounded-2xl border border-amber-400/25 bg-black/40 px-2.5 py-1.5 text-[11px] leading-snug text-white/90 backdrop-blur-md sm:self-center sm:rounded-full sm:px-3 sm:text-[12px]"
          role="status"
          aria-label="Internal use only: do not share this link — tokens may get exhausted"
        >
          <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black uppercase">
            Internal
          </span>
          <span className="min-w-0 text-left sm:truncate">
            <span className="sm:hidden">
              Internal only — don’t share; tokens may run out.
            </span>
            <span className="hidden sm:inline">
              Open now — don’t share this link; tokens may get exhausted.
              Internal use only.
            </span>
          </span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[min(100%,32rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-6 sm:pb-16 sm:pt-8">
        <h1 className="max-w-3xl text-center text-[1.75rem] font-semibold tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
          Got an idea, {userName}?
        </h1>

        <div id="prompt" className="mt-6 w-full max-w-2xl scroll-mt-8 sm:mt-8">
          <PromptComposer
            variant="home"
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={onStartBuild}
            disabled={disabled}
            placeholder="Ask Dharwin to create a restaurant website…"
            submitLabel="Build"
          />
        </div>

        <ul
          className="mt-4 flex w-full max-w-3xl snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] mask-[linear-gradient(90deg,#000_calc(100%-1.25rem),transparent)] sm:mt-5 sm:mask-none sm:flex-wrap sm:items-center sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 sm:[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Quick start templates"
        >
          {QUICK_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <li key={chip.id} className="shrink-0 snap-start sm:shrink">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fillFromChip(chip)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-[13px] whitespace-nowrap text-white/90 backdrop-blur-md transition",
                    "hover:border-white/25 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  aria-label={`Fill prompt with ${chip.label} template`}
                >
                  <Icon className="size-3.5 opacity-80" aria-hidden="true" />
                  {chip.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
