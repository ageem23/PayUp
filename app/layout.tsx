import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayUp",
  description: "Split shared receipts and settle up with your group.",
};

// Runs before paint (in <head>) so the cached theme is applied to <html>
// before the body renders — no bright flash on dark setups (Story 9.1 AC4).
// Falls back to the OS preference when nothing is cached. Keep the storage key
// in sync with THEME_STORAGE_KEY in context/ThemeContext.tsx.
const themeInitScript = `(function(){try{var t=localStorage.getItem('app-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script mutates the <html> class
    // before hydration, which would otherwise trip a className mismatch.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
