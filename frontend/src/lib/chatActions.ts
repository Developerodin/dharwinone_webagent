import {
  openPreviewInNewTab,
  saveAndOpenPreview,
  type PreviewPayload,
} from "@/lib/previewStorage";
import type { ChatAction } from "@/types/chat";

/**
 * Handles chat action button clicks from message bubbles.
 */
export function handleChatAction(
  action: ChatAction["action"],
  handlers: {
    confirmBuild: () => Promise<void>;
    resetChat: () => void;
    previewPayload?: PreviewPayload | null;
    sendSkip?: () => void;
  },
): void {
  if (action === "build") {
    void handlers.confirmBuild();
    return;
  }
  if (action === "preview") {
    if (handlers.previewPayload) {
      saveAndOpenPreview(handlers.previewPayload);
    } else {
      openPreviewInNewTab();
    }
    return;
  }
  if (action === "skip") {
    handlers.sendSkip?.();
    return;
  }
  handlers.resetChat();
}
