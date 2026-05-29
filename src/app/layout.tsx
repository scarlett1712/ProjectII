import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppSessionProvider } from "@/components/providers/SessionProvider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["vietnamese", "latin"],
});

export const metadata: Metadata = {
  title: "Little Star",
  description: "Little Star - Personal health management with virtual pet",
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
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
