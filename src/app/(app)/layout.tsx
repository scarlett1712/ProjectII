import { redirect } from "next/navigation";
import { getAuthSession } from "@/shared/infrastructure/auth";
import { AppShell } from "@/shared/ui/layout/AppShell";
import { getHealthProfile } from "@/features/profile/application/profileUseCases";
import { ROUTES } from "@/shared/config/routes";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect(ROUTES.login);

  // Check if profile exists for user
  const profile = await getHealthProfile(session.user.id);

  if (!profile) {
    redirect(ROUTES.setup.profile);
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
