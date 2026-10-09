import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { addCustomGame, requireSession } from "@/lib/rooms/service";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  genreIds: z.array(z.number().int()).max(12).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = schema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "invalid_name" }, { status: 400 });
    const session = await requireSession();
    const room = await addCustomGame(code, session, body.data.name, body.data.genreIds ?? []);
    return Response.json({ room });
  } catch (error) {
    return errorResponse(error);
  }
}
