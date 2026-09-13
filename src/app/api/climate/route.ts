import { NextRequest, NextResponse } from "next/server";
import { fetchClimate } from "@/lib/weather";

export const runtime = "nodejs";

/** GET /api/climate?lat=..&lng=.. — monthly climate normals (1991–2020). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const monthly = await fetchClimate(lat, lng, 1);
    return NextResponse.json(
      { latitude: lat, longitude: lng, months: monthly },
      { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "climate fetch failed" },
      { status: 502 },
    );
  }
}
