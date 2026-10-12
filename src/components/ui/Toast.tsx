"use client";

import { useSyncExternalStore } from "react";
import { TOAST_SERVER, getToast, subscribeToast } from "@/lib/toast";

/**
 * Small global toast outlet ("Link copied", "Full motion is on."). The element is a polite status
 * region, so every toast is also announced to screen readers. The store lives in lib/toast.ts.
 */

export { toast } from "@/lib/toast";

export function Toaster({ scope = "page" }: { scope?: string }) {
  const state = useSyncExternalStore(subscribeToast, getToast, () => TOAST_SERVER);
  const mine = state.scope === scope;
  return (
    <div className="toast" role="status" aria-live="polite" data-show={mine && state.show ? "true" : "false"}>
      {/* keyed: a repeated message still replaces the node, so it is announced again */}
      {mine ? <span key={state.id}>{state.message}</span> : null}
    </div>
  );
}
