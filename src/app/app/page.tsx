import { getTranslations } from "next-intl/server";
import { signOut } from "@/auth/actions";
import { requireUser } from "@/auth/session";

export default async function CabinetPage() {
  const user = await requireUser();
  const t = await getTranslations("Cabinet");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <p>{t("signedInAs", { email: user.email ?? "" })}</p>
      <form action={signOut}>
        <button type="submit" className="underline">
          {t("signOut")}
        </button>
      </form>
    </main>
  );
}
