"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/db/server";
import type { ActionToast } from "@/toasts/toast";

export type ConsentState = { toast?: ActionToast };

export async function decideAuthorization(
  _state: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const authorizationId = String(formData.get("authorization_id") ?? "");
  const approve = formData.get("decision") === "approve";

  const supabase = await createClient();
  const options = { skipBrowserRedirect: true };
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, options)
    : await supabase.auth.oauth.denyAuthorization(authorizationId, options);

  if (error || !data)
    return { toast: { type: "error", key: "decisionFailed" } };

  redirect(data.redirect_url);
}
