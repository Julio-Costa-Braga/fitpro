import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitPro - Sistema de Personal Trainer",
  description: "Gerencie alunos, treinos, dietas e progresso",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitPro",
  },
};

export const viewport: Viewport = {
  themeColor: "#8A2BE2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#8A2BE2" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full bg-bg text-white">
        <LanguageProvider>
          <AuthProvider>
            <PermissionsProvider>{children}</PermissionsProvider>
          </AuthProvider>
        </LanguageProvider>
        <script src="/sw-register.js" defer />
      </body>
    </html>
  );
}
