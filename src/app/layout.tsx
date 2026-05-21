import type { Metadata } from "next";
import { EB_Garamond, Raleway, Noto_Serif_TC, Cormorant_Garamond } from "next/font/google";
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

const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"], // Note: Noto Serif TC subset is typically handled automatically, keeping 'latin' to match Next.js defaults if needed, though 'latin' might be ignored for CJK.
  weight: ["300", "400", "500", "600", "700"],
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
      className={`${ebGaramond.variable} ${raleway.variable} ${notoSerifTC.variable} ${cormorant.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col grain">
        {children}
      </body>
    </html>
  );
}
