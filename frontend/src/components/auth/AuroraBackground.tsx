import type { ReactNode } from "react";

/**
 * The dark aurora shell used by every auth and onboarding screen.
 *
 * The glow is layered CSS gradients rather than an image: it scales to any
 * viewport, costs no network request, and cannot pop in after first paint.
 * A faint noise overlay breaks up the banding that wide, low-contrast
 * gradients produce on 8-bit displays.
 */
export function AuroraBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 118%, #e0568f 0%, #b34bc4 20%, #7b4bd8 38%, #2f4fd8 56%, rgba(12,12,20,0) 78%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
        {children}
      </div>
    </div>
  );
}
