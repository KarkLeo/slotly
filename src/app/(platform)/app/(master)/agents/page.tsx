import { requireMaster } from "@/master-cabinet/session";
import { SectionStub } from "@/master-cabinet/section-stub";
import { getTheme } from "@/theme/server";

export default async function Page() {
  const [user, theme] = await Promise.all([requireMaster(), getTheme()]);

  return <SectionStub section="agents" theme={theme} email={user.email} />;
}
