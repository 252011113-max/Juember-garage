"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCustomerUserId } from "@/lib/auth/customer";
import type { ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import {
  addDaysToDateKey,
  dateFromDateKey,
  getWorkshopDateKey,
  isAfterWorkshopClosingTime,
  isValidDateKey,
  isWithinWorkshopHours,
} from "@/lib/queue/date";
import { allocateQueueNumber } from "@/lib/queue/number";
import { transitionQueueTicket } from "@/lib/queue/transition";
import {
  profileSchema,
  queueTicketSchema,
  resourceIdSchema,
  vehicleSchema,
} from "@/lib/validation/customer";

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

function isKnownError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function updateCustomerProfile(
  input: unknown,
): Promise<ActionResult> {
  const userId = await getCustomerUserId();
  if (!userId) {
    return { ok: false, message: "Sesi pelanggan tidak valid. Silakan masuk kembali." };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });
  revalidatePath("/customer/profil");
  return { ok: true, message: "Profil berhasil diperbarui." };
}

export async function saveCustomerVehicle(
  input: unknown,
  vehicleIdInput?: unknown,
): Promise<ActionResult> {
  const userId = await getCustomerUserId();
  if (!userId) {
    return { ok: false, message: "Sesi pelanggan tidak valid. Silakan masuk kembali." };
  }

  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }
  let vehicleId: string | undefined;
  if (vehicleIdInput !== undefined) {
    const parsedVehicleId = resourceIdSchema.safeParse(vehicleIdInput);
    if (!parsedVehicleId.success) {
      return { ok: false, message: "ID kendaraan tidak valid." };
    }
    vehicleId = parsedVehicleId.data;
  }

  const data = {
    ...parsed.data,
    plateNumber: parsed.data.plateNumber.toUpperCase(),
    year: Number(parsed.data.year),
  };

  try {
    if (vehicleId) {
      const updated = await prisma.vehicle.updateMany({
        where: { id: vehicleId, ownerId: userId },
        data,
      });
      if (updated.count === 0) {
        return { ok: false, message: "Kendaraan tidak ditemukan." };
      }
    } else {
      await prisma.vehicle.create({
        data: { ...data, ownerId: userId },
      });
    }
  } catch (error) {
    if (isKnownError(error, "P2002")) {
      return { ok: false, message: "Plat nomor tersebut sudah terdaftar." };
    }
    throw error;
  }

  revalidatePath("/customer/kendaraan");
  return { ok: true, message: vehicleId ? "Kendaraan diperbarui." : "Kendaraan ditambahkan." };
}

export async function deleteCustomerVehicle(
  vehicleId: string,
): Promise<ActionResult> {
  const userId = await getCustomerUserId();
  if (!userId) {
    return { ok: false, message: "Sesi pelanggan tidak valid. Silakan masuk kembali." };
  }
  if (!resourceIdSchema.safeParse(vehicleId).success) {
    return { ok: false, message: "ID kendaraan tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const vehicle = await transaction.vehicle.findFirst({
        where: { id: vehicleId, ownerId: userId },
        select: { id: true },
      });
      if (!vehicle) {
        return { ok: false, message: "Kendaraan tidak ditemukan." };
      }

      const [ticketCount, requestCount] = await Promise.all([
        transaction.queueTicket.count({ where: { vehicleId: vehicle.id } }),
        transaction.queueRequest.count({ where: { vehicleId: vehicle.id } }),
      ]);
      if (ticketCount > 0 || requestCount > 0) {
        return {
          ok: false,
          message: "Kendaraan yang memiliki riwayat atau permintaan antrian tidak dapat dihapus.",
        };
      }

      await transaction.vehicle.deleteMany({
        where: { id: vehicle.id, ownerId: userId },
      });
      return { ok: true, message: "Kendaraan berhasil dihapus." };
    });

    if (!result.ok) {
      return result;
    }
  } catch (error) {
    if (isKnownError(error, "P2003")) {
      return {
        ok: false,
        message: "Kendaraan tidak dapat dihapus karena memiliki riwayat antrian.",
      };
    }
    throw error;
  }

  revalidatePath("/customer/kendaraan");
  return { ok: true, message: "Kendaraan berhasil dihapus." };
}

