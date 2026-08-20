import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  BarChart3,
  CalendarCheck,
  Check,
  ChevronDown,
  Images,
  Info,
  LayoutTemplate,
  Mail,
  MapPin,
  MousePointer2,
  PanelBottom,
  Pencil,
  Quote,
  Sparkles,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  formatSectionLabel,
  sectionPickerSnippet,
} from "@/lib/sectionPicker";
import { cn } from "@/lib/utils";
import type { PageSection, SectionType } from "@/types/page";

const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  header: LayoutTemplate,
  hero: Sparkles,
  menu: UtensilsCrossed,
  about: Info,
  gallery: Images,
  location_map: MapPin,
  services: LayoutTemplate,
  stats: BarChart3,
  testimonials: Quote,
  team: Users,
  reservation: CalendarCheck,
  contact: Mail,
  footer: PanelBottom,
};

type SectionPickerPopoverProps = {
  sections: PageSection[];
  selectedSectionType?: string | null;
  onSelectSection: (type: string) => void;
  editMode: boolean;
  onEditModeChange: (on: boolean) => void;
  disabled?: boolean;
  /** Top-bar chip vs compact preview-chrome pill. */
  variant?: "bar" | "compact";
};

/**
 * Icon for a known section type; falls back to a generic layout mark.
 */
function iconForSection(type: string): LucideIcon {
  return SECTION_ICONS[type as SectionType] ?? LayoutTemplate;
}

/**
 * Edit-button popover: pick a preview section, or enter click-to-pick mode.
 */
export function SectionPickerPopover({
  sections,
  selectedSectionType = null,
  onSelectSection,
  editMode,
  onEditModeChange,
  disabled = false,
  variant = "bar",
}: SectionPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const active = open || editMode || Boolean(selectedSectionType);

  /**
   * Attaches a section, turns on edit mode, and closes the menu.
   */
  function handleSelect(type: string) {
    onEditModeChange(true);
    onSelectSection(type);
    setOpen(false);
  }

  /**
   * Enables canvas pick without choosing a section from the list.
   */
  function handlePickOnPreview() {
    onEditModeChange(true);
    setOpen(false);
  }

  /**
   * Leaves pick mode and clears the attached section.
   */
  function handleExitEdit() {
    onEditModeChange(false);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1 border font-medium transition",
          variant === "bar"
            ? "min-h-7 rounded-lg px-2.5 text-[12px]"
            : "shrink-0 rounded-full px-2.5 py-1 text-[11px] md:hidden",
          active
            ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
            : "border-[var(--lovable-border)] bg-[var(--lovable-bg)] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
          disabled && "cursor-not-allowed opacity-40 hover:bg-[var(--lovable-bg)]",
        )}
        aria-label={
          open ? "Close section picker" : "Select a section to edit"
        }
        aria-pressed={active}
        title={disabled ? "Build a page first" : "Select a section to edit"}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Edit
        <ChevronDown
          className={cn("size-3 transition", open && "rotate-180")}
          aria-hidden="true"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="center"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup
            className="w-[min(calc(100vw-1.5rem),18.5rem)] overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] shadow-[0_16px_40px_rgba(0,0,0,0.45)] outline-none animate-shell-in"
            aria-label="Select a preview section to edit"
          >
            <div className="border-b border-[var(--lovable-border)] px-3 py-2.5">
              <Popover.Title className="text-[12px] font-semibold text-[var(--lovable-text)]">
                Select a section
              </Popover.Title>
              <Popover.Description className="mt-0.5 text-[11px] leading-snug text-[var(--lovable-text-faint)]">
                Jump to a block on the preview, then edit it in chat.
              </Popover.Description>
            </div>

            {sections.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-[var(--lovable-text-muted)]">
                No sections yet — build a page first.
              </p>
            ) : (
              <ul
                className="max-h-72 overflow-y-auto p-1.5"
                role="listbox"
                aria-label="Page sections"
              >
                {sections.map((section, index) => {
                  const selected = selectedSectionType === section.type;
                  const Icon = iconForSection(section.type);
                  const snippet = sectionPickerSnippet(section);
                  const label = formatSectionLabel(section.type);
                  return (
                    <li key={`${section.type}-${section.componentId}-${index}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-label={
                          snippet ? `Edit ${label}: ${snippet}` : `Edit ${label}`
                        }
                        onClick={() => handleSelect(section.type)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition",
                          selected
                            ? "bg-blue-500/15 text-blue-200"
                            : "text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
                        )}
                      >
                        <Icon
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            selected
                              ? "text-blue-300"
                              : "text-[var(--lovable-text-faint)]",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-medium capitalize">
                            {label}
                          </span>
                          {snippet ? (
                            <span className="mt-0.5 block truncate text-[11px] text-[var(--lovable-text-faint)]">
                              {snippet}
                            </span>
                          ) : null}
                        </span>
                        {selected ? (
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-blue-300"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-0.5 border-t border-[var(--lovable-border)] p-1.5">
              <button
                type="button"
                onClick={handlePickOnPreview}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
                aria-label="Click an element on the preview to edit it"
              >
                <MousePointer2
                  className="size-3.5 text-[var(--lovable-text-faint)]"
                  aria-hidden="true"
                />
                Click on preview
              </button>
              {editMode ? (
                <button
                  type="button"
                  onClick={handleExitEdit}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
                  aria-label="Turn off section edit mode"
                >
                  Done
                </button>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
