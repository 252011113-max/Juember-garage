import { z } from "zod";

const phonePattern = /^[+()\d -]{8,20}$/;
const platePattern = /^[A-Z0-9][A-Z0-9 -]{1,14}$/;
const currentYear = new Date().getFullYear();

export const resourceIdSchema = z.string().cuid("ID data tidak valid.");

export const customerRegistrationSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
    email: z.string().trim().email("Masukkan email yang valid.").max(254),
    phone: z
      .string()
      .trim()
      .regex(phonePattern, "Masukkan nomor HP yang valid."),
    password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128),
    confirmPassword: z.string().min(1, "Ulangi kata sandi."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi kata sandi tidak sama.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Masukkan nomor HP yang valid."),
});

export const vehicleSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(platePattern, "Plat nomor tidak valid."),
  type: z.enum(["MOTOR", "CAR"], {
    error: "Pilih jenis kendaraan.",
  }),
  brand: z.string().trim().min(1, "Merek wajib diisi.").max(50),
  model: z.string().trim().min(1, "Model wajib diisi.").max(50),
  year: z
    .string()
    .regex(/^\d{4}$/, "Tahun harus terdiri dari 4 angka.")
    .refine(
      (value) => Number(value) >= 1900 && Number(value) <= currentYear + 1,
      "Tahun kendaraan tidak valid.",
    ),
});

export const queueTicketSchema = z.object({
  vehicleId: z.string().cuid("Pilih kendaraan yang valid."),
  serviceTypeId: z.string().cuid("Pilih jenis servis yang valid."),
  queueDate: z.string().refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Pilih tanggal antrian yang valid.",
  ),
  complaint: z
    .string()
    .trim()
    .min(5, "Keluhan minimal 5 karakter.")
    .max(1000, "Keluhan maksimal 1000 karakter."),
});

export type CustomerRegistrationInput = z.infer<
  typeof customerRegistrationSchema
>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type QueueTicketInput = z.infer<typeof queueTicketSchema>;
