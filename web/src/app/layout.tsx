import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getSessionSoft } from "@/lib/dal";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RushData",
  description: "Si Power BI te dice qué pasó, RushData te dice qué hacer.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionSoft();

  return (
    <html
      lang="es-MX"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        {session ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar
                chainLabel="HEB"
                userEmail={session.email}
                orgName={session.orgName}
                role={session.role}
              />
              <main className="flex-1 max-w-[1440px] w-full mx-auto px-8 py-8">
                {children}
              </main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
