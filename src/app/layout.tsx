import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Fira_Sans, Fira_Code } from "next/font/google";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Classroom OS",
  description: "Manage attendance, subjects, and sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${firaSans.variable} ${firaCode.variable} font-sans antialiased h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
          {children}
      </body>
    </html>
  );
}
