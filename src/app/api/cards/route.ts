import { NextResponse } from "next/server";
import { getCards } from "@/lib/catalog";

export async function GET() {
  const cards = await getCards();
  return NextResponse.json({ cards });
}

