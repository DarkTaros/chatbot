import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/hooks/use-locale";
import { getSiteMetadataBase } from "@/lib/site-url";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteMetadataBase(),
  title: "诶嘿Chat | AhChat",
  description: "诶嘿Chat (AhChat) AI chat application.",
};

export const viewport = {
  maximumScale: 1,
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <LocaleProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <SessionProvider
              basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`}
            >
              <TooltipProvider>
                <Toaster
                  position="top-center"
                  theme="system"
                  toastOptions={{
                    className:
                      "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
                  }}
                />
                {children}
              </TooltipProvider>
            </SessionProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
