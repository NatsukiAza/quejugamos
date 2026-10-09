import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { hydrateMetadata, readRoom } from "@/lib/rooms/service";

const schema = z.object({
  appIds: z.array(z.number().int().positive()).min(1).max(8),
});

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const room = await readRoom(code);
    if (!room) return Response.json({ error: "room_not_found" }, { status: 404 });
    const body = schema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "invalid_apps" }, { status: 400 });
    const result = await hydrateMetadata(room, body.data.appIds);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
