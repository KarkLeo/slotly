import { SignInForm } from "@/auth/sign-in-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <SignInForm
        next={typeof next === "string" ? next : undefined}
        linkExpired={error === "link"}
      />
    </main>
  );
}
