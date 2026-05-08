import {
  getActiveModels,
  getCapabilities,
  getDefaultChatModel,
} from "@/lib/ai/models.server";

export async function GET() {
  const models = await getActiveModels();
  const [capabilities, defaultModel] = await Promise.all([
    getCapabilities(models),
    getDefaultChatModel(models),
  ]);

  return Response.json(
    { capabilities, defaultModel, models },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
