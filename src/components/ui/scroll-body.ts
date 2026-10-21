import { useEffect, useState } from "react";

const tabbable =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The body is made tabbable only so keyboard users can scroll it; open on the first control instead.
export function scrollBodyInitialFocus(
  body: HTMLElement | null,
  openType: string,
): HTMLElement | null {
  const popup = body?.parentElement ?? null;
  if (openType === "touch") return popup;
  return body?.querySelector<HTMLElement>(tabbable) ?? popup;
}

// Tabbable only when the content overflows and nothing inside can take focus, so it is never a needless Tab stop.
export function useScrollBodyTabIndex(body: HTMLElement | null) {
  const [focusable, setFocusable] = useState(false);

  useEffect(() => {
    if (!body) return;
    const update = () =>
      setFocusable(
        body.scrollHeight > body.clientHeight && !body.querySelector(tabbable),
      );
    const resize = new ResizeObserver(update);
    resize.observe(body);
    for (const child of body.children) resize.observe(child);
    const mutation = new MutationObserver(update);
    mutation.observe(body, { childList: true, subtree: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [body]);

  return focusable ? 0 : undefined;
}
