import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/directions?from=lat,lng&to=lat,lng — road distance in km via OSRM. */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=false`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`osrm ${res.status}`);
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) throw new Error("no route found");
    return NextResponse.json(
      {
        distanceKm: Math.round(route.distance / 1000),
        durationH: Math.round((route.duration / 3600) * 10) / 10,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "routing failed" },
      { status: 502 },
    );
  }
}
