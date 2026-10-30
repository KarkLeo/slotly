import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function subscribeVisible(callback: () => void) {
  const onChange = () => {
    if (document.visibilityState === "visible") callback();
  };
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function useRefreshOnVisible() {
  const router = useRouter();
  useEffect(() => subscribeVisible(() => router.refresh()), [router]);
}
