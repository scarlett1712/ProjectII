import { LayoutDashboard, Camera, UtensilsCrossed, Wallet, Calendar } from "lucide-react";
import { ROUTES } from "@/shared/config/routes";

export const sidebarLinks = [
  { href: ROUTES.dashboard, labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: ROUTES.diary, labelKey: "nav.diary", icon: Camera },
  { href: ROUTES.nutrition, labelKey: "nav.nutrition", icon: UtensilsCrossed },
  { href: ROUTES.calendar, labelKey: "nav.calendar", icon: Calendar },
  { href: ROUTES.budget, labelKey: "nav.budget", icon: Wallet },
] as const;
