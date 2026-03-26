const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "LearnFlow — Panaversity",
  description: "AI-powered Python learning with real-time feedback and adaptive exercises.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased bg-[var(--bg-base)] text-[var(--text-primary)] min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            theme="dark"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}