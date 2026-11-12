"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  assignAdminMechanic,
  callNextAdminTicket,
  createAdminUser,
  createAdminWalkIn,
  deleteAdminUser,
  deleteAdminService,
  resetAdminUserPassword,
  saveAdminService,
  saveWorkshopSettings,
  setAdminTicketStatus,
  setAdminUserActive,
  updateAdminUser,
} from "@/app/admin/actions";
import type { ActionResult } from "@/lib/actions";
import type { QueueStatus } from "@/lib/queue/status";

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p
      className={`text-sm ${result.ok ? "text-emerald-300" : "text-rose-300"}`}
      role="status"
    >
      {result.message}
    </p>
  );
}

function useActionResult() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    setResult(null);
    try {
      const response = await action();
      setResult(response);
      if (response.ok) router.refresh();
      return response;
    } finally {
      setPending(false);
    }
  }

  return { result, pending, run };
}

function stringValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function AdminUserCreateForm() {
  const { result, pending, run } = useActionResult();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await run(() =>
      createAdminUser({
        name: stringValue(data, "name"),
        email: stringValue(data, "email"),
        phone: stringValue(data, "phone"),
        role: stringValue(data, "role"),
        password: stringValue(data, "password"),
      }),
    );
    if (response.ok) form.reset();
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <label className="text-sm">
        Nama
        <input required name="name" minLength={2} maxLength={80} className={inputClass} />
      </label>
      <label className="text-sm">
        Email
        <input required name="email" type="email" maxLength={254} className={inputClass} />
      </label>
      <label className="text-sm">
        No. HP
        <input name="phone" className={inputClass} />
      </label>
      <label className="text-sm">
        Peran
        <select name="role" className={inputClass}>
          <option value="MECHANIC">Mekanik</option>
          <option value="CUSTOMER">Customer</option>
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        Kata sandi awal (minimal 8 karakter)
        <input required name="password" type="password" minLength={8} maxLength={128} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={primaryButton}>
          {pending ? "Menyimpan..." : "Buat akun"}
        </button>
        <Feedback result={result} />
      </div>
    </form>
  );
}

