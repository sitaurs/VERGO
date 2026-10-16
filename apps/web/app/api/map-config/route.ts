/** Mapbox browser credentials only; never expose server tokens or other ENV values. */
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.MAPBOX_PUBLIC_TOKEN?.trim() ?? "";
  const headers = { "cache-control": "no-store" };
  if (!/^pk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    return Response.json({ available: false }, { status: 503, headers });
  }
  return Response.json({ available: true, publicToken: token }, { headers });
}
