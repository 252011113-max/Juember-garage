import { Prisma } from "@prisma/client";
import {
  canTransitionQueueStatus,
  isActiveQueueStatus,
  isQueueStatus,
  type QueueStatus,
} from "@/lib/queue/status";

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_TRANSITION" };

export type TransitionOptions = {
  expectedMechanicId?: string;
  completionData?: {
    notes: string;
    partsUsed: string;
    laborCost: number;
    partsCost: number;
    totalCost: number;
  };
};

export async function transitionQueueTicket(
  transaction: Prisma.TransactionClient,
  ticketId: string,
  toStatus: QueueStatus,
  changedById: string,
  options: TransitionOptions = {},
): Promise<TransitionResult> {
  if (options.completionData && toStatus !== "DONE") {
    return { ok: false, reason: "INVALID_TRANSITION" };
  }

  const ticket = await transaction.queueTicket.findFirst({
    where: {
      id: ticketId,
      ...(options.expectedMechanicId
        ? { mechanicId: options.expectedMechanicId }
        : {}),
    },
    select: { id: true, status: true },
  });

  if (!ticket) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (
    !isQueueStatus(ticket.status) ||
    !canTransitionQueueStatus(ticket.status, toStatus)
  ) {
    return { ok: false, reason: "INVALID_TRANSITION" };
  }

  const now = new Date();
  const update = await transaction.queueTicket.updateMany({
    where: {
      id: ticketId,
      status: ticket.status,
      ...(options.expectedMechanicId
        ? { mechanicId: options.expectedMechanicId }
        : {}),
    },
    data: {
      ...options.completionData,
      status: toStatus,
      calledAt: toStatus === "CALLED" ? now : undefined,
      startedAt: toStatus === "IN_PROGRESS" ? now : undefined,
      finishedAt: toStatus === "DONE" ? now : undefined,
    },
  });
  if (update.count === 0) {
    return { ok: false, reason: "INVALID_TRANSITION" };
  }

  await transaction.queueStatusLog.create({
    data: {
      ticketId,
      fromStatus: ticket.status,
      toStatus,
      changedById,
    },
  });

  if (!isActiveQueueStatus(toStatus)) {
    await transaction.activeVehicleQueue.deleteMany({
      where: { ticketId },
    });
  }

  return { ok: true };
}
