"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Null while rendering on the server, which does not know the client's zone.
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}
