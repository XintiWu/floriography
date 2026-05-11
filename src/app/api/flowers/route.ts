import { NextResponse } from "next/server";
import { getFlowers } from "@/lib/catalog";

export async function GET() {
  const flowers = await getFlowers();
  return NextResponse.json({ flowers });
}

