import { useEffect, useRef, useState } from "react";

const LENGTH = 6;

/**
 * Six-box one-time-code input.
 *
 * Behaviours that matter for completion rate, all of them commonly missed:
 *  - `autoComplete="one-time-code"` so iOS offers the code from Mail/SMS
 *  - numeric keypad on mobile via inputMode + pattern
 *  - pasting the whole code into any box distributes it across all six
 *  - Backspace on an empty box steps back rather than doing nothing
 *  - auto-submits on the sixth digit, so nobody hunts for a button
 *  - a wrong code shakes, clears, and refocuses instead of leaving stale digits
 */
export function OtpInput({
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = true,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submitted = useRef(false);

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  // On a rejected code, clear the boxes and return focus to the first one.
  // Leaving the wrong digits in place invites the user to "fix" one character
  // when the whole code is usually stale.
  useEffect(() => {
    if (!invalid) return;
    setDigits(Array(LENGTH).fill(""));
    submitted.current = false;
    inputs.current[0]?.focus();
  }, [invalid]);

  /**
   * Writes the digit array and fires onComplete once it is full.
   */
  const commit = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    if (code.length === LENGTH && !next.includes("") && !submitted.current) {
      submitted.current = true;
      onComplete(code);
    }
  };

  /**
   * Handles typing, including a pasted multi-digit value.
   */
  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) return;

    const next = [...digits];

    if (cleaned.length > 1) {
      // Paste: spread across the remaining boxes from here.
      for (let i = 0; i < cleaned.length && index + i < LENGTH; i++) {
        next[index + i] = cleaned[i]!;
      }
      commit(next);
      const landing = Math.min(index + cleaned.length, LENGTH - 1);
      inputs.current[landing]?.focus();
      return;
    }

    next[index] = cleaned;
    commit(next);
    if (index < LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  /**
   * Backspace, arrow-key, and Enter handling.
   */
  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];

      if (next[index]) {
        next[index] = "";
        setDigits(next);
        return;
      }
      if (index > 0) {
        next[index - 1] = "";
        setDigits(next);
        inputs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label="Verification code"
      className={`flex justify-center gap-2.5 ${invalid ? "animate-[otp-shake_0.3s_ease-in-out]" : ""}`}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className={`h-[58px] w-[46px] rounded-xl border text-center text-[22px] font-semibold text-white outline-none transition
            ${
              invalid
                ? "border-[#f87171]/70 bg-[#f87171]/10"
                : "border-white/12 bg-white/[0.04] focus:border-white/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-white/20"
            }
            disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
