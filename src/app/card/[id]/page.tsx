import type { Metadata } from "next";
import { CardDetailView } from "@/components/CardDetailView";

export const metadata: Metadata = {
  title: "專屬數位賀卡 | Floriography",
  description: "來自 Floriography 的珍貴壓花數位賀卡，願這份花語捎來溫暖的祝福。",
};

export default async function StandaloneCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetailView cardId={id} />;
}
