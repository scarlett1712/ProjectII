import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { db } from "@/lib/db";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  // Check if profile exists for user
  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/setup/profile");
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
