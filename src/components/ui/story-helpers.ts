type ColorProperty = "backgroundColor" | "color" | "borderTopColor";

// Opening animations scale and fade popups, and the theme decorator switches the class after mount.
export function settle() {
  document
    .getAnimations()
    .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
    .forEach((animation) => animation.finish());
}

// Lets ResizeObserver callbacks run before asserting that something did not change.
export async function nextFrames(count = 3) {
  for (let i = 0; i < count; i++)
    await new Promise((resolve) => requestAnimationFrame(resolve));
}

export function boxHeight(el: Element): number {
  settle();
  return el.getBoundingClientRect().height;
}

export function overflowsX(el: Element): boolean {
  settle();
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
  document.body.append(probe);
  const fallback = computedColor(probe, property);
  probe.className = className;
  const color = computedColor(probe, property);
  probe.remove();
  // A missing token makes Tailwind skip the class; both sides would then share the fallback.
  if (color === fallback)
    throw new Error(`${className} does not set ${property} (missing token?)`);
  return color;
}

export function intersects(a: Element, b: Element): boolean {
  settle();
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return (
    r1.left < r2.right &&
    r2.left < r1.right &&
    r1.top < r2.bottom &&
    r2.top < r1.bottom
  );
}
