import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";

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
  title: "AI-Suplex 777 — Workflow Console",
  description:
    "A local-first window over the AI-Suplex Workflow. The pipeline is the navigation; the commands are the verbs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="mx-auto w-full max-w-[1080px] px-5 pb-24 sm:px-8">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
