import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  bootstrapSession,
  setAccessToken,
  setSessionLostHandler,
} from "@/lib/apiClient";
import * as authApi from "./authApi";
import { publishAuthChange, subscribeAuthChanges } from "./broadcast";
import { clearUserScopedStorage } from "@/lib/clientStorage";
import type { AuthSuccess, AuthUser } from "./types";

export type AuthStatus = "loading" | "authed" | "anon";

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Adopts a session returned by any sign-in endpoint. */
  adoptSession: (payload: AuthSuccess) => void;
  /** Replaces the cached user without touching the token. */
  setUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
  /** Re-reads the user from the server. */
  reload: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Refresh this many seconds before the access token expires.
 *
 * Refreshing ahead of expiry means an active user never pays the
 * 401 → refresh → replay round-trip on a real request.
 */
const REFRESH_LEAD_SEC = 60;

/**
 * Owns session state for the whole app.
 *
 * The access token deliberately lives in the api client's closure rather than
 * in React state: keeping it out of the component tree means it cannot leak
 * into a devtools snapshot, an error boundary payload, or SSR output.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<AuthUser | null>(null);
  const refreshTimer = useRef<number | null>(null);

  /**
   * Clears any pending proactive refresh.
   */
  const clearTimer = useCallback(() => {
    if (refreshTimer.current !== null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  /**
   * Drops all client-side session state.
   */
  const clearSession = useCallback(() => {
    clearTimer();
    setAccessToken(null);
    setUserState(null);
    setStatus("anon");

    // The project cache is one user's data. Leaving it in place would show the
    // next person on this machine the previous user's project list.
    clearUserScopedStorage();
  }, [clearTimer]);

  /**
   * Schedules a silent refresh shortly before the token expires.
   */
  const scheduleRefresh = useCallback(
    (expiresInSec: number) => {
      clearTimer();
      const delayMs = Math.max(expiresInSec - REFRESH_LEAD_SEC, 30) * 1000;

      refreshTimer.current = window.setTimeout(async () => {
        // A hidden tab doesn't need a live token; refreshing it would burn a
        // rotation for nothing. The visibility handler catches up on wake.
        if (document.visibilityState !== "visible") return;

        const session = await bootstrapSession();
        if (session) {
          scheduleRefresh(
            (session as unknown as AuthSuccess).expiresIn ?? expiresInSec,
          );
        } else {
          clearSession();
        }
      }, delayMs);
    },
    [clearTimer, clearSession],
  );

  const adoptSession = useCallback(
    (payload: AuthSuccess) => {
      setAccessToken(payload.accessToken);
      setUserState(payload.user);
      setStatus("authed");
      scheduleRefresh(payload.expiresIn);
      publishAuthChange({ type: "signed-in" });
    },
    [scheduleRefresh],
  );

  const setUser = useCallback((next: AuthUser) => {
    setUserState(next);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Network failure must not trap someone in a signed-in UI. The server
      // session may survive, but the client state is gone either way.
    }
    clearSession();
    publishAuthChange({ type: "signed-out" });
  }, [clearSession]);

  const reload = useCallback(async () => {
    try {
      const { user: fresh } = await authApi.fetchMe();
      setUserState(fresh);
      setStatus("authed");
    } catch {
      clearSession();
    }
  }, [clearSession]);

  // Recover a session from the httpOnly refresh cookie on first paint.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = await bootstrapSession();
      if (cancelled) return;

      if (session) {
        const payload = session as unknown as AuthSuccess;
        setUserState(payload.user);
        setStatus("authed");
        scheduleRefresh(payload.expiresIn);
      } else {
        setStatus("anon");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scheduleRefresh]);

  // When the api client gives up on refreshing, the session is genuinely gone.
  useEffect(() => {
    setSessionLostHandler(() => {
      clearSession();
      publishAuthChange({ type: "signed-out" });
    });
  }, [clearSession]);

  // A laptop that slept past the token's expiry wakes holding a dead token.
  // Refresh on wake so the first click after returning doesn't fail.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if (status !== "authed") return;

      const session = await bootstrapSession();
      if (session) {
        const payload = session as unknown as AuthSuccess;
        setUserState(payload.user);
        scheduleRefresh(payload.expiresIn);
      } else {
        clearSession();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, scheduleRefresh, clearSession]);

  // Mirror sign-in/sign-out across tabs so a stale tab never shows a signed-in
  // shell for a session that no longer exists.
  useEffect(() => {
    return subscribeAuthChanges((message) => {
      if (message.type === "signed-out") {
        clearSession();
      } else if (message.type === "signed-in") {
        void reload();
      }
    });
  }, [clearSession, reload]);

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, adoptSession, setUser, signOut, reload }),
    [status, user, adoptSession, setUser, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
