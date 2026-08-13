import type { ReactNode } from "react";
import {
  DashboardSidebar,
  type DashboardSidebarProps,
} from "@/components/shell/DashboardSidebar";
import { MobileSidebarDrawer } from "@/components/shell/MobileSidebarDrawer";

type DashboardLayoutProps = DashboardSidebarProps & {
  children: ReactNode;
  mobileNavOpen: boolean;
  onCloseMobile: () => void;
};

/**
 * Shared home/gallery chrome: desktop sidebar, main content, mobile drawer.
 */
export function DashboardLayout({
  children,
  mobileNavOpen,
  onCloseMobile,
  ...sidebarProps
}: DashboardLayoutProps) {
  return (
    <div className="builder-shell flex h-svh min-w-0 overflow-hidden font-sans">
      <div className="hidden h-full shrink-0 md:flex">
        <DashboardSidebar {...sidebarProps} />
      </div>
      {children}
      <MobileSidebarDrawer
        open={mobileNavOpen}
        onClose={onCloseMobile}
        {...sidebarProps}
      />
    </div>
  );
}