export function AdminUserItem({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "CUSTOMER" | "MECHANIC";
    isActive: boolean;
  };
}) {
  const { result, pending, run } = useActionResult();

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(() =>
      updateAdminUser(user.id, {
        name: stringValue(data, "name"),
        email: stringValue(data, "email"),
        phone: stringValue(data, "phone"),
      }),
    );
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await run(() =>
      resetAdminUserPassword({
        userId: user.id,
        password: stringValue(data, "password"),
      }),
    );
    if (response.ok) form.reset();
  }

  return (
    <article className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">{user.name}</p>
          <p className="text-xs text-slate-400">
            {user.role === "MECHANIC" ? "Mekanik" : "Customer"} ·{" "}
            {user.isActive ? "Aktif" : "Nonaktif"}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void run(() => setAdminUserActive(user.id, !user.isActive))
          }
          className="min-h-10 rounded-lg border border-slate-700 px-3 text-sm hover:border-amber-400"
        >
          {user.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Hapus akun ${user.email}? Tindakan ini tidak dapat dibatalkan.`)) {
              void run(() => deleteAdminUser(user.id));
            }
          }}
          className={dangerButton}
        >
          Hapus akun
        </button>
      </div>
      <form className="grid gap-3 sm:grid-cols-3" onSubmit={update}>
        <label className="text-sm">
          Nama
          <input required name="name" defaultValue={user.name} className={inputClass} />
        </label>
        <label className="text-sm">
          Email
          <input required name="email" type="email" defaultValue={user.email} className={inputClass} />
        </label>
        <label className="text-sm">
          No. HP
          <input name="phone" defaultValue={user.phone ?? ""} className={inputClass} />
        </label>
        <button disabled={pending} className={secondaryButton}>Simpan data akun</button>
      </form>
      <form className="flex flex-wrap items-end gap-3" onSubmit={resetPassword}>
        <label className="text-sm">
          Kata sandi baru
          <input required name="password" type="password" minLength={8} maxLength={128} className={inputClass} />
        </label>
        <button disabled={pending} className={secondaryButton}>Reset kata sandi</button>
      </form>
      <Feedback result={result} />
      <p className="text-xs text-slate-500">
        Penghapusan permanen hanya tersedia jika akun belum memiliki riwayat antrian; akun ber-riwayat dapat dinonaktifkan.
      </p>
    </article>
  );
}

export function AdminServiceForm({
  service,
}: {
  service?: {
    id: string;
    name: string;
    estimatedMinutes: number;
    basePrice: number;
    isActive: boolean;
  };
}) {
  const { result, pending, run } = useActionResult();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await run(() =>
      saveAdminService({
        id: service?.id,
        name: stringValue(data, "name"),
        estimatedMinutes: Number(stringValue(data, "estimatedMinutes")),
        basePrice: Number(stringValue(data, "basePrice")),
        isActive: stringValue(data, "isActive") === "on",
      }),
    );
    if (!service && response.ok) form.reset();
  }

  async function remove() {
    if (!service || !window.confirm(`Hapus jenis servis "${service.name}"?`)) return;
    await run(() => deleteAdminService(service.id));
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <label className="text-sm sm:col-span-2">
        Nama jenis servis
        <input required name="name" defaultValue={service?.name} minLength={2} maxLength={80} className={inputClass} />
      </label>
      <label className="text-sm">
        Estimasi durasi (menit)
        <input required name="estimatedMinutes" type="number" min={1} max={1440} defaultValue={service?.estimatedMinutes ?? 30} className={inputClass} />
      </label>
      <label className="text-sm">
        Harga dasar (rupiah)
        <input required name="basePrice" type="number" min={0} max={1000000000} defaultValue={service?.basePrice ?? 0} className={inputClass} />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="isActive" type="checkbox" defaultChecked={service?.isActive ?? true} />
        Layanan aktif dan dapat dipilih customer
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button disabled={pending} className={primaryButton}>
          {service ? "Simpan perubahan" : "Tambah jenis servis"}
        </button>
        {service ? (
          <button type="button" disabled={pending} onClick={() => void remove()} className={dangerButton}>
            Hapus
          </button>
        ) : null}
        <Feedback result={result} />
      </div>
    </form>
  );
}

export function WorkshopSettingsForm({
  settings,
  holidays,
}: {
  settings: { openTime: string; closeTime: string; dailyQuota: number };
  holidays: string[];
}) {
  const { result, pending, run } = useActionResult();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(() =>
      saveWorkshopSettings({
        openTime: stringValue(data, "openTime"),
        closeTime: stringValue(data, "closeTime"),
        dailyQuota: Number(stringValue(data, "dailyQuota")),
        holidays: stringValue(data, "holidays")
          .split(/\r?\n/)
          .map((date) => date.trim())
          .filter(Boolean),
      }),
    );
  }

  return (
    <form className="max-w-2xl space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          Jam buka
          <input required name="openTime" type="time" defaultValue={settings.openTime} className={inputClass} />
        </label>
        <label className="text-sm">
          Jam tutup
          <input required name="closeTime" type="time" defaultValue={settings.closeTime} className={inputClass} />
        </label>
        <label className="text-sm">
          Kuota harian
          <input required name="dailyQuota" type="number" min={1} max={1000} defaultValue={settings.dailyQuota} className={inputClass} />
        </label>
      </div>
      <label className="block text-sm">
        Hari libur (satu tanggal YYYY-MM-DD per baris)
        <textarea name="holidays" rows={6} defaultValue={holidays.join("\n")} className={inputClass} />
      </label>
      <p className="text-xs text-slate-400">
        Perubahan berlaku untuk pengambilan antrian berikutnya. Nomor yang sudah terbit tidak dihapus.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={primaryButton}>
          {pending ? "Menyimpan..." : "Simpan pengaturan"}
        </button>
        <Feedback result={result} />
      </div>
    </form>
  );
}

export function AdminWalkInForm({
  customers,
  vehicles,
  services,
}: {
  customers: { id: string; name: string; email: string }[];
  vehicles: { id: string; plateNumber: string; ownerId: string; ownerName: string }[];
  services: { id: string; name: string }[];
}) {
  const { result, pending, run } = useActionResult();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const availableVehicles = vehicles.filter(
    (vehicle) => vehicle.ownerId === selectedCustomerId,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await run(() =>
      createAdminWalkIn({
        customerId: stringValue(data, "customerId"),
        vehicleId: stringValue(data, "vehicleId"),
        serviceTypeId: stringValue(data, "serviceTypeId"),
        complaint: stringValue(data, "complaint"),
      }),
    );
    if (response.ok) {
      form.reset();
      setSelectedCustomerId("");
    }
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <label className="text-sm">
        Customer
        <select
          name="customerId"
          required
          value={selectedCustomerId}
          onChange={(event) => setSelectedCustomerId(event.target.value)}
          className={inputClass}
        >
          <option value="">Pilih customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Kendaraan terdaftar
        <select name="vehicleId" required className={inputClass}>
          <option value="">Pilih kendaraan</option>
          {availableVehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber} · {vehicle.ownerName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Jenis servis
        <select name="serviceTypeId" required className={inputClass}>
          <option value="">Pilih jenis servis</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Keluhan
        <input required name="complaint" minLength={5} maxLength={1000} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending || customers.length === 0 || availableVehicles.length === 0 || services.length === 0} className={primaryButton}>
          {pending ? "Membuat antrian..." : "Buat antrian walk-in"}
        </button>
        <Feedback result={result} />
      </div>
      {customers.length === 0 || vehicles.length === 0 ? (
        <p className="text-xs text-amber-200 sm:col-span-2">
          Walk-in membutuhkan data customer dan kendaraan yang sudah terdaftar.
        </p>
      ) : selectedCustomerId && availableVehicles.length === 0 ? (
        <p className="text-xs text-amber-200 sm:col-span-2">
          Customer ini belum memiliki kendaraan terdaftar.
        </p>
      ) : null}
    </form>
  );
}

export function CallNextButton() {
  const { result, pending, run } = useActionResult();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={pending} onClick={() => void run(callNextAdminTicket)} className={primaryButton}>
        {pending ? "Memanggil..." : "Panggil nomor berikutnya"}
      </button>
      <Feedback result={result} />
    </div>
  );
}

export function AdminQueueActions({
  ticketId,
  status,
  mechanics,
  assignedMechanicId,
}: {
  ticketId: string;
  status: QueueStatus;
  mechanics: { id: string; name: string }[];
  assignedMechanicId: string | null;
}) {
  const { result, pending, run } = useActionResult();
  const [mechanicId, setMechanicId] = useState(assignedMechanicId ?? "");
  const active = ["WAITING", "CALLED", "IN_PROGRESS"].includes(status);

  return (
    <div className="space-y-3">
      {active ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (mechanicId) {
              void run(() => assignAdminMechanic({ ticketId, mechanicId }));
            }
          }}
        >
          <select
            value={mechanicId}
            onChange={(event) => setMechanicId(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm"
          >
            <option value="">Pilih mekanik</option>
            {mechanics.map((mechanic) => (
              <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
            ))}
          </select>
          <button disabled={pending || mechanics.length === 0} className={secondaryButton}>Tugaskan</button>
          {status === "WAITING" || status === "CALLED" ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Tandai antrian ini sebagai tidak hadir?")) {
                    void run(() =>
                      setAdminTicketStatus({ ticketId, status: "NO_SHOW" }),
                    );
                  }
                }}
                className={secondaryButton}
              >
                Tandai tidak hadir
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Batalkan antrian ini?")) {
                    void run(() => setAdminTicketStatus({ ticketId, status: "CANCELLED" }));
                  }
                }}
                className={dangerButton}
              >
                Batalkan
              </button>
            </>
          ) : null}
        </form>
      ) : null}
      <Feedback result={result} />
    </div>
  );
}

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none focus:border-amber-400";
const primaryButton =
  "min-h-11 rounded-lg bg-amber-400 px-4 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "min-h-10 rounded-lg border border-slate-700 px-3 text-sm font-semibold hover:border-amber-400 disabled:opacity-60";
const dangerButton =
  "min-h-10 rounded-lg border border-rose-900 px-3 text-sm font-semibold text-rose-200 hover:border-rose-500 disabled:opacity-60";
