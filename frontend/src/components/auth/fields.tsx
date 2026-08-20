import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Form primitives for the auth screens.
 *
 * Shared so that spacing, focus rings, and error placement cannot drift
 * between the six screens that use them.
 */

/** Pill input styling, matching the reference design. */
const INPUT_CLASS =
  "w-full rounded-full border border-white/12 bg-white/[0.04] px-5 py-3.5 text-[15px] text-white " +
  "placeholder:text-white/30 outline-none transition " +
  "focus:border-white/35 focus:bg-white/[0.07] focus:ring-2 focus:ring-white/20 " +
  "disabled:opacity-50";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  /** Rendered to the right of the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, FieldProps>(
  function TextField({ label, error, labelAction, id, ...props }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label
            htmlFor={fieldId}
            className="text-[13px] font-medium text-white/85"
          >
            {label}
          </label>
          {labelAction}
        </div>
        <input
          {...props}
          id={fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={INPUT_CLASS}
        />
        {error ? (
          <p id={errorId} className="mt-2 px-1 text-[13px] text-[#f87171]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

/**
 * Password input with a reveal toggle and Caps Lock warning.
 *
 * Both exist because they measurably reduce failed sign-ins on mobile and on
 * external keyboards — a password field that silently rejects a correct
 * password typed in caps is the most common avoidable support ticket.
 */
export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(
  function PasswordField({ label, error, labelAction, id, ...props }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const [revealed, setRevealed] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    return (
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label
            htmlFor={fieldId}
            className="text-[13px] font-medium text-white/85"
          >
            {label}
          </label>
          {labelAction}
        </div>

        <div className="relative">
          <input
            {...props}
            id={fieldId}
            ref={ref}
            type={revealed ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onKeyUp={(event) => {
              setCapsLock(event.getModifierState?.("CapsLock") ?? false);
              props.onKeyUp?.(event);
            }}
            className={`${INPUT_CLASS} pr-12`}
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/75"
          >
            {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {capsLock ? (
          <p className="mt-2 px-1 text-[12px] text-amber-300/80">
            Caps Lock is on.
          </p>
        ) : null}

        {error ? (
          <p id={errorId} className="mt-2 px-1 text-[13px] text-[#f87171]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

/**
 * Primary pill button. Keeps its width while loading so the layout never jumps.
 */
export function PrimaryButton({
  children,
  loading = false,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={loading || props.disabled}
      className="flex h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-b from-white to-[#e6e6ea] text-[15px] font-medium text-black transition hover:from-white hover:to-[#dcdce2] active:scale-[0.985] disabled:opacity-60"
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

/**
 * Inline spinner sized to sit inside a button without changing its height.
 */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Form-level error region.
 *
 * `aria-live` so a screen reader announces a failed submit — a visual-only
 * error message is invisible to anyone who just pressed Enter.
 */
export function FormError({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="min-h-[20px]">
      {message ? (
        <p className="rounded-xl border border-[#f87171]/25 bg-[#f87171]/10 px-4 py-2.5 text-[13px] text-[#fca5a5]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * "or" divider between the Google button and the email form.
 */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-4">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-[12px] uppercase tracking-wider text-white/35">
        or
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
