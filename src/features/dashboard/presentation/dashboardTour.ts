import type { useTranslations } from "next-intl";
import type { TourStep } from "@/shared/ui/OnboardingTour";

/** Dashboard tour steps. The translator uses the dashboard namespace. */
export const getDashboardSteps = (t: ReturnType<typeof useTranslations<"dashboard">>): TourStep[] => [
  {
    selector: "#tour-quick-actions",
    title: t("tour.quickActions.title"),
    content: t("tour.quickActions.content"),
  },
  {
    selector: "#tour-deadlines",
    title: t("tour.deadlines.title"),
    content: t("tour.deadlines.content"),
  },
  {
    selector: "#tour-deadlines",
    title: t("tour.pinNotes.title"),
    content: t("tour.pinNotes.content"),
  },
  {
    selector: "#tour-energy-water",
    title: t("tour.energyWater.title"),
    content: t("tour.energyWater.content"),
  },
  {
    selector: "#tour-wallet-chart",
    title: t("tour.walletChart.title"),
    content: t("tour.walletChart.content"),
  },
  {
    selector: "#tour-user-profile",
    title: t("tour.userProfile.title"),
    content: t("tour.userProfile.content"),
  },
  {
    selector: "#tour-chatbot-star",
    title: t("tour.chatbot.title"),
    content: t("tour.chatbot.content"),
  }
];
