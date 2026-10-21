import { getTranslations } from "next-intl/server";
import { signOut } from "@/auth/actions";
import { requireUser } from "@/auth/session";
import { SignOutButton } from "@/auth/sign-out-button";

export default async function CabinetPage() {
  const user = await requireUser();
  const t = await getTranslations("Cabinet");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">
        {t("signedInAs", { email: user.email ?? "" })}
      </p>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </main>
  );
}
