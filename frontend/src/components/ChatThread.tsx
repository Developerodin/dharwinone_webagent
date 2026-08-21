import { useEffect, useRef, type ReactNode } from "react";
import { AgentPipelineCard } from "@/components/AgentPipelineCard";
import { ChatRoundupCard } from "@/components/chat/ChatRoundupCard";
import { SuggestionChipRow } from "@/components/chat/SuggestionChipRow";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { Button } from "@/components/ui/button";
import {
  buildAgentStepViews,
  PIPELINE_AGENT_NAMES,
} from "@/lib/pipelineAgents";
import { cn } from "@/lib/utils";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { ChatAction } from "@/types/chat";

type ChatThreadProps = {
  messages: ChatMessage[];
  onAction: (action: ChatAction["action"]) => void;
  isBusy: boolean;
  phase?: ChatPhase;
  /** Sends a suggestion chip as the next user message. */
  onSuggestion?: (text: string) => void;
};

type ThreadBlock =
  | { type: "message"; message: ChatMessage }
  | { type: "pipeline"; messages: ChatMessage[]; key: string };

/**
 * Renders bold markdown segments inside a single line of chat text.
 */
function renderInlineBold(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={`${keyPrefix}-b-${index}`}
          className="font-semibold text-[var(--lovable-text)]"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>;
  });
}

/**
 * True when a line looks like a bullet / numbered list item.
 */
function isListLine(line: string): boolean {
  return /^(\s*[-•*]|\s*\d+\.)\s+/.test(line);
}

/**
 * Renders chat content with paragraph gaps (blank lines) and list breathing room.
 */
