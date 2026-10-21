"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations("Cabinet");
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full"
      loading={pending}
    >
      {t("signOut")}
    </Button>
  );
}
