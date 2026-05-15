import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Serif_TC } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const body = Noto_Serif_TC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s｜Floriography 壓花卡片",
    default: "Floriography 壓花卡片",
  },
  description:
    "把壓花卡片的情緒與故事數位化：作品藝廊、花語故事、情境推薦，協助你更快挑到想送的那一張。",
  metadataBase: new URL("https://example.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${display.variable} ${body.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col grain">
        {children}
      </body>
    </html>
  );
}
