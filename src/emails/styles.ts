import type { CSSProperties } from "react";

// Email clients ignore stylesheets and CSS variables, so these copy the light theme tokens from globals.css.
const color = {
  background: "#f8f1eb",
  card: "#fffcf9",
  foreground: "#141414",
  muted: "#5f5a57",
  border: "#efe5dc",
  primary: "#8a5652",
  primaryForeground: "#ffffff",
};

const sans = "Manrope, Arial, Helvetica, sans-serif";

export const styles = {
  body: {
    margin: 0,
    padding: "24px 12px",
    backgroundColor: color.background,
    fontFamily: sans,
    color: color.foreground,
  },
  card: {
    maxWidth: "480px",
    backgroundColor: color.card,
    borderRadius: "12px",
    padding: "32px 24px",
  },
  brand: {
    margin: "0 0 16px",
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: "24px",
    fontWeight: 700,
    color: color.primary,
  },
  title: { margin: "0 0 8px", fontSize: "20px", fontWeight: 800 },
  text: { margin: "0 0 24px", fontSize: "15px", lineHeight: "22px" },
  details: {
    margin: "0 0 24px",
    padding: "16px",
    borderRadius: "12px",
    border: `1px solid ${color.border}`,
    backgroundColor: color.background,
  },
  label: {
    margin: 0,
    fontSize: "13px",
    lineHeight: "18px",
    color: color.muted,
  },
  value: {
    margin: "0 0 12px",
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: 600,
  },
  comment: {
    margin: "0 0 24px",
    padding: "0 0 0 12px",
    borderLeft: `3px solid ${color.border}`,
  },
  commentText: {
    margin: 0,
    fontSize: "15px",
    lineHeight: "22px",
    fontStyle: "italic",
  },
  button: {
    display: "inline-block",
    padding: "12px 24px",
    borderRadius: "12px",
    backgroundColor: color.primary,
    color: color.primaryForeground,
    fontSize: "15px",
    fontWeight: 700,
    textDecoration: "none",
  },
  secondaryAction: { margin: "16px 0 0", fontSize: "15px", lineHeight: "22px" },
  link: { color: color.primary, fontWeight: 700, textDecoration: "underline" },
  code: {
    margin: "24px 0",
    fontFamily: "'Courier New', monospace",
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "6px",
  },
  note: {
    margin: "24px 0 0",
    fontSize: "13px",
    lineHeight: "20px",
    color: color.muted,
  },
} satisfies Record<string, CSSProperties>;
