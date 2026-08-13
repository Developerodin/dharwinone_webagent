import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Page, SectionType } from "@/types/page";
import { textFieldToPlain } from "@/components/premium/contentHelpers";

/** An edit op object sent to the edit API. */
export type EditOp =
  | { op: "cycle_section_component"; section: string }
  | {
      op: "set_section_spacing";
      section: string;
      paddingY: "tight" | "normal" | "roomy";
    }
  | {
      op: "set_section_style";
      section: string;
      background: string;
      text: null;
      button: null;
      paddingY: null;
    }
  | { op: "reorder_section"; section: string; toIndex: number }
  | { op: "remove_section"; section: string }
  | { op: "remix_section"; section: string; salt: string | null }
  | { op: "cycle_image"; section: string; index: number | null }
  | {
      op: "set_text_style";
      section: string;
      field: string;
      match: string;
      color: string;
    };

type SectionActionPanelProps = {
  /** The selected section type. */
  sectionType: SectionType;
  /** Full page — needed to compute current index for move ops. */
  page: Page;
  /** Called with an array of ops when the user triggers a panel action. */
  onApplyOps: (ops: EditOp[]) => void;
  /** Called when the user closes the panel (e.g. X or Esc). */
  onClose: () => void;
};

const SPACING_OPTIONS = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "roomy", label: "Roomy" },
] as const;

const BG_OPTIONS = [
  { value: "var(--theme-bg)", label: "Base" },
  { value: "var(--theme-bg-alt)", label: "Alt" },
  { value: "var(--theme-bg-dark)", label: "Dark" },
] as const;

/**
 * Returns the zero-based index of the matching section, or -1.
 */
function sectionIndex(page: Page, type: SectionType): number {
  return page.sections.findIndex((s) => s.type === type);
}

/**
 * Contextual floating panel for layout/spacing/background/move/remove actions
 * on the currently selected page section.
 */
