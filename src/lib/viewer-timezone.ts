import { headers } from "next/headers";

// Vercel's edge network tags every request with the visitor's IANA timezone,
// inferred from IP geolocation. Only present on Vercel (production/preview),
// so local dev falls back to undefined and callers use the server's own
// local time instead — fine for local dev, since that IS the viewer there.
export async function getViewerTimeZone(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-vercel-ip-timezone") ?? undefined;
}
