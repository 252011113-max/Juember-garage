import { z } from "zod";
import { resourceIdSchema } from "@/lib/validation/customer";
import { isValidDateKey } from "@/lib/queue/date";

const phonePattern = /^[+()\d -]{8,20}$/;

export const adminUserSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  email: z.string().trim().email("Masukkan email yang valid.").max(254),
  phone: z.union([
    z.literal(""),
    z.string().trim().regex(phonePattern, "Masukkan nomor HP yang valid."),
  ]),
  role: z.enum(["CUSTOMER", "MECHANIC"]),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128),
});

export const adminUserUpdateSchema = adminUserSchema.omit({
  role: true,
  password: true,
});

export const resetPasswordSchema = z.object({
  userId: resourceIdSchema,
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128),
});

export const serviceTypeSchema = z.object({
  id: resourceIdSchema.optional(),
  name: z.string().trim().min(2, "Nama layanan minimal 2 karakter.").max(80),
  estimatedMinutes: z.number().int().min(1).max(1440),
  basePrice: z.number().int().min(0).max(1_000_000_000),
  isActive: z.boolean(),
});

export const workshopSettingsSchema = z
  .object({
    openTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Jam buka tidak valid."),
    closeTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Jam tutup tidak valid."),
    dailyQuota: z.number().int().min(1).max(1000),
    holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  })
  .refine((value) => value.openTime < value.closeTime, {
    message: "Jam tutup harus setelah jam buka.",
    path: ["closeTime"],
  })
  .refine(
    (value) => value.holidays.every(isValidDateKey),
    { message: "Tanggal hari libur tidak valid.", path: ["holidays"] },
  );

export const walkInTicketSchema = z.object({
  customerId: resourceIdSchema,
  vehicleId: resourceIdSchema,
  serviceTypeId: resourceIdSchema,
  complaint: z.string().trim().min(5).max(1000),
});

export const assignMechanicSchema = z.object({
  ticketId: resourceIdSchema,
  mechanicId: resourceIdSchema,
});

export const ticketActionSchema = z.object({
  ticketId: resourceIdSchema,
  status: z.enum(["CANCELLED", "NO_SHOW"]),
});

export const queueRequestReviewSchema = z.object({
  requestId: resourceIdSchema,
  decision: z.enum(["APPROVE", "REJECT"]),
});
