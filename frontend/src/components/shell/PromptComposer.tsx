import { useId, useState } from "react";
import { Mic, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type PromptComposerProps = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Home = large pill on mesh; editor = chat panel composer */
  variant?: "home" | "editor";
  /** Prefill value controlled by parent chips */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Label on primary action button */
  submitLabel?: string;
  className?: string;
};

/**
 * Lovable-style pill prompt with Build dropdown, mic, and send.
 */
export function PromptComposer({
  onSubmit,
  disabled = false,
  placeholder = "Ask Dharwin to create a restaurant site…",
  variant = "home",
  value: controlledValue,
  onValueChange,
  submitLabel = "Build",
  className,
}: PromptComposerProps) {
  const inputId = useId();
  const [internalValue, setInternalValue] = useState("");
  const isControlled = typeof controlledValue === "string";
  const value = isControlled ? controlledValue : internalValue;

  /**
   * Updates the prompt text from typing or chips.
   */
  function setValue(next: string) {
    if (isControlled) {
      onValueChange?.(next);
    } else {
      setInternalValue(next);
    }
  }

  /**
   * Submits trimmed prompt text.
   */
  function handleSubmit() {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  const isHome = variant === "home";

  return (
    <form
      className={cn(
        "flex flex-col gap-2 transition",
        isHome
          ? "builder-composer-home rounded-[1.75rem] p-3 sm:p-3.5"
          : "builder-composer rounded-2xl p-2.5 sm:p-3",
        !disabled && !value.trim() && isHome ? "animate-composer-hint" : "",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      aria-label={isHome ? "Start building" : "Ask the builder"}
    >
      <label htmlFor={inputId} className="sr-only">
        Your prompt
      </label>
      <textarea
        id={inputId}
        name="prompt"
        rows={isHome ? 2 : 2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-busy={disabled}
        className={cn(
          "w-full resize-none border-0 bg-transparent px-2 py-1.5 leading-relaxed shadow-none outline-none placeholder:text-[var(--lovable-text-faint)] focus-visible:ring-0 disabled:opacity-50",
          isHome
            ? "min-h-[52px] max-h-[120px] text-[15px] text-white sm:text-base"
            : "min-h-[48px] max-h-[120px] text-sm text-[var(--lovable-text)]",
        )}
      />

      <div className="flex items-center justify-end gap-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-busy={disabled}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--lovable-border-strong)] bg-[var(--lovable-bg)] px-3.5 text-[13px] font-medium text-[var(--lovable-text)] transition hover:bg-[var(--lovable-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`${submitLabel} from prompt`}
          >
            {submitLabel}
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex size-9 cursor-not-allowed items-center justify-center rounded-full text-[var(--lovable-text-muted)] opacity-40"
            aria-label="Voice input unavailable"
            title="Voice input unavailable"
          >
            <Mic className="size-4" aria-hidden="true" />
          </button>

          {!isHome ? (
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--lovable-blue)] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
