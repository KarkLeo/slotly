import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { decideAuthorization } from "@/auth/oauth-actions";
import { redirectHost } from "@/auth/redirect-host";
import { Button } from "@/components/ui/button";
import { createClient } from "@/db/server";

export default async function ConsentPage({
  searchParams,
}: PageProps<"/oauth/consent">) {
  const { authorization_id: authorizationId } = await searchParams;
  const t = await getTranslations("OAuthConsent");

  if (typeof authorizationId !== "string" || !authorizationId) {
    return <ConsentMessage text={t("errors.missing")} />;
  }

  const supabase = await createClient();
  const { data } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (!data) return <ConsentMessage text={t("errors.expired")} />;
  if (!("authorization_id" in data)) redirect(data.redirect_url);

  const host = redirectHost(data.redirect_uri);
  const client = data.client.name || host;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {t("title", { client })}
      </h1>
      <p>{t("access")}</p>
      <p className="text-muted-foreground">{t("returnTo", { host })}</p>
      <p className="text-muted-foreground">
        {t("signedInAs", { email: data.user.email })}
      </p>
      <form action={decideAuthorization} className="flex flex-col gap-3">
        <input
          type="hidden"
          name="authorization_id"
          value={data.authorization_id}
        />
        <Button
          type="submit"
          name="decision"
          value="approve"
          className="w-full"
        >
          {t("approve")}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="deny"
          variant="outline"
          className="w-full"
        >
          {t("deny")}
        </Button>
      </form>
    </main>
  );
}

function ConsentMessage({ text }: { text: string }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <p role="alert">{text}</p>
    </main>
  );
}
