import { requireMaster } from "@/master-cabinet/session";
import { MasterShell } from "@/master-cabinet/shell";
import { getTheme } from "@/theme/server";

export default async function MasterLayout({ children }: LayoutProps<"/app">) {
  const [user, theme] = await Promise.all([requireMaster(), getTheme()]);

  return (
    <MasterShell theme={theme} email={user.email}>
      {children}
    </MasterShell>
  );
}
