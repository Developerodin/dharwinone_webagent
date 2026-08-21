import { useEffect, useRef } from "react";
import type { InlineTextSession } from "@/hooks/useCanvasTool";

type InlineTextEditorProps = {
  session: InlineTextSession;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

/**
 * Overlay textarea positioned on the picked preview node.
 */
export function InlineTextEditor({
  session,
  onCommit,
  onCancel,
}: InlineTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const closedRef = useRef(false);
  const { rect, value, pick } = session;
  const multiline = pick.field === "body" || pick.field === "subheading";

  useEffect(() => {
    closedRef.current = false;
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [session.pick.section, session.pick.field, session.value]);

  /**
   * Enter commits; Shift+Enter inserts a newline on longer fields.
   */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish(() => onCancel());
      return;
    }
    if (event.key !== "Enter") return;
    if (multiline && event.shiftKey) return;
    event.preventDefault();
    commitIfDirty(event.currentTarget.value);
  }

  /**
   * Saves when the overlay loses focus and the text actually changed.
   */
  function handleBlur(event: React.FocusEvent<HTMLTextAreaElement>) {
    commitIfDirty(event.currentTarget.value);
  }

  /**
   * Runs a close action once so Enter+blur cannot double-save.
   */
  function finish(action: () => void) {
    if (closedRef.current) return;
    closedRef.current = true;
    action();
  }

  /**
   * Commits when the text changed; otherwise cancels.
   */
  function commitIfDirty(next: string) {
    const trimmed = multiline ? next.trim() : next.replace(/\s+/g, " ").trim();
    const original = multiline
      ? value.trim()
      : value.replace(/\s+/g, " ").trim();
    if (trimmed === original) {
      finish(() => onCancel());
      return;
    }
    finish(() => onCommit(trimmed));
  }

  return (
    <div
      data-pick-overlay=""
      className="absolute inset-0 z-30"
      aria-label="Inline text editor"
    >
      <label className="sr-only" htmlFor="inline-text-editor">
        Edit {pick.field ?? "text"}
      </label>
      <textarea
        id="inline-text-editor"
        ref={ref}
        defaultValue={value}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={multiline ? 3 : 1}
        className="absolute resize-none bg-[var(--lovable-bg)] px-2 py-1 text-[13px] leading-snug text-[var(--lovable-text)] outline-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: Math.max(rect.width, 120),
          minHeight: Math.max(rect.height, 28),
          border: "2px dashed rgb(59 130 246)",
        }}
      />
    </div>
  );
}
