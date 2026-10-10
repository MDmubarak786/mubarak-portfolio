import type { APIRoute } from "astro";
import { calendar } from "../lib/calendar";

export const GET: APIRoute = async () => {
  const { svg } = await calendar();
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
};
