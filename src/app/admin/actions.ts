"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import type { ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { dateFromDateKey, getWorkshopDateKey, isWithinWorkshopHours } from "@/lib/queue/date";
import { allocateQueueNumber } from "@/lib/queue/number";
import { transitionQueueTicket } from "@/lib/queue/transition";
import {
  adminUserSchema,
  adminUserUpdateSchema,
  assignMechanicSchema,
  queueRequestReviewSchema,
  resetPasswordSchema,
  serviceTypeSchema,
  ticketActionSchema,
  walkInTicketSchema,
  workshopSettingsSchema,
} from "@/lib/validation/admin";
import { resourceIdSchema } from "@/lib/validation/customer";

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

function isKnownError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function createAdminUser(input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = adminUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  try {
    const { password, phone, ...userData } = parsed.data;
    await prisma.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
        phone: phone || null,
        passwordHash: await hash(password, 12),
      },
    });
  } catch (error) {
    if (isKnownError(error, "P2002")) {
      return { ok: false, message: "Email tersebut sudah terdaftar." };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  return { ok: true, message: "Akun berhasil dibuat." };
}

export async function updateAdminUser(
  userId: string,
  input: unknown,
): Promise<ActionResult> {
  await requireRole("ADMIN");
  if (!resourceIdSchema.safeParse(userId).success) {
    return { ok: false, message: "ID akun tidak valid." };
  }
  const parsed = adminUserUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  try {
    const result = await prisma.user.updateMany({
      where: { id: userId, role: { in: ["CUSTOMER", "MECHANIC"] } },
      data: {
        ...parsed.data,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
      },
    });
    if (result.count === 0) {
      return { ok: false, message: "Akun tidak ditemukan." };
    }
  } catch (error) {
    if (isKnownError(error, "P2002")) {
      return { ok: false, message: "Email tersebut sudah terdaftar." };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  return { ok: true, message: "Data akun berhasil diperbarui." };
}

export async function setAdminUserActive(
  userId: string,
  activeInput: unknown,
): Promise<ActionResult> {
  await requireRole("ADMIN");
  if (!resourceIdSchema.safeParse(userId).success) {
    return { ok: false, message: "ID akun tidak valid." };
  }
  const parsedActive = z.boolean().safeParse(activeInput);
  if (!parsedActive.success) {
    return { ok: false, message: "Status aktif akun tidak valid." };
  }
  const isActive = parsedActive.data;
  const result = await prisma.user.updateMany({
    where: { id: userId, role: { in: ["CUSTOMER", "MECHANIC"] } },
    data: { isActive },
  });
  if (result.count === 0) {
    return { ok: false, message: "Akun tidak ditemukan." };
  }
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: isActive ? "Akun berhasil diaktifkan." : "Akun berhasil dinonaktifkan.",
  };
}

export async function deleteAdminUser(userId: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  if (!resourceIdSchema.safeParse(userId).success) {
    return { ok: false, message: "ID akun tidak valid." };
  }
  const user = await prisma.user.findFirst({
    where: { id: userId, role: { in: ["CUSTOMER", "MECHANIC"] } },
    select: {
      id: true,
      _count: {
        select: {
          customerTickets: true,
          assignedTickets: true,
          queueRequests: true,
          statusChanges: true,
        },
      },
    },
  });
  if (!user) {
    return { ok: false, message: "Akun tidak ditemukan." };
  }
  if (
    user._count.customerTickets > 0 ||
    user._count.assignedTickets > 0 ||
    user._count.queueRequests > 0 ||
    user._count.statusChanges > 0
  ) {
    return {
      ok: false,
      message: "Akun yang memiliki riwayat antrian tidak dapat dihapus. Nonaktifkan akun ini.",
    };
  }
  try {
    const result = await prisma.user.deleteMany({
      where: { id: user.id, role: { in: ["CUSTOMER", "MECHANIC"] } },
    });
    if (result.count === 0) {
      return { ok: false, message: "Akun tidak ditemukan." };
    }
  } catch (error) {
    if (isKnownError(error, "P2003")) {
      return {
        ok: false,
        message: "Akun kini memiliki riwayat terkait dan tidak dapat dihapus. Nonaktifkan akun ini.",
      };
    }
    throw error;
  }
  revalidatePath("/admin/users");
  return { ok: true, message: "Akun berhasil dihapus." };
}

export async function resetAdminUserPassword(
  input: unknown,
): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }
  const result = await prisma.user.updateMany({
    where: {
      id: parsed.data.userId,
      role: { in: ["CUSTOMER", "MECHANIC"] },
    },
    data: { passwordHash: await hash(parsed.data.password, 12) },
  });
  if (result.count === 0) {
    return { ok: false, message: "Akun tidak ditemukan." };
  }
  return { ok: true, message: "Kata sandi berhasil direset." };
}

