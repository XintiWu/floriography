import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/dbConfig";
import { query } from "@/lib/db";
import {
  getStudioAssetsFallback,
  mapDbRowToAsset,
} from "@/lib/studioAssets";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({
      assets: getStudioAssetsFallback(),
      source: "local",
    });
  }

  try {
    const result = await query(`
      SELECT id, name, url, price, category, type, tags, metadata, is_active
      FROM assets
      WHERE url IS NOT NULL AND TRIM(url) <> ''
        AND (is_active = true OR is_active IS NULL)
      ORDER BY name ASC
    `);

    const assets = result.rows
      .map((row) => mapDbRowToAsset(row as Record<string, unknown>))
      .filter((a) => a.url);

    if (assets.length > 0) {
      return NextResponse.json({ assets, source: "oci" });
    }
  } catch (extendedErr) {
    console.warn("OCI assets extended query failed, trying basic schema:", extendedErr);
    try {
      const result = await query(`
        SELECT id, name, url, price, category
        FROM assets
        WHERE url IS NOT NULL AND TRIM(url) <> ''
        ORDER BY name ASC
      `);

      const assets = result.rows
        .map((row) => mapDbRowToAsset(row as Record<string, unknown>))
        .filter((a) => a.url);

      if (assets.length > 0) {
        return NextResponse.json({ assets, source: "oci-basic" });
      }
    } catch (basicErr) {
      console.error("OCI assets basic query failed:", basicErr);
    }
  }

  return NextResponse.json({
    assets: getStudioAssetsFallback(),
    source: "local-fallback",
  });
}
