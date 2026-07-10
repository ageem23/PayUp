import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AccentColorProvider } from "@/context/AccentColorContext";
import { Footer } from "@/components/ui/Footer";
import { HelpWidget } from "@/components/feature/HelpWidget";
import { ErrorListener } from "@/components/feature/ErrorListener";
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
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <ThemeProvider>
          <AccentColorProvider>
            {/* Page content fills the space so the footer (Story 20.1) sits at
                the bottom of the viewport on short pages and below the content
                on long ones. */}
            <ErrorListener />
            <AuthProvider>{children}</AuthProvider>
            <HelpWidget />
            <Footer />
          </AccentColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
