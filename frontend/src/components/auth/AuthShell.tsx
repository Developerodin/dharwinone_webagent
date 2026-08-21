import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { AuroraBackground } from "./AuroraBackground";

/**
 * Centred column shared by the auth screens: logo, heading, then content.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AuroraBackground>
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex justify-center">
          <AuthLogo />
        </div>

        <h1 className="text-center text-[32px] font-semibold leading-tight tracking-[-0.02em] text-white">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-2.5 text-center text-[14px] leading-relaxed text-white/55">
            {subtitle}
          </p>
        ) : null}

        <div className="mt-7">{children}</div>

        {footer ? (
          <div className="mt-7 text-center text-[13px] text-white/50">
            {footer}
          </div>
        ) : null}
      </div>
    </AuroraBackground>
  );
}

/**
 * Same Dharwin mark as the builder sidebar, sized for auth chrome.
 */
export function AuthLogo({ size = 46 }: { size?: number }) {
  return (
    <BrandMark
      labelled
      className="size-auto max-w-none"
      style={{ width: size, height: size }}
    />
  );
}
