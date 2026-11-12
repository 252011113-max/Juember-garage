import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRoleHome, isRole, type Role } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function requireRole(role: Role) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!account?.isActive || !isRole(account.role)) {
    redirect("/akun-nonaktif");
  }

  if (account.role !== role) {
    redirect(getRoleHome(account.role));
  }

  return { ...session.user, role: account.role };
}
