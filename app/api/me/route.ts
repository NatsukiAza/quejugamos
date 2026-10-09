import { connection } from "next/server";
import { errorResponse } from "@/lib/http";
import { getSession } from "@/lib/session";
import { loadLibrary } from "@/lib/rooms/service";

export async function GET() {
  await connection();
  try {
    const session = await getSession();
    if (!session) return Response.json({ session: null, library: null });
    const library = await loadLibrary(session.steamId);
    return Response.json({
      session,
      library: {
        status: library.status,
        gameCount: library.games.length,
        games: library.games,
        libraryError: library.status === "error" ? library.libraryError : null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
