import type { Metadata } from "next";
import { CardDetailView } from "@/components/CardDetailView";

export const metadata: Metadata = {
  title: "壓花賀卡 | Floriography",
  description: "來自 Floriography 的壓花數位賀卡，願這份花語帶給你滿滿的祝福。",
};

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetailView cardId={id} />;
}
