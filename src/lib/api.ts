import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function requireUserId() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      userId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId, response: null };
}