export function SectionActionPanel({
  sectionType,
  page,
  onApplyOps,
  onClose,
}: SectionActionPanelProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [colorWord, setColorWord] = useState("");
  const [colorHex, setColorHex] = useState("#e63946");
  const [colorField, setColorField] = useState("headline");

  const idx = sectionIndex(page, sectionType);
  const canMoveUp = idx > 0;
  const canMoveDown = idx >= 0 && idx < page.sections.length - 1;

  const currentSpacing = page.sections[idx]?.styleOverrides?.paddingY ?? "normal";
  const sectionContent = page.sections[idx]?.content ?? {};

  /** Returns a short sample from the selected field, for a helpful placeholder. */
  const fieldSample = (() => {
    const plain = textFieldToPlain(sectionContent[colorField]);
    const words = plain.split(/\s+/).filter(Boolean);
    return words.length > 1 ? words[words.length - 1] : words[0] ?? "";
  })();

  /** Emits a single op and calls onApplyOps. */
  function emit(op: EditOp) {
    onApplyOps([op]);
  }

  /**
   * Emits a set_text_style op for the entered word and color.
   * Validates that both fields are non-empty before emitting.
   */
  function handleColorWord() {
    const match = colorWord.trim();
    if (!match) return;
    emit({ op: "set_text_style", section: sectionType, field: colorField, match, color: colorHex });
    setColorWord("");
  }

  return (
    <div
      className="pointer-events-auto flex flex-col gap-1 rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] p-2 shadow-lg animate-shell-in"
      role="region"
      aria-label={`Section actions for ${sectionType}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lovable-text-muted)]">
          {sectionType}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-6 items-center justify-center rounded-md text-[var(--lovable-text-faint)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] transition"
          aria-label="Close section panel"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Layout cycle */}
      <PanelRow label="Layout">
        <button
          type="button"
          onClick={() => emit({ op: "cycle_section_component", section: sectionType })}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-2 py-1 text-[11px] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] transition"
          aria-label="Cycle section layout variant"
        >
          <ChevronLeft className="size-3" aria-hidden="true" />
          Variant
          <ChevronRight className="size-3" aria-hidden="true" />
        </button>
      </PanelRow>

      {/* Spacing chips */}
      <PanelRow label="Spacing">
        <div className="flex gap-1" role="group" aria-label="Section spacing">
          {SPACING_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                emit({
                  op: "set_section_spacing",
                  section: sectionType,
                  paddingY: value,
                })
              }
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] transition",
                currentSpacing === value
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-[var(--lovable-border)] bg-[var(--lovable-bg)] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)]",
              )}
              aria-label={`Set spacing to ${label}`}
              aria-pressed={currentSpacing === value}
            >
              {label}
            </button>
          ))}
        </div>
      </PanelRow>

      {/* Background chips */}
      <PanelRow label="Background">
        <div className="flex gap-1" role="group" aria-label="Section background">
          {BG_OPTIONS.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                emit({
                  op: "set_section_style",
                  section: sectionType,
                  background: value,
                  text: null,
                  button: null,
                  paddingY: null,
                })
              }
              className="rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-2 py-0.5 text-[11px] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] transition"
              aria-label={`Set background to ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </PanelRow>

      {/* Move up / down */}
      <PanelRow label="Move">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() =>
              emit({ op: "reorder_section", section: sectionType, toIndex: idx - 1 })
            }
            className="inline-flex size-7 items-center justify-center rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Move section up"
          >
            <ArrowUp className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() =>
              emit({ op: "reorder_section", section: sectionType, toIndex: idx + 1 })
            }
            className="inline-flex size-7 items-center justify-center rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Move section down"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </PanelRow>

      {/* Color word */}
      <div className="border-t border-[var(--lovable-border)] pt-1.5 mt-0.5">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--lovable-text-faint)]">
          Color a word
        </p>
        <div className="flex items-center gap-1 px-1">
          <input
            type="text"
            value={colorWord}
            onChange={(e) => setColorWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleColorWord(); }}
            placeholder={fieldSample ? `e.g. "${fieldSample}"` : "word to color"}
            aria-label="Word or phrase to color"
            className="min-w-0 flex-1 rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-2 py-0.5 text-[11px] text-[var(--lovable-text)] placeholder:text-[var(--lovable-text-faint)] focus:border-blue-500 focus:outline-none"
          />
          <label className="relative inline-flex cursor-pointer" aria-label="Pick text color">
            <span
              className="flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--lovable-border)]"
              style={{ backgroundColor: colorHex }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            disabled={!colorWord.trim()}
            onClick={handleColorWord}
            className="shrink-0 rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-2 py-0.5 text-[11px] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Apply color to word"
          >
            Apply
          </button>
        </div>
        <div className="mt-1 flex items-center gap-1 px-1">
          <span className="w-16 shrink-0 text-[10px] text-[var(--lovable-text-faint)]">In field</span>
          <select
            value={colorField}
            onChange={(e) => setColorField(e.target.value)}
            aria-label="Select text field to color"
            className="rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-1 py-0.5 text-[11px] text-[var(--lovable-text-muted)] focus:border-blue-500 focus:outline-none"
          >
            <option value="headline">Headline</option>
            <option value="subheading">Subheading</option>
            <option value="body">Body</option>
            <option value="introText">Intro text</option>
          </select>
        </div>
      </div>

      {/* Remove */}
      <div className="border-t border-[var(--lovable-border)] pt-1.5 mt-0.5">
        {confirmRemove ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[var(--lovable-text-muted)] mr-1">Remove?</span>
            <button
              type="button"
              onClick={() => {
                setConfirmRemove(false);
                emit({ op: "remove_section", section: sectionType });
                onClose();
              }}
              className="rounded-md bg-red-500/10 border border-red-500/40 px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-500/20 transition"
              aria-label="Confirm remove section"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-2 py-0.5 text-[11px] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] transition"
              aria-label="Cancel remove"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-[var(--lovable-text-muted)] hover:bg-red-500/10 hover:text-red-400 transition"
            aria-label="Remove section"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove section
          </button>
        )}
      </div>
    </div>
  );
}

type PanelRowProps = {
  label: string;
  children: ReactNode;
};

/**
 * A labelled row inside the SectionActionPanel.
 */
function PanelRow({ label, children }: PanelRowProps) {
  return (
    <div className="flex items-center gap-2 px-1 py-0.5">
      <span className="w-16 shrink-0 text-[10px] text-[var(--lovable-text-faint)]">
        {label}
      </span>
      {children}
    </div>
  );
}
