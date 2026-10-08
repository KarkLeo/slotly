"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/db/server";

export async function decideAuthorization(formData: FormData) {
  const authorizationId = String(formData.get("authorization_id") ?? "");
  const approve = formData.get("decision") === "approve";

  const supabase = await createClient();
  const options = { skipBrowserRedirect: true };
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, options)
    : await supabase.auth.oauth.denyAuthorization(authorizationId, options);

  if (error || !data) {
    const params = new URLSearchParams({
      authorization_id: authorizationId,
      error: "decision",
    });
    redirect(`/oauth/consent?${params}`);
  }

  redirect(data.redirect_url);
}
