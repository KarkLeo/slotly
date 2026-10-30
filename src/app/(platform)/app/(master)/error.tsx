"use client";

import { SectionError } from "@/master-cabinet/section-error";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return <SectionError onRetry={retry} />;
}
