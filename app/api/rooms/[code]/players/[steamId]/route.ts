import { errorResponse } from "@/lib/http";
import { removePlayer, requireSession } from "@/lib/rooms/service";

export async function DELETE(_request: Request, context: { params: Promise<{ code: string; steamId: string }> }) {
  try {
    const { code, steamId } = await context.params;
    const session = await requireSession();
    await removePlayer(code, session, steamId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
