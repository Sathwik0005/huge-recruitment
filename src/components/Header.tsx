import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import HeaderClient from "@/components/HeaderClient";

export default async function Header() {
  const session = await getSession();

  let isLoggedIn = false;
  let isAdmin = false;

  if (session) {
    isLoggedIn = true;
    const user = await prisma.user.findUnique({
      where: { firebaseUid: session.uid },
      select: { role: true, status: true },
    });
    isAdmin = user?.role === "ADMIN" && user?.status === "ACTIVE";
  }

  return <HeaderClient isLoggedIn={isLoggedIn} isAdmin={isAdmin} />;
}
