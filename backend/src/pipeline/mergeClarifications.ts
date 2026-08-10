/**
 * Appends user clarification answers to the original chat dump for re-extraction.
 */
export function mergeClarificationAnswers(
  chatText: string,
  answers: Record<string, string>,
): string {
  const answerLines = Object.entries(answers)
    .filter(([, value]) => value.trim().length > 0)
    .map(([question, answer]) => `- ${question}: ${answer.trim()}`);

  if (answerLines.length === 0) {
    return chatText;
  }

  return [chatText.trim(), "", "Clarifications:", ...answerLines].join("\n");
}