export async function saveAdminService(input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = serviceTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  const { id, ...data } = parsed.data;
  try {
    if (id) {
      const result = await prisma.serviceType.updateMany({
        where: { id },
        data,
      });
      if (result.count === 0) {
        return { ok: false, message: "Jenis servis tidak ditemukan." };
      }
    } else {
      await prisma.serviceType.create({ data });
    }
  } catch (error) {
    if (isKnownError(error, "P2002")) {
      return { ok: false, message: "Nama jenis servis sudah digunakan." };
    }
    throw error;
  }

  revalidatePath("/admin/layanan");
  revalidatePath("/customer/antrian");
  return {
    ok: true,
    message: id ? "Jenis servis berhasil diperbarui." : "Jenis servis berhasil ditambahkan.",
  };
}

export async function deleteAdminService(serviceId: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  if (!resourceIdSchema.safeParse(serviceId).success) {
    return { ok: false, message: "ID jenis servis tidak valid." };
  }
  const [ticketCount, requestCount] = await Promise.all([
    prisma.queueTicket.count({ where: { serviceTypeId: serviceId } }),
    prisma.queueRequest.count({ where: { serviceTypeId: serviceId } }),
  ]);
  if (ticketCount > 0 || requestCount > 0) {
    return {
      ok: false,
      message: "Jenis servis yang memiliki tiket atau permintaan antrian tidak dapat dihapus. Nonaktifkan layanan ini.",
    };
  }
  const result = await prisma.serviceType.deleteMany({
    where: { id: serviceId },
  });
  if (result.count === 0) {
    return { ok: false, message: "Jenis servis tidak ditemukan." };
  }
  revalidatePath("/admin/layanan");
  revalidatePath("/customer/antrian");
  return { ok: true, message: "Jenis servis berhasil dihapus." };
}

export async function saveWorkshopSettings(input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = workshopSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }
  const settings = parsed.data;
  await prisma.workshopSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      dailyQuota: settings.dailyQuota,
      holidays: JSON.stringify([...new Set(settings.holidays)]),
    },
    update: {
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      dailyQuota: settings.dailyQuota,
      holidays: JSON.stringify([...new Set(settings.holidays)]),
    },
  });
  revalidatePath("/admin/pengaturan");
  revalidatePath("/customer/antrian");
  return { ok: true, message: "Pengaturan bengkel berhasil disimpan." };
}

export async function createAdminWalkIn(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = walkInTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }
  const now = new Date();
  const queueDateKey = getWorkshopDateKey(now);
  const queueDate = dateFromDateKey(queueDateKey);

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const setting = await transaction.workshopSetting.findUnique({
        where: { id: "default" },
      });
      if (!setting) {
        return { ok: false, message: "Pengaturan bengkel belum tersedia." };
      }
      if (
        setting.openTime >= setting.closeTime ||
        !isWithinWorkshopHours(now, setting.openTime, setting.closeTime)
      ) {
        return {
          ok: false,
          message: `Antrian walk-in hanya dapat dibuat pukul ${setting.openTime}–${setting.closeTime}.`,
        };
      }
      let holidays: unknown;
      try {
        holidays = JSON.parse(setting.holidays);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return { ok: false, message: "Data hari libur bengkel tidak valid." };
        }
        throw error;
      }
      if (!Array.isArray(holidays) || holidays.some((day) => typeof day !== "string")) {
        return { ok: false, message: "Data hari libur bengkel tidak valid." };
      }
      if (holidays.includes(queueDateKey)) {
        return { ok: false, message: "Bengkel sedang libur hari ini." };
      }
      const queueCount = await transaction.queueTicket.count({
        where: { queueDate },
      });
      const pendingRequestCount =
        await transaction.activeVehicleQueue.count({
          where: { queueDate, requestId: { not: null } },
        });
      if (queueCount + pendingRequestCount >= setting.dailyQuota) {
        return { ok: false, message: "Kuota antrian hari ini sudah penuh." };
      }
      const vehicle = await transaction.vehicle.findFirst({
        where: {
          id: parsed.data.vehicleId,
          ownerId: parsed.data.customerId,
        },
        select: { id: true },
      });
      const customer = await transaction.user.findFirst({
        where: {
          id: parsed.data.customerId,
          role: "CUSTOMER",
          isActive: true,
        },
        select: { id: true },
      });
      if (!vehicle || !customer) {
        return { ok: false, message: "Pelanggan atau kendaraan tidak ditemukan." };
      }
      const service = await transaction.serviceType.findFirst({
        where: { id: parsed.data.serviceTypeId, isActive: true },
        select: { id: true },
      });
      if (!service) {
        return { ok: false, message: "Jenis servis tidak tersedia." };
      }
      const reservation = await transaction.activeVehicleQueue.findUnique({
        where: {
          vehicleId_queueDate: {
            vehicleId: vehicle.id,
            queueDate,
          },
        },
        select: { ticketId: true },
      });
      if (reservation) {
        return {
          ok: false,
          message: "Kendaraan tersebut sudah memiliki antrian aktif hari ini.",
        };
      }

      const queueNumber = await allocateQueueNumber(transaction, queueDate);
      const ticket = await transaction.queueTicket.create({
        data: {
          queueNumber,
          queueDate,
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceTypeId: service.id,
          complaint: parsed.data.complaint,
          source: "WALK_IN",
          status: "WAITING",
        },
        select: { id: true },
      });
      await transaction.activeVehicleQueue.create({
        data: { vehicleId: vehicle.id, queueDate, ticketId: ticket.id },
      });
      await transaction.queueStatusLog.create({
        data: {
          ticketId: ticket.id,
          fromStatus: null,
          toStatus: "WAITING",
          changedById: admin.id,
        },
      });
      return {
        ok: true,
        message: `Antrian walk-in ${queueNumber} berhasil dibuat.`,
        ticketId: ticket.id,
        queueNumber,
      };
    });
    if (!result.ok) {
      return result;
    }
    revalidatePath("/admin/antrian");
    revalidatePath("/admin");
    revalidatePath("/display");
    return result;
  } catch (error) {
    if (isKnownError(error, "P2002")) {
      return {
        ok: false,
        message: "Kendaraan tersebut baru saja mendapat antrian aktif hari ini.",
      };
    }
    throw error;
  }
}