export async function createCustomerQueueTicket(
  input: unknown,
): Promise<ActionResult> {
  const userId = await getCustomerUserId();
  if (!userId) {
    return { ok: false, message: "Sesi pelanggan tidak valid. Silakan masuk kembali." };
  }

  const parsed = queueTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  if (!isValidDateKey(parsed.data.queueDate)) {
    return { ok: false, message: "Tanggal antrian tidak valid." };
  }

  const now = new Date();
  const today = getWorkshopDateKey(now);
  const latestDate = addDaysToDateKey(today, 7);
  if (parsed.data.queueDate < today || parsed.data.queueDate > latestDate) {
    return {
      ok: false,
      message: "Tanggal antrian harus hari ini hingga maksimal 7 hari ke depan.",
    };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const setting = await transaction.workshopSetting.findUnique({
        where: { id: "default" },
      });
      if (!setting) {
        return {
          ok: false,
          message: "Pengaturan bengkel belum tersedia. Hubungi admin.",
        };
      }
      if (
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(setting.openTime) ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(setting.closeTime) ||
        setting.openTime >= setting.closeTime ||
        setting.dailyQuota < 1
      ) {
        return {
          ok: false,
          message: "Pengaturan jam atau kuota bengkel tidak valid. Hubungi admin.",
        };
      }

      let holidays: unknown;
      try {
        holidays = JSON.parse(setting.holidays);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return {
            ok: false,
            message: "Pengaturan hari libur tidak valid. Hubungi admin.",
          };
        }
        throw error;
      }

      if (
        !Array.isArray(holidays) ||
        holidays.some((holiday) => typeof holiday !== "string")
      ) {
        return {
          ok: false,
          message: "Pengaturan hari libur tidak valid. Hubungi admin.",
        };
      }

      const tomorrowKey = addDaysToDateKey(today, 1);
      const isAfterHoursRequest = isAfterWorkshopClosingTime(
        now,
        setting.closeTime,
      );
      const effectiveDateKey = isAfterHoursRequest
        ? tomorrowKey
        : parsed.data.queueDate;
      const queueDate = dateFromDateKey(effectiveDateKey);

      if (holidays.includes(effectiveDateKey)) {
        return { ok: false, message: "Bengkel tutup pada tanggal tersebut." };
      }

      if (
        parsed.data.queueDate === today &&
        !isAfterHoursRequest &&
        !isWithinWorkshopHours(now, setting.openTime, setting.closeTime)
      ) {
        return {
          ok: false,
          message: `Antrian hari ini hanya dapat diambil pukul ${setting.openTime}–${setting.closeTime}.`,
        };
      }

      if (
        effectiveDateKey !== parsed.data.queueDate &&
        (effectiveDateKey < today || effectiveDateKey > addDaysToDateKey(today, 7))
      ) {
        return {
          ok: false,
          message: "Tanggal antrian harus hari ini hingga maksimal 7 hari ke depan.",
        };
      }

      const vehicle = await transaction.vehicle.findFirst({
        where: { id: parsed.data.vehicleId, ownerId: userId },
        select: { id: true },
      });
      if (!vehicle) {
        return { ok: false, message: "Kendaraan tidak ditemukan." };
      }

      const serviceType = await transaction.serviceType.findFirst({
        where: { id: parsed.data.serviceTypeId, isActive: true },
        select: { id: true },
      });
      if (!serviceType) {
        return { ok: false, message: "Jenis servis tidak tersedia." };
      }

      const existingReservation =
        await transaction.activeVehicleQueue.findUnique({
          where: {
            vehicleId_queueDate: {
              vehicleId: vehicle.id,
              queueDate,
            },
          },
          select: { ticketId: true },
        });
      if (existingReservation) {
        return {
          ok: false,
          message: "Kendaraan ini sudah memiliki antrian aktif pada tanggal tersebut.",
        };
      }

      const ticketCount = await transaction.queueTicket.count({
        where: { queueDate },
      });
      const pendingRequestCount =
        await transaction.activeVehicleQueue.count({
          where: { queueDate, requestId: { not: null } },
        });
      if (ticketCount + pendingRequestCount >= setting.dailyQuota) {
        return { ok: false, message: "Kuota antrian pada tanggal tersebut sudah penuh." };
      }

      const queueNumber = await allocateQueueNumber(transaction, queueDate);
      if (isAfterHoursRequest) {
        const request = await transaction.queueRequest.create({
          data: {
            queueNumber,
            queueDate,
            customerId: userId,
            vehicleId: vehicle.id,
            serviceTypeId: serviceType.id,
            complaint: parsed.data.complaint,
          },
          select: { id: true },
        });
        await transaction.activeVehicleQueue.create({
          data: {
            vehicleId: vehicle.id,
            queueDate,
            requestId: request.id,
          },
        });

        return {
          ok: true,
          requestId: request.id,
          queueNumber,
          message: `Permintaan antrian besok dengan nomor ${queueNumber} dikirim dan menunggu persetujuan admin.`,
        };
      }

      const ticket = await transaction.queueTicket.create({
        data: {
          queueNumber,
          queueDate,
          customerId: userId,
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          complaint: parsed.data.complaint,
          source: "ONLINE",
        },
        select: { id: true },
      });

      await transaction.activeVehicleQueue.create({
        data: {
          vehicleId: vehicle.id,
          queueDate,
          ticketId: ticket.id,
        },
      });
      await transaction.queueStatusLog.create({
        data: {
          ticketId: ticket.id,
          fromStatus: null,
          toStatus: "WAITING",
          changedById: userId,
        },
      });

      return {
        ok: true,
        message: "Antrian berhasil diambil.",
        ticketId: ticket.id,
        queueNumber,
      };
    });
    if (result.ok) {
      revalidatePath("/customer");
      revalidatePath("/customer/riwayat");
      revalidatePath("/admin/antrian");
    }
    return result;
  } catch (error) {
    if (isKnownError(error, "P2002")) {
      return {
        ok: false,
        message: "Kendaraan sudah memiliki antrian atau nomor sedang dibuat. Silakan coba lagi.",
      };
    }
    if (isKnownError(error, "P2034")) {
      return {
        ok: false,
        message: "Ada permintaan bersamaan. Silakan coba ambil antrian kembali.",
      };
    }
    throw error;
  }
}

export async function cancelCustomerQueueTicket(
  ticketId: string,
): Promise<ActionResult> {
  const userId = await getCustomerUserId();
  if (!userId) {
    return { ok: false, message: "Sesi pelanggan tidak valid. Silakan masuk kembali." };
  }
  if (!resourceIdSchema.safeParse(ticketId).success) {
    return { ok: false, message: "ID antrian tidak valid." };
  }

  const ticket = await prisma.queueTicket.findFirst({
    where: { id: ticketId, customerId: userId },
    select: { id: true },
  });
  if (!ticket) {
    return { ok: false, message: "Antrian tidak ditemukan." };
  }

  const result = await prisma.$transaction((transaction) =>
    transitionQueueTicket(transaction, ticket.id, "CANCELLED", userId),
  );
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "NOT_FOUND"
          ? "Antrian tidak ditemukan."
          : "Antrian hanya dapat dibatalkan saat berstatus Menunggu.",
    };
  }

  revalidatePath("/customer");
  revalidatePath("/customer/riwayat");
  revalidatePath(`/customer/riwayat/${ticket.id}`);
  return { ok: true, message: "Antrian berhasil dibatalkan." };
}
