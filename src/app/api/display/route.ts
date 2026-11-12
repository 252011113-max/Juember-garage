import { dateFromDateKey, getWorkshopDateKey } from "@/lib/queue/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const queueDate = dateFromDateKey(getWorkshopDateKey());
  const [serving, called, next] = await Promise.all([
    prisma.queueTicket.findMany({
      where: { queueDate, status: "IN_PROGRESS" },
      orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
      take: 3,
      select: {
        id: true,
        queueNumber: true,
        mechanic: { select: { name: true } },
        serviceType: { select: { name: true } },
      },
    }),
    prisma.queueTicket.findMany({
      where: { queueDate, status: "CALLED" },
      orderBy: [{ calledAt: "asc" }, { createdAt: "asc" }],
      take: 3,
      select: { id: true, queueNumber: true },
    }),
    prisma.queueTicket.findMany({
      where: { queueDate, status: "WAITING" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 5,
      select: { id: true, queueNumber: true },
    }),
  ]);
  return Response.json(
    { date: getWorkshopDateKey(), serving, called, next },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
