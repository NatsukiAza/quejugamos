import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { readRoom, readVotes, requireSession, writeVote } from "@/lib/rooms/service";

const schema = z.object({
  appId: z.string().trim().min(1).max(40),
  value: z.enum(["yes", "no"]),
});

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const room = await readRoom(code);
    if (!room) return Response.json({ error: "room_not_found" }, { status: 404 });
    const voters = room.players.filter((player) => player.canVote).map((player) => ({
      steamId: player.steamId,
      personaName: player.personaName,
    }));
    const votes = await readVotes(room);
    return Response.json({ voters, votes });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = schema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "invalid_vote" }, { status: 400 });
    const session = await requireSession();
    await writeVote(code, session, body.data.appId, body.data.value);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
