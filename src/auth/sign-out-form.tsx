"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { unexpectedToast } from "@/toasts/with-unexpected-toast";
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
          toast.error(t(unexpectedToast(error).key));
        }
      }}
    >
      <SignOutButton />
    </form>
  );
}
