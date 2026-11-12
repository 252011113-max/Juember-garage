import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCustomerUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return null;
  }

  const account = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      role: "CUSTOMER",
      isActive: true,
    },
    select: { id: true },
  });
  if (!account) {
    return null;
  }

  return session.user.id;
}
