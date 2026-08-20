import { useEffect, useRef } from "react";
import { useGoogleIdentity } from "@/auth/useGoogleIdentity";
import { Spinner } from "./fields";

/**
 * Google sign-in button.
 *
 * Google's ToS require their rendered button, so we host it in a fixed-height
 * slot and show a matching skeleton while GIS loads — otherwise the form jumps
 * when the button appears.
 */
export function GoogleButton({
  onCredential,
  disabled = false,
}: {
  onCredential: (credential: string, nonce: string) => void;
  disabled?: boolean;
}) {
  const slot = useRef<HTMLDivElement | null>(null);
  const { ready, unavailable, renderButton } = useGoogleIdentity(onCredential);

  useEffect(() => {
    if (ready && slot.current) renderButton(slot.current);
  }, [ready, renderButton]);

  if (unavailable) return null;

  return (
    <div className="relative h-[44px] w-full">
      {!ready ? (
        <div className="flex h-[44px] w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
          <Spinner size={16} />
        </div>
      ) : null}
      <div
        ref={slot}
        className={`flex justify-center ${ready ? "" : "hidden"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
      />
    </div>
  );
}
