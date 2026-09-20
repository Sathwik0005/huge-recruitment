import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin-session";
import { getAdminNotifications } from "@/lib/admin-notifications";

export async function GET() {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  const { items, unreadCount } = await getAdminNotifications();
  return NextResponse.json({ items, unreadCount });
}
