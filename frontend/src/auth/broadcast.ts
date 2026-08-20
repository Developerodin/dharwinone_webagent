/**
 * Cross-tab auth coordination.
 *
 * Sessions are shared between tabs through one httpOnly cookie, so a sign-out
 * in one tab silently invalidates every other. Without this channel the other
 * tabs keep rendering an authenticated UI until their next API call fails.
 */

export type AuthBroadcast =
  | { type: "signed-in" }
  | { type: "signed-out" };

const CHANNEL = "prowplus-auth";

/** Null in browsers without BroadcastChannel; every call then no-ops. */
const channel: BroadcastChannel | null =
  typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);

/**
 * Announces an auth change to other tabs.
 */
export function publishAuthChange(message: AuthBroadcast): void {
  channel?.postMessage(message);
}

/**
 * Subscribes to auth changes from other tabs. Returns an unsubscribe function.
 */
export function subscribeAuthChanges(
  handler: (message: AuthBroadcast) => void,
): () => void {
  if (!channel) return () => {};

  const listener = (event: MessageEvent<AuthBroadcast>) => handler(event.data);
  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
}
