"use client";

import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "./actions";
import { SignOutButton } from "./sign-out-button";

export function SignOutForm() {
  const t = useTranslations("Toasts");

  return (
    <form
      action={async () => {
        try {
          await signOut();
        } catch (error) {
          unstable_rethrow(error);
          toast.error(t("unexpected"));
        }
      }}
    >
      <SignOutButton />
    </form>
  );
}
