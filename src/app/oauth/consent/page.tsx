import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { decideAuthorization } from "@/auth/oauth-actions";
import { redirectHost } from "@/auth/redirect-host";
import { createClient } from "@/db/server";

const buttonClass = "w-full rounded-md px-3 py-2 font-medium";

export default async function ConsentPage({
  searchParams,
}: PageProps<"/oauth/consent">) {
  const { authorization_id: authorizationId, error } = await searchParams;
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
      <h1 className="text-2xl font-semibold">{t("title", { client })}</h1>
      <p className="text-sm">{t("access")}</p>
      <p className="text-sm">{t("returnTo", { host })}</p>
      <p className="text-sm">{t("signedInAs", { email: data.user.email })}</p>
      {error === "decision" && (
        <p role="alert" className="text-sm text-red-600">
          {t("errors.decision")}
        </p>
      )}
      <form action={decideAuthorization} className="flex flex-col gap-2">
        <input
          type="hidden"
          name="authorization_id"
          value={data.authorization_id}
        />
        <button
          type="submit"
          name="decision"
          value="approve"
          className={`${buttonClass} bg-foreground text-background`}
        >
          {t("approve")}
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className={`${buttonClass} border border-current/20`}
        >
          {t("deny")}
        </button>
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
