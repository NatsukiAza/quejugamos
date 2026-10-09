import { errorResponse } from "@/lib/http";
import { removeCustomGame, requireSession } from "@/lib/rooms/service";

export async function DELETE(_request: Request, context: { params: Promise<{ code: string; id: string }> }) {
  try {
    const { code, id } = await context.params;
    const session = await requireSession();
    const room = await removeCustomGame(code, session, id);
    return Response.json({ room });
  } catch (error) {
    return errorResponse(error);
  }
}
