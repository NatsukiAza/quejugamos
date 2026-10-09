import { errorResponse } from "@/lib/http";
import { refreshPlayer, requireSession } from "@/lib/rooms/service";

export async function POST(_request: Request, context: { params: Promise<{ code: string; steamId: string }> }) {
  try {
    const { code, steamId } = await context.params;
    const session = await requireSession();
    const room = await refreshPlayer(code, session, steamId);
    return Response.json({ room });
  } catch (error) {
    return errorResponse(error);
  }
}
