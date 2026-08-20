import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Google Identity Services loader and sign-in trigger.
 *
 * Uses the popup ID-token flow rather than a redirect so the SPA is never
 * unloaded — anything the user typed, and the route they were on, survive.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const NONCE_KEY = "prowplus-google-nonce";

type GoogleCredentialResponse = { credential?: string };

let loader: Promise<boolean> | null = null;

/**
 * Loads the GIS script once, resolving false if it cannot be fetched.
 *
 * A blocked script (offline, privacy extension, corporate proxy) must degrade
 * to "Google unavailable, use email" rather than a broken screen.
 */
function loadGis(): Promise<boolean> {
  if (window.google?.accounts?.id) return Promise.resolve(true);

  loader ??= new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return loader;
}

/**
 * Generates and stores a nonce for this sign-in attempt.
 *
 * The backend requires the ID token's nonce to match, which is what stops a
 * token captured elsewhere from being replayed against our API.
 */
function createNonce(): string {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(NONCE_KEY, nonce);
  return nonce;
}

/**
 * Reads back the nonce issued for the current attempt.
 */
export function readNonce(): string {
  return sessionStorage.getItem(NONCE_KEY) ?? "";
}

export type UseGoogleIdentity = {
  /** True once GIS is loaded and a client id is configured. */
  ready: boolean;
  /** True when Google sign-in cannot be offered at all. */
  unavailable: boolean;
  /** Renders Google's own button into the given element. */
  renderButton: (element: HTMLElement) => void;
};

/**
 * Wires up Google sign-in for a screen.
 *
 * `onCredential` receives the ID token and the nonce to post to the backend.
 */
export function useGoogleIdentity(
  onCredential: (credential: string, nonce: string) => void,
): UseGoogleIdentity {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(!clientId);
  const callbackRef = useRef(onCredential);

  // Keep the latest callback without re-initialising GIS, which would tear
  // down and re-render the button on every parent render.
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId) {
      setUnavailable(true);
      return;
    }

    let cancelled = false;

    void loadGis().then((loaded) => {
      if (cancelled) return;

      if (!loaded || !window.google?.accounts?.id) {
        setUnavailable(true);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        nonce: createNonce(),
        ux_mode: "popup",
        // Never sign a returning visitor in silently: an automatic session on
        // a shared machine is a surprise, not a convenience.
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response: GoogleCredentialResponse) => {
          if (response.credential) {
            callbackRef.current(response.credential, readNonce());
          }
        },
      });

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const renderButton = useCallback(
    (element: HTMLElement) => {
      if (!ready || !window.google?.accounts?.id) return;
      element.innerHTML = "";
      window.google.accounts.id.renderButton(element, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "center",
        width: 420,
      });
    },
    [ready],
  );

  return { ready, unavailable, renderButton };
}
