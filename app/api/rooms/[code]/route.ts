import { errorResponse } from "@/lib/http";
import { getSession } from "@/lib/session";
import { readRoom, viewerOf } from "@/lib/rooms/service";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const room = await readRoom(code);
    if (!room) return Response.json({ error: "room_not_found" }, { status: 404 });
    const session = await getSession();
    return Response.json({ room, viewer: viewerOf(room, session) });
  } catch (error) {
    return errorResponse(error);
  }
}
