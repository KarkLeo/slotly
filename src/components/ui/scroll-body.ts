const tabbable =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The scroll body is tabbable only so keyboard users can scroll it; open on the first control instead.
export function scrollBodyInitialFocus(
  body: HTMLElement | null,
  openType: string,
): HTMLElement | null {
  const popup = body?.parentElement ?? null;
  if (openType === "touch") return popup;
  return body?.querySelector<HTMLElement>(tabbable) ?? popup;
}
