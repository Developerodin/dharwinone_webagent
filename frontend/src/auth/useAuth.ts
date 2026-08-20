import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./AuthProvider";

/**
 * Reads auth state. Throws outside AuthProvider so the mistake surfaces at the
 * first render rather than as a confusing null further down.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
