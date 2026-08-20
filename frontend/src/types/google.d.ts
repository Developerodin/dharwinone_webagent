/**
 * Ambient declarations for Google's browser globals.
 *
 * Maps and Identity Services are separate scripts that share one `window.google`
 * namespace, so the declaration has to live in one place. Keeping it in a .d.ts
 * means a module can reference the global without importing — and pulling in —
 * the loader for the other product.
 */

import type { GoogleMapsNamespace } from "@/lib/loadGoogleMaps";

/** Minimal surface of the Google Identity Services client we use. */
export type GoogleAccountsId = {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  prompt: () => void;
};

declare global {
  interface Window {
    google?: {
      // Type-only import: this costs nothing at runtime, so referencing the
      // Maps namespace here does not pull the Maps loader into the auth bundle.
      maps?: GoogleMapsNamespace;
      accounts?: { id?: GoogleAccountsId };
    };
    gm_authFailure?: () => void;
  }
}
