import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionSoft } from "@/lib/dal";
import { loadAnchorDate } from "@/lib/period";
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
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
  // Sólo cargar el anchor si hay sesión (loadAnchorDate requiere org)
  const dataAnchor = session ? await loadAnchorDate() : null;

  return (
    <html
      lang="es-MX"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider delayDuration={200}>
          {session ? (
            <SidebarProvider defaultOpen={sidebarOpen}>
              <AppSidebar
                orgName={session.orgName}
                userEmail={session.email}
                role={session.role}
              />
              <SidebarInset>
                <AppTopbar dataAnchor={dataAnchor} />
                <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          ) : (
            children
          )}
        </TooltipProvider>
      </body>
    </html>
  );
}
