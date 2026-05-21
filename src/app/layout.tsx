import type { Metadata } from "next";
import { EB_Garamond, Raleway, Noto_Sans_TC, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
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
      className={`${ebGaramond.variable} ${raleway.variable} ${notoSansTC.variable} ${cormorant.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col grain">
        {children}
      </body>
    </html>
  );
}
