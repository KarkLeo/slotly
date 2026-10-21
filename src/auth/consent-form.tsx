"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/toasts/use-action-toast";
import { withUnexpectedToast } from "@/toasts/with-unexpected-toast";
import { type ConsentState, decideAuthorization } from "./oauth-actions";

const initialState: ConsentState = {};

const decide = withUnexpectedToast(decideAuthorization);

export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const t = useTranslations("OAuthConsent");
  const [state, action, pending] = useActionState(decide, initialState);
  const [choice, setChoice] = useState<"approve" | "deny">();
  useActionToast(state.toast);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="authorization_id" value={authorizationId} />
      <Button
        type="submit"
        name="decision"
        value="approve"
        className="w-full"
        disabled={pending}
        loading={pending && choice === "approve"}
        onClick={() => setChoice("approve")}
      >
        {t("approve")}
      </Button>
      <Button
        type="submit"
        name="decision"
        value="deny"
        variant="outline"
        className="w-full"
        disabled={pending}
        loading={pending && choice === "deny"}
        onClick={() => setChoice("deny")}
      >
        {t("deny")}
      </Button>
    </form>
  );
}
