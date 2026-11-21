import type { MetadataRoute } from "next";
import { colors } from "@/shared/theme/tokens";
import { getTranslations } from "next-intl/server";
import { ASSETS, ROUTES } from "@/shared/config/routes";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("app.manifest");
  return {
    name: t("name"),
    short_name: t("shortName"),
    description: t("description"),
    start_url: ROUTES.dashboard,
    display: "standalone",
    background_color: colors.primarySoft,
    theme_color: colors.primary,
    orientation: "portrait",
    icons: [
      {
        src: ASSETS.mascotIcon,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: ASSETS.mascotIcon,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
