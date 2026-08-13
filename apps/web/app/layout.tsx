import type { Metadata, Viewport } from "next";
import { Inter, Geist, Space_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { AuthGate } from "@/components/auth/auth-gate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Meu Assessor",
  description: "Seu assistente pessoal — compromissos, tarefas, vídeos e notas em um só lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Assessor",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/apple-touch-icon.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
    <html lang="pt-BR" className={`dark ${inter.variable} ${geist.variable} ${spaceMono.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <AuthGate>
          <div className="flex min-h-screen">
            {/* Sidebar — desktop only */}
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 md:ml-[260px] pb-[96px] md:pb-0">
              <Header />
              <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">
                {children}
              </div>
            </main>

            {/* Bottom nav — mobile only */}
            <BottomNav />
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
