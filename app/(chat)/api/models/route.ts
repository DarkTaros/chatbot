import {
  DEFAULT_CHAT_MODEL,
  getActiveModels,
  getCapabilities,
} from "@/lib/ai/models";

export async function GET() {
  const [capabilities, models] = await Promise.all([
    getCapabilities(),
    Promise.resolve(getActiveModels()),
  ]);

  return Response.json(
    { capabilities, defaultModel: DEFAULT_CHAT_MODEL, models },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