export async function callNextAdminTicket(): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const queueDate = dateFromDateKey(getWorkshopDateKey());
  const result = await prisma.$transaction(async (transaction) => {
    const ticket = await transaction.queueTicket.findFirst({
      where: { queueDate, status: "WAITING" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, queueNumber: true },
    });
    if (!ticket) {
      return { ok: false, message: "Tidak ada antrian menunggu untuk dipanggil." };
    }
    const transition = await transitionQueueTicket(
      transaction,
      ticket.id,
      "CALLED",
      admin.id,
    );
    if (!transition.ok) {
      return { ok: false, message: "Antrian berubah. Muat ulang daftar dan coba lagi." };
    }
    return {
      ok: true,
      message: `Nomor ${ticket.queueNumber} berhasil dipanggil.`,
    };
  });
  if (result.ok) {
    refreshQueueViews();
  }
  return result;
}

export async function reviewAdminQueueRequest(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = queueRequestReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const request = await transaction.queueRequest.findFirst({
        where: { id: parsed.data.requestId, status: "PENDING" },
        select: {
          id: true,
          queueNumber: true,
          queueDate: true,
          customerId: true,
          vehicleId: true,
          serviceTypeId: true,
          complaint: true,
          createdAt: true,
        },
      });
      if (!request) {
        return {
          ok: false,
          message: "Permintaan tidak ditemukan atau sudah ditinjau.",
        };
      }

      if (parsed.data.decision === "REJECT") {
        const claim = await transaction.queueRequest.updateMany({
          where: { id: request.id, status: "PENDING" },
          data: {
            status: "APPROVING",
            reviewedById: admin.id,
            reviewedAt: new Date(),
          },
        });
        if (claim.count === 0) {
          return {
            ok: false,
            message: "Permintaan sudah ditinjau oleh admin lain.",
          };
        }
        await transaction.activeVehicleQueue.deleteMany({
          where: {
            vehicleId: request.vehicleId,
            queueDate: request.queueDate,
            requestId: request.id,
          },
        });
        await transaction.queueRequest.update({
          where: { id: request.id },
          data: { status: "REJECTED" },
        });
        return {
          ok: true,
          message: `Permintaan nomor ${request.queueNumber} ditolak.`,
        };
      }

      const reservation = await transaction.activeVehicleQueue.findUnique({
        where: {
          vehicleId_queueDate: {
            vehicleId: request.vehicleId,
            queueDate: request.queueDate,
          },
        },
        select: { requestId: true },
      });
      if (reservation?.requestId !== request.id) {
        return {
          ok: false,
          message: "Reservasi kendaraan permintaan ini sudah tidak tersedia.",
        };
      }

      const setting = await transaction.workshopSetting.findUnique({
        where: { id: "default" },
        select: { dailyQuota: true, holidays: true },
      });
      if (!setting || setting.dailyQuota < 1) {
        return {
          ok: false,
          message: "Pengaturan kuota bengkel tidak valid. Hubungi pengelola.",
        };
      }
      let holidays: unknown;
      try {
        holidays = JSON.parse(setting.holidays);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return {
            ok: false,
            message: "Data hari libur bengkel tidak valid. Hubungi pengelola.",
          };
        }
        throw error;
      }
      const requestDateKey = request.queueDate.toISOString().slice(0, 10);
      if (
        !Array.isArray(holidays) ||
        holidays.some((holiday) => typeof holiday !== "string")
      ) {
        return {
          ok: false,
          message: "Data hari libur bengkel tidak valid. Hubungi pengelola.",
        };
      }
      if (holidays.includes(requestDateKey)) {
        return {
          ok: false,
          message: "Tanggal permintaan kini ditetapkan sebagai hari libur.",
        };
      }

      const [ticketCount, pendingRequestCount] = await Promise.all([
        transaction.queueTicket.count({
          where: { queueDate: request.queueDate },
        }),
        transaction.activeVehicleQueue.count({
          where: {
            queueDate: request.queueDate,
            requestId: { not: null },
          },
        }),
      ]);
      if (ticketCount + pendingRequestCount > setting.dailyQuota) {
        return {
          ok: false,
          message: "Kuota tanggal tersebut tidak lagi mencukupi untuk menerima permintaan.",
        };
      }

      const claim = await transaction.queueRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: {
          status: "APPROVING",
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) {
        return {
          ok: false,
          message: "Permintaan sudah ditinjau oleh admin lain.",
        };
      }

      const ticket = await transaction.queueTicket.create({
        data: {
          queueNumber: request.queueNumber,
          queueDate: request.queueDate,
          customerId: request.customerId,
          vehicleId: request.vehicleId,
          serviceTypeId: request.serviceTypeId,
          complaint: request.complaint,
          source: "ONLINE",
          createdAt: request.createdAt,
        },
        select: { id: true },
      });
      const movedReservation = await transaction.activeVehicleQueue.updateMany({
        where: {
          vehicleId: request.vehicleId,
          queueDate: request.queueDate,
          requestId: request.id,
        },
        data: { ticketId: ticket.id, requestId: null },
      });
      if (movedReservation.count === 0) {
        throw new Error("Queue request reservation changed during approval.");
      }
      await transaction.queueStatusLog.create({
        data: {
          ticketId: ticket.id,
          fromStatus: null,
          toStatus: "WAITING",
          changedById: admin.id,
        },
      });
      await transaction.queueRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          approvedTicketId: ticket.id,
        },
      });
      return {
        ok: true,
        message: `Permintaan disetujui. Nomor ${request.queueNumber} berlaku untuk tanggal ${requestDateKey}.`,
      };
    });

    if (result.ok) {
      refreshQueueViews();
      revalidatePath("/customer/riwayat");
    }
    return result;
  } catch (error) {
    if (isKnownError(error, "P2002") || isKnownError(error, "P2034")) {
      return {
        ok: false,
        message: "Permintaan berubah bersamaan. Muat ulang halaman lalu coba lagi.",
      };
    }
    throw error;
  }
}

