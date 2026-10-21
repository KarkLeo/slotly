type ColorProperty = "backgroundColor" | "color" | "borderTopColor";

export function boxHeight(el: Element): number {
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
  // The theme decorator switches the class after mount, so color transitions may still be running.
  el.getAnimations().forEach((animation) => animation.finish());
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
