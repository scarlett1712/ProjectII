import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
