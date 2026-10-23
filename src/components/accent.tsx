import type { ReactNode } from "react";

// Renders the <accent> tag of rich messages: one word of a heading in the italic accent face.
export function accent(chunks: ReactNode) {
  return (
    <span className="font-accent text-[1.15em] font-medium tracking-normal italic">
      {chunks}
    </span>
  );
}
