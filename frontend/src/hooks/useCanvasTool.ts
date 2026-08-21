import { useCallback, useEffect, useState } from "react";
import type { PickOverlayRect } from "@/components/preview/ElementPickOverlay";
import type { PreviewPick } from "@/lib/resolvePreviewPick";
import type { SectionType } from "@/types/page";

export type CanvasTool = "off" | "select" | "text";

export type InlineTextSession = {
  pick: PreviewPick;
  rect: PickOverlayRect;
  value: string;
};

type UseCanvasToolArgs = {
  selectedPick: PreviewPick | null;
  setSelectedPick: (pick: PreviewPick | null) => void;
  setSelectedSectionType: (type: SectionType | null) => void;
};

/**
 * Select vs T-text canvas tools, inline session, and Esc unwind.
 */
export function useCanvasTool({
  selectedPick,
  setSelectedPick,
  setSelectedSectionType,
}: UseCanvasToolArgs) {
  const [tool, setTool] = useState<CanvasTool>("off");
  const [textSession, setTextSession] = useState<InlineTextSession | null>(
    null,
  );
  const [textHint, setTextHint] = useState<string | null>(null);

  /**
   * Turns a canvas tool on, or off if it is already active.
   */
  const setCanvasTool = useCallback(
    (next: CanvasTool) => {
      setTool((current) => (current === next ? "off" : next));
      setTextSession(null);
      setTextHint(null);
      if (next === "off") {
        setSelectedPick(null);
        setSelectedSectionType(null);
      }
    },
    [setSelectedPick, setSelectedSectionType],
  );

  /**
   * Toggles pick-for-chat (Edit) mode.
   */
  const toggleSelect = useCallback(() => {
    setTool((current) => (current === "select" ? "off" : "select"));
    setTextSession(null);
    setTextHint(null);
    setSelectedPick(null);
    setSelectedSectionType(null);
  }, [setSelectedPick, setSelectedSectionType]);

  /**
   * Toggles inline text (T) mode.
   */
  const toggleText = useCallback(() => {
    setTool((current) => (current === "text" ? "off" : "text"));
    setTextSession(null);
    setTextHint(null);
    setSelectedPick(null);
    setSelectedSectionType(null);
  }, [setSelectedPick, setSelectedSectionType]);

  /**
   * Forces tools off (home / new project).
   */
  const resetCanvasTool = useCallback(() => {
    setTool("off");
    setTextSession(null);
    setTextHint(null);
    setSelectedPick(null);
    setSelectedSectionType(null);
  }, [setSelectedPick, setSelectedSectionType]);

  /**
   * Opens the overlay editor, or shows a hint when the click isn't copy.
   */
  const startTextEdit = useCallback((session: InlineTextSession | null) => {
    if (!session) {
      setTextSession(null);
      setTextHint("Can't edit that — click a heading, button label, or paragraph");
      return;
    }
    setTextHint(null);
    setTextSession(session);
  }, []);

  /**
   * Closes the overlay without saving.
   */
  const cancelTextEdit = useCallback(() => {
    setTextSession(null);
  }, []);

  useEffect(() => {
    if (!textHint) return undefined;
    const timer = window.setTimeout(() => setTextHint(null), 2200);
    return () => window.clearTimeout(timer);
  }, [textHint]);

  useEffect(() => {
    /**
     * Esc: cancel overlay → clear pick → exit tool.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (textSession) {
        event.preventDefault();
        setTextSession(null);
        return;
      }
      if (selectedPick) {
        setSelectedPick(null);
        setSelectedSectionType(null);
        return;
      }
      if (tool !== "off") {
        setTool("off");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    textSession,
    tool,
    selectedPick,
    setSelectedPick,
    setSelectedSectionType,
  ]);

  return {
    tool,
    textSession,
    textHint,
    setCanvasTool,
    toggleSelect,
    toggleText,
    resetCanvasTool,
    startTextEdit,
    cancelTextEdit,
    setTextSession,
  };
}
