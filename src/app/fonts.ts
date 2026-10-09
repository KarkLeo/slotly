import { Cormorant_Garamond, Manrope } from "next/font/google";

export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: "500",
  style: "italic",
});

export const fontVariables = `${manrope.variable} ${cormorant.variable}`;
