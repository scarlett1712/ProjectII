import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppSessionProvider } from "@/shared/ui/providers/SessionProvider";
import { ServiceWorkerInit } from "@/shared/ui/providers/ServiceWorkerInit";
import { PWAInstallPrompt } from "@/shared/ui/PWAInstallPrompt";
import { UiProvider } from "@/shared/ui/components";
import { colors } from "@/shared/theme/tokens";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ASSETS } from "@/shared/config/routes";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["vietnamese", "latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("description"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("name"),
    },
    icons: {
      icon: ASSETS.mascotIcon,
      apple: ASSETS.mascotIcon,
    },
  };
}

export const viewport: Viewport = {
  themeColor: colors.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  // The server uses the api namespace for API errors and push notifications. Omit it from the browser payload.
  const { api: _serverOnly, ...clientMessages } = await getMessages();
  return (
    <html
      lang={locale}
      className={`${nunito.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider messages={clientMessages}>
          <AppSessionProvider>
            <UiProvider>
              <ServiceWorkerInit />
              <PWAInstallPrompt />
              {children}
            </UiProvider>
          </AppSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