function renderMessageContent(text: string): ReactNode {
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="chat-message-body">
      {paragraphs.map((paragraph, pIndex) => {
        const lines = paragraph.split("\n");
        const listLike =
          lines.length > 1 && lines.every((line) => !line || isListLine(line));

        if (listLike) {
          return (
            <div key={`p-${pIndex}`} className="chat-line-list">
              {lines
                .filter((line) => line.trim().length > 0)
                .map((line, lineIndex) => (
                  <p key={`p-${pIndex}-l-${lineIndex}`}>
                    {renderInlineBold(line, `p${pIndex}l${lineIndex}`)}
                  </p>
                ))}
            </div>
          );
        }

        return (
          <p key={`p-${pIndex}`}>
            {lines.map((line, lineIndex) => (
              <span key={`p-${pIndex}-s-${lineIndex}`}>
                {renderInlineBold(line, `p${pIndex}s${lineIndex}`)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * True when any staged agent is still running or pending.
 */
function hasActivePipelineStage(messages: ChatMessage[]): boolean {
  return messages.some(
    (msg) =>
      msg.role === "agent" &&
      (msg.stageStatus === "running" || msg.stageStatus === "pending"),
  );
}

/**
 * Index of the latest in-flight agent message, or -1 if none.
 */
function findLastActiveAgentIndex(messages: ChatMessage[]): number {
  let last = -1;
  for (let index = 0; index < messages.length; index += 1) {
    const msg = messages[index];
    if (
      msg?.role === "agent" &&
      (msg.stageStatus === "running" || msg.stageStatus === "pending")
    ) {
      last = index;
    }
  }
  return last;
}

/**
 * Drops assistant messages that arrived after an still-running agent card
 * (guards against success + "Open preview" flashing while Working).
 */
function suppressPrematureAssistantMessages(
  messages: ChatMessage[],
): ChatMessage[] {
  const lastActive = findLastActiveAgentIndex(messages);
  if (lastActive < 0) return messages;

  return messages.filter((msg, index) => {
    if (index <= lastActive) return true;
    return msg.role !== "assistant";
  });
}

/**
 * Groups consecutive staged agent messages into one pipeline card block.
 * During build, known pipeline agents are deferred into a single live team card.
 */
function groupThreadBlocks(
  messages: ChatMessage[],
  phase?: ChatPhase,
): ThreadBlock[] {
  const blocks: ThreadBlock[] = [];
  const isBuilding = phase === "building";

  for (const message of messages) {
    const isKnownPipelineAgent =
      message.role === "agent" &&
      Boolean(message.stageName) &&
      (PIPELINE_AGENT_NAMES as readonly string[]).includes(
        message.stageName ?? "",
      );

    if (isBuilding && isKnownPipelineAgent) {
      continue;
    }

    const isStageAgent =
      message.role === "agent" && Boolean(message.stageName);

    if (!isStageAgent) {
      blocks.push({ type: "message", message });
      continue;
    }

    const last = blocks[blocks.length - 1];
    if (last?.type === "pipeline") {
      last.messages.push(message);
    } else {
      blocks.push({
        type: "pipeline",
        messages: [message],
        key: `pipeline-${message.id}`,
      });
    }
  }

  if (isBuilding) {
    const byName = new Map<string, ChatMessage>();
    for (const msg of messages) {
      if (
        msg.role === "agent" &&
        msg.stageName &&
        (PIPELINE_AGENT_NAMES as readonly string[]).includes(msg.stageName)
      ) {
        byName.set(msg.stageName, msg);
      }
    }
    const buildStages = PIPELINE_AGENT_NAMES.map((name) =>
      byName.get(name),
    ).filter((msg): msg is ChatMessage => Boolean(msg));

    if (buildStages.length > 0) {
      blocks.push({
        type: "pipeline",
        messages: buildStages,
        key: "pipeline-live-build",
      });
    }
  }

  return blocks;
}

/**
 * Scrollable chat thread — ChatGPT quiet hierarchy + Lovable agent team card.
 */
export function ChatThread({
  messages,
  onAction,
  isBusy,
  phase,
  onSuggestion,
}: ChatThreadProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pipelineActive = hasActivePipelineStage(messages);
  /** Hide completion CTAs while upload/build agents or request are in flight. */
  const hideActions = isBusy || pipelineActive;
  const visibleMessages = pipelineActive
    ? suppressPrematureAssistantMessages(messages)
    : messages;
  const blocks = groupThreadBlocks(visibleMessages, phase);
  const showBusyHint =
    isBusy &&
    !visibleMessages.some(
      (msg) =>
        msg.role === "agent" &&
        (msg.stageStatus === "running" || msg.stageStatus === "pending"),
    );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [visibleMessages, isBusy, phase]);

  return (
    <div
      ref={scrollerRef}
      className="chat-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-5"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Conversation"
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-7 py-2 pb-6 sm:gap-8">
        {visibleMessages.length === 0 ? <EmptyChat /> : null}
        {blocks.map((block) =>
          block.type === "pipeline" ? (
            <PipelineBlock
              key={block.key}
              messages={block.messages}
              phase={phase}
            />
          ) : (
            <MessageBubble
              key={block.message.id}
              message={block.message}
              onAction={onAction}
              onSuggestion={onSuggestion}
              hideActions={hideActions}
              suggestionsDisabled={isBusy}
            />
          ),
        )}
        {showBusyHint ? (
          <div className="px-1 pt-1">
            <ThinkingIndicator label="Thinking…" live size="sm" />
          </div>
        ) : null}
        <div ref={endRef} aria-hidden="true" className="h-px shrink-0" />
      </div>
    </div>
  );
}

type PipelineBlockProps = {
  messages: ChatMessage[];
  phase?: ChatPhase;
};

/**
 * Renders a collaborative agent step list from staged chat messages.
 */
function PipelineBlock({ messages, phase }: PipelineBlockProps) {
  const onlyKnownPipeline = messages.every((msg) =>
    (PIPELINE_AGENT_NAMES as readonly string[]).includes(msg.stageName ?? ""),
  );
  const includePendingRoster = onlyKnownPipeline && phase === "building";

  const steps = buildAgentStepViews(
    messages.map((msg) => ({
      stageName: msg.stageName,
      stageStatus: msg.stageStatus,
      stageDetail: msg.stageDetail,
      ms: msg.stageMs,
    })),
    { includePendingRoster },
  );

  const title =
    steps.length === 1 && steps[0]?.name === "Brief Extractor"
      ? "Analyzing your brief"
      : steps.length === 1 && steps[0]?.name === "Editor"
        ? "Editor at work"
        : steps.length === 1 && steps[0]?.name === "Media Uploader"
          ? "Uploading media"
          : "Agents building your page";

  return <AgentPipelineCard steps={steps} title={title} />;
}

/**
 * Empty conversation placeholder (rarely shown — welcome message usually exists).
 */
function EmptyChat() {
  return (
    <div className="flex flex-col items-start gap-3 py-10 animate-shell-in">
      <p className="text-2xl font-semibold tracking-tight text-[var(--lovable-text)]">
        What are we building?
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--lovable-text-muted)]">
        Tell me about your restaurant — name, vibe, menu — and I&apos;ll draft
        a page you can edit in chat.
      </p>
    </div>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  onAction: (action: ChatAction["action"]) => void;
  onSuggestion?: (text: string) => void;
  /** When true, suppress CTAs (e.g. while Media Uploader is Working). */
  hideActions?: boolean;
  suggestionsDisabled?: boolean;
};

/**
 * Single chat message with role-specific styling and generous turn spacing.
 */
function MessageBubble({
  message,
  onAction,
  onSuggestion,
  hideActions = false,
  suggestionsDisabled = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAgent = message.role === "agent";
  const isAssistant = message.role === "assistant";
  const actions = message.actions ?? [];
  const showActions = !hideActions && actions.length > 0;
  const suggestions = message.suggestions ?? [];

  if (message.kind === "roundup") {
    return (
      <ChatRoundupCard
        message={message}
        onAction={onAction}
        hideActions={hideActions}
      />
    );
  }

  return (
    <article
      className={cn("flex animate-shell-in", isUser && "justify-end")}
      aria-label={`${message.role} message`}
    >
      <div
        className={cn(
          "min-w-0 text-[13px] leading-[1.65] sm:text-sm",
          isUser &&
            "max-w-[min(100%,22rem)] rounded-[1.15rem] bg-[#2a2a2e] px-4 py-3.5 text-[var(--lovable-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          isAssistant &&
            "max-w-[min(100%,28rem)] flex-1 px-0.5 py-0.5 text-[var(--lovable-text-muted)]",
          isAgent &&
            "w-full max-w-[min(100%,28rem)] rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-3.5 py-3 text-xs text-[var(--lovable-text-faint)]",
        )}
      >
        <div
          className={cn(
            isAssistant && "[&_strong]:text-[var(--lovable-text)]",
            isUser &&
              "[&_strong]:text-white [&_.chat-message-body]:gap-2.5",
          )}
        >
          {renderMessageContent(message.content)}
        </div>

        {message.pageFamily ? (
          <p
            className={cn(
              "mt-4 text-xs",
              isUser
                ? "text-[var(--lovable-text-muted)]"
                : "text-[var(--lovable-text-faint)]",
            )}
          >
            Theme: {getPageFamilyLabel(message.pageFamily)}
          </p>
        ) : null}

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

        {isAssistant && onSuggestion && suggestions.length > 0 ? (
          <SuggestionChipRow
            suggestions={suggestions}
            onSelect={onSuggestion}
            disabled={suggestionsDisabled}
          />
        ) : null}
      </div>
    </article>
  );
}
