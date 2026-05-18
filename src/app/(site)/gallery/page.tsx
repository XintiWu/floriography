import type { Metadata } from "next";
import { GalleryWall } from "@/components/GalleryWall";

export const metadata: Metadata = {
  title: "花卡推特 | Floriography",
  description: "探索大家分享的花語花卡，每一張都是一句無聲的祝福。為你的創作取名、寫下心情，分享給每個人。",
};

export default function GalleryPage() {
  return <GalleryWall />;
}
