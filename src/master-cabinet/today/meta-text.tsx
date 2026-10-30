export function MetaText({ parts }: { parts: (string | null)[] }) {
  return parts.filter(Boolean).join(" · ");
}
