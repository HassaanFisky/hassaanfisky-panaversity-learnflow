import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { EcosystemNav } from "@/components/EcosystemNav";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: 'swap',
});

const lora = Lora({ 
  subsets: ["latin"], 
  variable: "--font-lora",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "HASSAAN AI ARCHITECT",
  description: "AI-powered Python learning with real-time feedback and adaptive exercises.",
};

import { ActionDock } from "@/components/ActionDock";
import { WeatherOverlay } from "@/components/WeatherOverlay";
import { LanguageProvider } from "@/context/LanguageContext";
import { CompanionProvider } from "@/components/companion/CompanionContext";
import { CompanionShell } from "@/components/companion/CompanionShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${lora.variable}`}>
        <body className="font-inter antialiased bg-bg-base text-text-primary min-h-screen">
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <CompanionProvider>
              {children}
              <ActionDock />
              <WeatherOverlay />
              <EcosystemNav />
              <CompanionShell
                platform="H3"
                context="LearnFlow AI learning platform. Python exercises, code review, and adaptive tutoring are active."
              />
            </CompanionProvider>
            <Toaster
              position="bottom-right"
              richColors
              closeButton
            />
          </ThemeProvider>
        </body>
      </html>
    </LanguageProvider>
  );
}