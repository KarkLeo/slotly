import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Offline, a refresh falls back to a full page load and shows the browser's offline page.
export function subscribeVisible(callback: () => void) {
  const onChange = () => {
    if (document.visibilityState === "visible" && navigator.onLine) callback();
  };
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("online", onChange);
  return () => {
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("online", onChange);
  };
}

export function useRefreshOnVisible() {
  const router = useRouter();
  useEffect(() => subscribeVisible(() => router.refresh()), [router]);
}
