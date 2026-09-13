import { NextRequest, NextResponse } from "next/server";
import { fetchForecast, describeCode } from "@/lib/weather";

export const runtime = "nodejs";

/** GET /api/weather?lat=..&lng=..&start=YYYY-MM-DD&days=n */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const start = searchParams.get("start") ?? new Date().toISOString().slice(0, 10);
  const days = Math.min(16, Math.max(1, parseInt(searchParams.get("days") ?? "7", 10)));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const daily = await fetchForecast(lat, lng, start, days);
    return NextResponse.json(
      {
        latitude: lat,
        longitude: lng,
        start,
        days: daily.map((d) => ({
          ...d,
          conditionLabel: describeCode(d.code).label,
        })),
      },
      {
        headers: {
          // weather moves slowly; cache server-side + at edge for an hour
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "weather fetch failed" },
      { status: 502 },
    );
  }
}
