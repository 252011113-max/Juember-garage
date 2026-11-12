"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import type { ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { transitionQueueTicket } from "@/lib/queue/transition";
import { mechanicCompletionSchema } from "@/lib/validation/mechanic";
import { resourceIdSchema } from "@/lib/validation/customer";

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

export async function startMechanicWork(ticketIdInput: unknown): Promise<ActionResult> {
  const mechanic = await requireRole("MECHANIC");
  const parsedId = resourceIdSchema.safeParse(ticketIdInput);
  if (!parsedId.success) {
    return { ok: false, message: "ID pekerjaan tidak valid." };
  }

  const result = await prisma.$transaction((transaction) =>
    transitionQueueTicket(
      transaction,
      parsedId.data,
      "IN_PROGRESS",
      mechanic.id,
      { expectedMechanicId: mechanic.id },
    ),
  );
  if (!result.ok) {
    return {
      ok: false,
      message: "Pekerjaan tidak ditemukan, tidak ditugaskan kepada Anda, atau belum dipanggil.",
    };
  }

  refreshMechanicViews();
  return { ok: true, message: "Pekerjaan servis berhasil dimulai." };
}

export async function completeMechanicWork(input: unknown): Promise<ActionResult> {
  const mechanic = await requireRole("MECHANIC");
  const parsed = mechanicCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  const { ticketId, notes, partsUsed, laborCost, partsCost } = parsed.data;
  const result = await prisma.$transaction((transaction) =>
    transitionQueueTicket(
      transaction,
      ticketId,
      "DONE",
      mechanic.id,
      {
        expectedMechanicId: mechanic.id,
        completionData: {
          notes,
          partsUsed: JSON.stringify(partsUsed),
          laborCost,
          partsCost,
          totalCost: laborCost + partsCost,
        },
      },
    ),
  );
  if (!result.ok) {
    return {
      ok: false,
      message: "Pekerjaan tidak ditemukan, tidak ditugaskan kepada Anda, atau belum dikerjakan.",
    };
  }

  refreshMechanicViews();
  return { ok: true, message: "Pekerjaan selesai dan catatan servis berhasil disimpan." };
}

function refreshMechanicViews() {
  revalidatePath("/mechanic");
  revalidatePath("/mechanic/pekerjaan");
  revalidatePath("/mechanic/riwayat");
  revalidatePath("/admin/antrian");
  revalidatePath("/admin");
  revalidatePath("/display");
  revalidatePath("/customer");
  revalidatePath("/customer/riwayat");
}
