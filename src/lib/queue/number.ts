import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

export function formatQueueNumber(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError("Queue sequence must be a positive safe integer.");
  }

  return `A-${String(sequence).padStart(3, "0")}`;
}

export async function allocateQueueNumber(
  transaction: Prisma.TransactionClient,
  queueDate: Date,
): Promise<string> {
  const timestamp = new Date();
  const counters = await transaction.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "QueueCounter" ("id", "queueDate", "lastNumber", "updatedAt")
    VALUES (${randomUUID()}, ${queueDate}, 1, ${timestamp})
    ON CONFLICT("queueDate") DO UPDATE SET
      "lastNumber" = "lastNumber" + 1,
      "updatedAt" = excluded."updatedAt"
    RETURNING "lastNumber"
  `;
  const sequence = counters[0]?.lastNumber;
  if (sequence === undefined) {
    throw new Error("Unable to allocate a queue number.");
  }

  return formatQueueNumber(sequence);
}
