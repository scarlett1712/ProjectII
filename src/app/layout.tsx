import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppSessionProvider } from "@/components/providers/SessionProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["vietnamese", "latin"],
});

export const metadata: Metadata = {
  title: "Little Star",
  description: "Little Star - Personal health management with virtual pet",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Little Star",
  },
  icons: {
    icon: "/chatbot-star.png",
    apple: "/chatbot-star.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#A172FD",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AppSessionProvider>
          <PWAInstallPrompt />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
