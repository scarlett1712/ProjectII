import { redirect } from "next/navigation";
import { getAuthSession } from "@/shared/infrastructure/auth";
import { ROUTES } from "@/shared/config/routes";

export default async function Home() {
  const session = await getAuthSession();
  if (session?.user?.id) redirect(ROUTES.dashboard);
  redirect(ROUTES.login);
}
