import { LayoutDashboard, UtensilsCrossed, Wallet, MessageSquare, Calendar } from "lucide-react";
import { ROUTES } from "@/shared/config/routes";

export const sidebarLinks = [
  { href: ROUTES.dashboard, labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: ROUTES.nutrition, labelKey: "nav.nutrition", icon: UtensilsCrossed },
  { href: ROUTES.calendar, labelKey: "nav.calendar", icon: Calendar },
  { href: ROUTES.budget, labelKey: "nav.budget", icon: Wallet },
  { href: ROUTES.chat, labelKey: "nav.chat", icon: MessageSquare },
] as const;