export async function setAdminTicketStatus(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = ticketActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }
  const result = await prisma.$transaction((transaction) =>
    transitionQueueTicket(
      transaction,
      parsed.data.ticketId,
      parsed.data.status,
      admin.id,
    ),
  );
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "NOT_FOUND"
          ? "Antrian tidak ditemukan."
          : "Perubahan status tidak valid. Muat ulang daftar.",
    };
  }
  refreshQueueViews();
  return {
    ok: true,
    message:
      parsed.data.status === "NO_SHOW"
        ? "Antrian ditandai tidak hadir."
        : "Antrian berhasil dibatalkan.",
  };
}

export async function assignAdminMechanic(input: unknown): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = assignMechanicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }
  const mechanic = await prisma.user.findFirst({
    where: {
      id: parsed.data.mechanicId,
      role: "MECHANIC",
      isActive: true,
    },
    select: { id: true },
  });
  if (!mechanic) {
    return { ok: false, message: "Mekanik aktif tidak ditemukan." };
  }
  const result = await prisma.queueTicket.updateMany({
    where: {
      id: parsed.data.ticketId,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
    },
    data: { mechanicId: mechanic.id },
  });
  if (result.count === 0) {
    return { ok: false, message: "Antrian aktif tidak ditemukan." };
  }
  refreshQueueViews();
  return { ok: true, message: "Mekanik berhasil ditugaskan." };
}

function refreshQueueViews() {
  revalidatePath("/admin/antrian");
  revalidatePath("/admin");
  revalidatePath("/mechanic");
  revalidatePath("/mechanic/pekerjaan");
  revalidatePath("/mechanic/riwayat");
  revalidatePath("/display");
  revalidatePath("/customer");
  revalidatePath("/customer/riwayat");
}
