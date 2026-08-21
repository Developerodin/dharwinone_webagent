type SuggestionChipRowProps = {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
};

/**
 * Oval follow-up chips that send the label as the next chat message.
 */
export function SuggestionChipRow({
  suggestions,
  onSelect,
  disabled = false,
}: SuggestionChipRowProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      role="group"
      aria-label="Suggested next steps"
    >
      {suggestions.map((label) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(label)}
          className="inline-flex min-h-8 max-w-full items-center rounded-full border border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-3 py-1.5 text-left text-[12px] text-[var(--lovable-text-muted)] transition hover:border-[var(--lovable-text-faint)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Send: ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
