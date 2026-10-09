import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { addPastedPlayer, requireSession } from "@/lib/rooms/service";

const schema = z.object({
  input: z.string().trim().min(2).max(200),
});

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = schema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "invalid_profile" }, { status: 400 });
    const session = await requireSession();
    const room = await addPastedPlayer(code, session, body.data.input);
    return Response.json({ room });
  } catch (error) {
    return errorResponse(error);
  }
}
