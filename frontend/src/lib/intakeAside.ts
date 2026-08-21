/**
 * Off-topic replies during restaurant intake (math, trivia) must not be
 * stuffed into the brief. Keep this aligned with backend/src/pipeline/intakeAside.ts.
 */

/** Words that mean the reply is actually about the restaurant brief. */
const BRIEF_TOPIC_RE =
  /\b(hour|hours|open|opens|opening|close|closed|am|pm|menu|dish|dishes|price|priced|₹|rs\.?|email|inbox|address|located|location|map|pin|street|road|nagar|phone|mobile|whatsapp|cuisine|chinese|name|called|usp|different|vibe|colour|color|hex|neighbourhood|neighborhood|landmark|signature|skip)\b/i;

/** Question wrappers, including common typos like "waht". */
const QUESTION_PREFIX_RE =
  /^(what|waht|whats|what's|wut|which|why|who|where|tell me|explain|is this|are these|calculate|compute)\b/i;

const SKIP_RE =
  /\bskip(\s+for\s+now)?\b|\bcontinue\s+without\b|\bi\s+don'?t\s+have\b|\bnot\s+now\b/i;

/**
 * Pulls a simple binary arithmetic expression out of chat text.
 */
function extractSimpleMath(text: string): {
  left: number;
  right: number;
  op: "+" | "*" | "/";
} | null {
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*([+*/x×])\s*(\d+(?:\.\d+)?)/i,
  );
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[3]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const raw = match[2]!;
  const op: "+" | "*" | "/" =
    raw === "+" ? "+" : raw === "/" ? "/" : "*";
  return { left, right, op };
}

/**
 * Evaluates an extracted binary expression.
 */
function evalSimpleMath(
  expr: ReturnType<typeof extractSimpleMath>,
): number | null {
  if (!expr) return null;
  if (expr.op === "+") return expr.left + expr.right;
  if (expr.op === "*") return expr.left * expr.right;
  if (expr.right === 0) return null;
  return expr.left / expr.right;
}

/**
 * Formats a short spoken answer for a math aside (e.g. "2 + 3 = 5").
 */
export function formatMathAside(text: string): string | null {
  const expr = extractSimpleMath(text);
  const value = evalSimpleMath(expr);
  if (!expr || value === null) return null;
  const op = expr.op === "*" ? "×" : expr.op;
  const pretty =
    Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-10
      ? String(Math.round(value))
      : String(Number(value.toFixed(4)));
  return `${expr.left} ${op} ${expr.right} = ${pretty}`;
}

/**
 * True when the text is a question (including "waht is …" typos).
 */
export function looksLikeIntakeQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\?\s*$/.test(trimmed)) return true;
  return QUESTION_PREFIX_RE.test(trimmed);
}

/**
 * True when a clarification reply is chat/trivia, not a brief answer.
 */
export function isOffTopicIntakeReply(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (SKIP_RE.test(trimmed)) return false;
  if (BRIEF_TOPIC_RE.test(trimmed)) return false;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(trimmed)) return false;

  const math = extractSimpleMath(trimmed);
  if (math && (looksLikeIntakeQuestion(trimmed) || trimmed.length <= 24)) {
    return true;
  }

  return looksLikeIntakeQuestion(trimmed);
}

/**
 * Builds the assistant reply for an off-topic intake turn, then re-asks.
 */
export function formatIntakeAsideMessage(
  text: string,
  questions: string[],
  canSkip = false,
): string {
  const math = formatMathAside(text);
  const lead = math
    ? `${math}.`
    : "Got it — but that doesn’t fill in the restaurant brief.";
  const list = questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");
  const skipNote = canSkip
    ? "\n\nIf you don’t have these, reply **skip for now** and we’ll build without them."
    : "\n\nI still need these before we can build.";
  const body =
    questions.length > 0
      ? `Those aren’t restaurant details. I still need:\n\n${list}${skipNote}`
      : "Ask me anything after we lock the brief — or send the restaurant details so we can build.";
  return `${lead}\n\n${body}`;
}
