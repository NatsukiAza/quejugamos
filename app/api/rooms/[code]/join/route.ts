import { errorResponse, redirectTo } from "@/lib/http";
import { AppError } from "@/lib/store/redis";
import { joinRoom, requireSession } from "@/lib/rooms/service";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  try {
    const session = await requireSession();
    await joinRoom(code, session);
    return redirectTo(`/sala/${code}`);
  } catch (error) {
    if (error instanceof AppError && (error.code === "room_full" || error.code === "room_not_found")) {
      return redirectTo(`/sala/${code}?notice=${error.code}`);
    }
    return errorResponse(error);
  }
}
