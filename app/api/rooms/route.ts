import { errorResponse, redirectTo } from "@/lib/http";
import { createRoom, requireSession } from "@/lib/rooms/service";

export async function POST() {
  try {
    const session = await requireSession();
    const room = await createRoom(session);
    return redirectTo(`/sala/${room.code}`);
  } catch (error) {
    return errorResponse(error);
  }
}
