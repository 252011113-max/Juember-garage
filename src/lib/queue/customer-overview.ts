import { prisma } from "@/lib/prisma";
import {
  addDaysToDateKey,
  dateFromDateKey,
  getWorkshopDateKey,
} from "@/lib/queue/date";
import {
  activeQueueStatuses,
  isQueueStatus,
  type QueueStatus,
} from "@/lib/queue/status";

export type CustomerQueueItem = {
  id: string;
  queueNumber: string;
  queueDate: string;
  status: QueueStatus;
  serviceName: string;
  vehicleLabel: string;
  createdAt: string;
  calledAt: string | null;
  mechanicName: string | null;
  position: number;
  estimatedWaitMinutes: number | null;
};

function getQueueSequence(queueNumber: string): number {
  return Number(queueNumber.split("-")[1] ?? 0);
}

export async function getCustomerQueueOverview(
  customerId: string,
): Promise<CustomerQueueItem[]> {
  const firstDate = getWorkshopDateKey();
  const lastDate = addDaysToDateKey(firstDate, 7);
  const queueDateRange = {
    gte: dateFromDateKey(firstDate),
    lte: dateFromDateKey(lastDate),
  };
  const [customerTickets, activeTickets, activeMechanicCount] =
    await Promise.all([
      prisma.queueTicket.findMany({
        where: {
          customerId,
          queueDate: queueDateRange,
          status: { in: [...activeQueueStatuses] },
        },
        include: {
          serviceType: { select: { name: true } },
          vehicle: {
            select: { plateNumber: true, brand: true, model: true },
          },
          mechanic: { select: { name: true } },
        },
      }),
      prisma.queueTicket.findMany({
        where: {
          queueDate: queueDateRange,
          status: { in: [...activeQueueStatuses] },
        },
        include: {
          serviceType: { select: { estimatedMinutes: true } },
        },
      }),
      prisma.user.count({
        where: { role: "MECHANIC", isActive: true },
      }),
    ]);

  activeTickets.sort((first, second) => {
    const dateDifference = first.queueDate.getTime() - second.queueDate.getTime();
    if (dateDifference) {
      return dateDifference;
    }
    const timeDifference = first.createdAt.getTime() - second.createdAt.getTime();
    return (
      timeDifference ||
      getQueueSequence(first.queueNumber) - getQueueSequence(second.queueNumber)
    );
  });

  const ticketsByDay = new Map<string, typeof activeTickets>();
  for (const ticket of activeTickets) {
    const dateKey = ticket.queueDate.toISOString().slice(0, 10);
    const dayTickets = ticketsByDay.get(dateKey) ?? [];
    dayTickets.push(ticket);
    ticketsByDay.set(dateKey, dayTickets);
  }

  return customerTickets
    .sort((first, second) => {
      const dateDifference = first.queueDate.getTime() - second.queueDate.getTime();
      if (dateDifference) {
        return dateDifference;
      }
      const timeDifference = first.createdAt.getTime() - second.createdAt.getTime();
      return (
        timeDifference ||
        getQueueSequence(first.queueNumber) - getQueueSequence(second.queueNumber)
      );
    })
    .map((ticket) => {
      const ticketDate = ticket.queueDate.toISOString().slice(0, 10);
      const sameDayTickets = ticketsByDay.get(ticketDate) ?? [];
      const index = sameDayTickets.findIndex((entry) => entry.id === ticket.id);
      if (index < 0 || !isQueueStatus(ticket.status)) {
        throw new Error(`Ticket ${ticket.id} has invalid queue position data.`);
      }

      const waitingMinutes = sameDayTickets
        .slice(0, index)
        .reduce(
          (total, ahead) => total + ahead.serviceType.estimatedMinutes,
          0,
        );

      return {
        id: ticket.id,
        queueNumber: ticket.queueNumber,
        queueDate: ticketDate,
        status: ticket.status,
        serviceName: ticket.serviceType.name,
        vehicleLabel: `${ticket.vehicle.plateNumber} · ${ticket.vehicle.brand} ${ticket.vehicle.model}`,
        createdAt: ticket.createdAt.toISOString(),
        calledAt: ticket.calledAt?.toISOString() ?? null,
        mechanicName: ticket.mechanic?.name ?? null,
        position: index + 1,
        estimatedWaitMinutes:
          activeMechanicCount > 0
            ? Math.ceil(waitingMinutes / activeMechanicCount)
            : null,
      };
    });
}
