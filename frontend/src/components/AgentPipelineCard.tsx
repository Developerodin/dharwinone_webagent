import { AlertCircle, Check, Circle } from "lucide-react";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import {
  getActiveAgentStep,
  getAgentIcon,
  type AgentStepView,
} from "@/lib/pipelineAgents";
import { cn } from "@/lib/utils";

type AgentPipelineCardProps = {
  steps: AgentStepView[];
  /** Compact header while analyzing (single agent) vs full build team. */
  title?: string;
  className?: string;
};

/**
 * Collaborative multi-agent build panel — stacked steps with spin / check states.
 */
export function AgentPipelineCard({
  steps,
  title = "Agents building your page",
  className,
}: AgentPipelineCardProps) {
  const active = getActiveAgentStep(steps);
  const hasError = steps.some((step) => step.status === "error");

  return (
    <section
      className={cn(
        "w-full overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-bg)] animate-shell-in",
        className,
      )}
      aria-label={title}
      aria-busy={Boolean(active)}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--lovable-border)] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-tight text-[var(--lovable-text)]">
            {title}
          </p>
          {active ? (
            <p
              className="mt-0.5 truncate text-[11px] text-[var(--lovable-text-muted)]"
              aria-live="polite"
            >
              {active.name}: {active.detail}
            </p>
          ) : hasError ? (
            <p className="mt-0.5 text-[11px] text-red-400">
              A step failed — check the thread for details
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-emerald-400/90">
              All agents finished
            </p>
          )}
        </div>
        {active ? (
          <ThinkingIndicator label="Working" live className="shrink-0" />
        ) : !hasError ? (
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
            aria-label="Done"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : null}
      </header>

      <ol
        className="divide-y divide-[var(--lovable-border)]"
        aria-label="Agent steps"
      >
        {steps.map((step) => (
          <AgentStepRow key={step.name} step={step} />
        ))}
      </ol>
    </section>
  );
}

type AgentStepRowProps = {
  step: AgentStepView;
};

/**
 * Single agent row: icon + name + status affordance.
 */
function AgentStepRow({ step }: AgentStepRowProps) {
  const Icon = getAgentIcon(step.name);
  const isRunning = step.status === "running";
  const isDone = step.status === "done";
  const isError = step.status === "error";
  const isPending = step.status === "pending";

  return (
    <li
      className={cn(
        "flex items-start gap-3 px-3.5 py-2.5 transition-colors duration-200",
        isRunning && "bg-[var(--lovable-hover)]",
        isPending && "opacity-55",
      )}
      aria-current={isRunning ? "step" : undefined}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border",
          isRunning &&
            "border-sky-500/35 bg-[var(--lovable-panel)] text-sky-400",
          isDone && "border-transparent bg-emerald-500/15 text-emerald-400",
          isError && "border-red-500/30 bg-red-500/10 text-red-400",
          isPending &&
            "border-[var(--lovable-border)] bg-[var(--lovable-panel)] text-[var(--lovable-text-faint)]",
        )}
        aria-hidden="true"
      >
        <Icon className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-xs font-medium text-[var(--lovable-text)]",
              isPending && "text-[var(--lovable-text-faint)]",
            )}
          >
            {step.name}
          </p>
          <StatusGlyph status={step.status} ms={step.ms} />
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-[11px] leading-snug text-[var(--lovable-text-faint)]",
            isRunning && "text-[var(--lovable-text-muted)]",
          )}
        >
          {step.detail}
          {isDone && step.ms !== undefined ? (
            <span className="tabular-nums text-[var(--lovable-text-faint)]">
              {" "}
              ·{" "}
              {step.ms >= 1000
                ? `${(step.ms / 1000).toFixed(1)}s`
                : `${step.ms}ms`}
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}

type StatusGlyphProps = {
  status: AgentStepView["status"];
  ms?: number;
};

/**
 * Compact status mark for an agent step.
 */
function StatusGlyph({ status }: StatusGlyphProps) {
  if (status === "running") {
    return (
      <span
        className="inline-flex size-4 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span className="size-2 rounded-full bg-sky-400 animate-think-dot" />
      </span>
    );
  }
  if (status === "done") {
    return (
      <span
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
        aria-label="Done"
      >
        <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <AlertCircle className="size-4 shrink-0 text-red-400" aria-label="Error" />
    );
  }
  return (
    <Circle
      className="size-3.5 shrink-0 text-[var(--lovable-border-strong)]"
      aria-label="Pending"
    />
  );
}
