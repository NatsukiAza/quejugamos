import { errorResponse } from "@/lib/http";
import { buildGames, readRoom } from "@/lib/rooms/service";
import { parseFilters } from "@/lib/rooms/query";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const room = await readRoom(code);
    if (!room) return Response.json({ error: "room_not_found" }, { status: 404 });
    const { minOwners } = parseFilters(new URL(request.url).searchParams);
    const games = await buildGames(room, minOwners);
    return Response.json(games);
  } catch (error) {
    return errorResponse(error);
  }
}
