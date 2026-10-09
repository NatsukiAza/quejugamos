import { NextRequest } from "next/server";
import { redirectTo } from "@/lib/http";
import { safeReturnTo, steamLoginRedirect } from "@/lib/steam/openid";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  return redirectTo(steamLoginRedirect(returnTo));
}
