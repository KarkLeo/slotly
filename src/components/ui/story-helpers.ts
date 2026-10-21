type ColorProperty = "backgroundColor" | "color" | "borderTopColor";

// Opening animations scale and fade popups, and the theme decorator switches the class after mount.
function settle() {
  document
    .getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .forEach((animation) => animation.finish());
}

export function boxHeight(el: Element): number {
  settle();
  return el.getBoundingClientRect().height;
}

export function overflowsX(el: Element): boolean {
  return (
    el.scrollWidth > el.clientWidth ||
    el.getBoundingClientRect().right > window.innerWidth
  );
}

export function computedColor(
  el: Element,
  property: ColorProperty = "backgroundColor",
): string {
  settle();
  return getComputedStyle(el)[property];
}

// Resolves a token utility to the color the current theme renders for it.
export function resolvedColor(
  className: string,
  property: ColorProperty = "backgroundColor",
): string {
  const probe = document.createElement("div");
  probe.className = className;
  document.body.append(probe);
  const color = computedColor(probe, property);
  probe.remove();
  return color;
}
