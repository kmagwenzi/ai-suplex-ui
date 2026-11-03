import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ShellNav } from "@/components/shell-nav";
import { getTier } from "@/lib/shell/surfaces";

const themeInit = `(function () {
  try {
    var s = localStorage.getItem("suplex-theme");
    var dark = s ? s === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {
    document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
})();`;

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI-Suplex Ultra",
  description:
    "A local thin host over the six deterministic AI-Suplex surfaces — embed the projections, never re-render them.",
  icons: { icon: "/brand/logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tier = getTier();
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ShellNav tier={tier}>{children}</ShellNav>
      </body>
    </html>
  );
}
