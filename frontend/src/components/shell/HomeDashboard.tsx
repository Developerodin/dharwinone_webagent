import { useState } from "react";
import {
  Coffee,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { PromptComposer } from "@/components/shell/PromptComposer";
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
};

/**
 * Lovable-style starting page: mesh gradient, greeting, prompt, quick chips.
 */
export function HomeDashboard({
  userName = "John",
  onStartBuild,
  disabled = false,
}: HomeDashboardProps) {
  const [prompt, setPrompt] = useState("");

  /**
   * Starts a build immediately from a quick-start chip prompt.
   */
  function startFromChip(chip: QuickChip) {
    if (disabled) return;
    setPrompt(chip.prompt);
    onStartBuild(chip.prompt);
  }

  return (
    <main
      className="lovable-mesh relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
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

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 pt-4 sm:justify-center sm:pt-6">
        <div className="flex items-center gap-2 md:hidden">
          <div
            className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-violet-500 to-blue-500 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            P+
          </div>
          <span className="text-[13px] font-medium text-white/90">ProwPlus</span>
        </div>
        <div
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/25 bg-black/40 px-3 py-1.5 text-[12px] text-white/90 backdrop-blur-md"
          role="status"
          aria-label="Internal use only: do not share this link — tokens may get exhausted"
        >
          <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black uppercase">
            Internal
          </span>
          <span className="truncate">
            Open now — don’t share this link; tokens may get exhausted. Internal use only.
          </span>
        </div>
        <span className="size-7 md:hidden" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-16 pt-8 sm:pb-20">
        <h1 className="max-w-3xl text-center text-[2rem] font-semibold tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
          Got an idea, {userName}?
        </h1>

        <div id="prompt" className="mt-8 w-full max-w-2xl scroll-mt-8">
          <PromptComposer
            variant="home"
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={onStartBuild}
            disabled={disabled}
            placeholder="Ask ProwPlus to create a restaurant website…"
            submitLabel="Build"
          />
        </div>

        <ul
          className="mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2"
          role="list"
          aria-label="Quick start templates"
        >
          {QUICK_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <li key={chip.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => startFromChip(chip)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-[13px] text-white/90 backdrop-blur-md transition",
                    "hover:border-white/25 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  aria-label={`Use ${chip.label} template`}
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
