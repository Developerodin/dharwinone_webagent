import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Brief } from "@/types/intake";

type ClarificationPanelProps = {
  questions: string[];
  answers: Record<string, string>;
  onAnswerChange: (question: string, value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  round: number;
};

/**
 * Inline clarification form for missing brief fields (max 2 rounds).
 */
export function ClarificationPanel({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  round,
}: ClarificationPanelProps) {
  return (
    <Card
      aria-label="Clarification questions"
      className="border-[var(--line)] bg-[var(--surface)] shadow-none"
    >
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Need a few details</CardTitle>
        <CardDescription>
          Round {round} of 2 — answer what you can so we extract an accurate
          brief before building.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {questions.map((question) => (
          <label
            key={question}
            htmlFor={`answer-${question}`}
            className="flex flex-col gap-2 text-sm"
          >
            <span className="font-medium text-[var(--ink)]">{question}</span>
            <Textarea
              id={`answer-${question}`}
              value={answers[question] ?? ""}
              onChange={(event) => onAnswerChange(question, event.target.value)}
              rows={2}
              className="min-h-[72px] border-[var(--line)] bg-[var(--paper)]"
              aria-label={question}
            />
          </label>
        ))}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="self-start bg-[var(--ink)] text-white hover:bg-[var(--accent)]"
        >
          {isSubmitting ? "Re-analyzing…" : "Submit answers"}
        </Button>
      </CardContent>
    </Card>
  );
}

type BriefSummaryCardProps = {
  brief: Brief;
  onConfirm: () => void;
  onBack: () => void;
  isBuilding: boolean;
};

/**
 * Shows extracted brief summary and requires explicit user confirmation.
 */
export function BriefSummaryCard({
  brief,
  onConfirm,
  onBack,
  isBuilding,
}: BriefSummaryCardProps) {
  return (
    <Card
      aria-label="Brief summary"
      className="border-[var(--line)] bg-[var(--surface)] shadow-none"
    >
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Confirm your brief</CardTitle>
        <CardDescription>
          Is this correct? We will only build after you confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="font-medium">Business:</span> {brief.businessName}
        </p>
        <p>
          <span className="font-medium">Category:</span> {brief.category}
        </p>
        {brief.phone ? (
          <p>
            <span className="font-medium">Phone:</span> {brief.phone}
          </p>
        ) : null}
        {brief.email ? (
          <p>
            <span className="font-medium">Email:</span> {brief.email}
          </p>
        ) : null}
        {brief.address ? (
          <p>
            <span className="font-medium">Address:</span> {brief.address}
          </p>
        ) : null}
        {brief.menuItems.length > 0 ? (
          <div>
            <p className="mb-2 font-medium">Menu ({brief.menuItems.length})</p>
            <ul className="list-inside list-disc space-y-1 text-[var(--muted)]">
              {brief.menuItems.map((item) => (
                <li key={item.name}>
                  {item.name} — ${item.price}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[var(--muted)]">No menu items extracted.</p>
        )}
      </CardContent>
      <div className="flex items-center gap-3 border-t border-[var(--line)] px-5 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isBuilding}
          className="border-[var(--line)]"
        >
          Edit dump
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isBuilding}
          aria-busy={isBuilding}
          className="bg-[var(--ink)] text-white hover:bg-[var(--accent)]"
        >
          {isBuilding ? "Building…" : "Confirm & Build"}
        </Button>
      </div>
    </Card>
  );
}
