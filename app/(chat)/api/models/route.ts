import { getActiveModels, getCapabilities } from "@/lib/ai/models";

export async function GET() {
  const headers = {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  };

  const [capabilities, models] = await Promise.all([
    getCapabilities(),
    Promise.resolve(getActiveModels()),
  ]);

  return Response.json({ capabilities, models }, { headers });
}
