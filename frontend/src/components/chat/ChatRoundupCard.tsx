import { Button } from "@/components/ui/button";
import type { ChatAction, ChatMessage } from "@/types/chat";

type ChatRoundupCardProps = {
  message: ChatMessage;
  onAction: (action: ChatAction["action"]) => void;
  hideActions?: boolean;
};

/**
 * Post-build operation card: title, summary, and preview CTAs.
 */
export function ChatRoundupCard({
  message,
  onAction,
  hideActions = false,
}: ChatRoundupCardProps) {
  const title = message.roundupTitle ?? "Site design ready";
  const actions = message.actions ?? [];
  const showActions = !hideActions && actions.length > 0;

  return (
    <article
      className="w-full max-w-[min(100%,28rem)] overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-bg)] animate-shell-in"
      aria-label={title}
    >
      <header className="border-b border-[var(--lovable-border)] px-3.5 py-2.5">
        <p className="text-xs font-semibold tracking-tight text-[var(--lovable-text)]">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-emerald-400/90">Ready to preview</p>
      </header>
      <div className="px-3.5 py-3">
        <div className="chat-message-body text-[13px] leading-[1.65] text-[var(--lovable-text-muted)] sm:text-sm">
          {message.content.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>
              {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong
                    key={partIndex}
                    className="font-semibold text-[var(--lovable-text)]"
                  >
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  <span key={partIndex}>{part}</span>
                ),
              )}
            </p>
          ))}
        </div>
        {showActions ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant={action.variant === "outline" ? "outline" : "default"}
                aria-label={action.ariaLabel ?? action.label}
                onClick={() => onAction(action.action)}
                className={
                  action.variant === "primary" || action.variant === undefined
                    ? "h-9 rounded-lg bg-[var(--lovable-blue)] px-3.5 text-white hover:opacity-90"
                    : "h-9 rounded-lg border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-3.5 text-[var(--lovable-text)] hover:bg-[var(--lovable-hover)]"
                }
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
