import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentRole } from "@/lib/auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopbar } from "@/components/student/student-topbar";
import { MobileBottomNav } from "@/components/student/mobile-bottom-nav";
import { RoleSwitcher } from "@/components/role-switcher";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Classroom OS",
  description: "Manage attendance, subjects, and sessions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const CURRENT_ROLE = await getCurrentRole();
  const isStudent = CURRENT_ROLE === "STUDENT";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} font-sans antialiased h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {isStudent ? (
          <div className="flex h-screen overflow-hidden">
            <StudentSidebar />
            <div className="flex-1 flex flex-col relative w-full overflow-y-auto pb-16 md:pb-0">
              <StudentTopbar />
              <main className="flex-1 p-4 md:p-6 w-full max-w-7xl mx-auto">
                {children}
              </main>
              <MobileBottomNav />
            </div>
          </div>
        ) : (
          <SidebarProvider>
            <AppSidebar />
            <main className="flex flex-1 flex-col p-4 w-full">
              <SidebarTrigger />
              {children}
            </main>
          </SidebarProvider>
        )}
        <RoleSwitcher currentRole={CURRENT_ROLE} />
      </body>
    </html>
  );
}
