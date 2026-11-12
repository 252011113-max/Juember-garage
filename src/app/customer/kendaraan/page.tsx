import { Suspense } from "react";
import { DeleteVehicleButton } from "@/components/customer/delete-vehicle-button";
import { CustomerPageLoading } from "@/components/customer/page-loading";
import { VehicleForm, type EditableVehicle } from "@/components/customer/vehicle-form";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validation/customer";

export default function CustomerVehiclesPage() {
  return (
    <Suspense fallback={<CustomerPageLoading />}>
      <CustomerVehicles />
    </Suspense>
  );
}

async function CustomerVehicles() {
  const user = await requireRole("CUSTOMER");
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      plateNumber: true,
      type: true,
      brand: true,
      model: true,
      year: true,
      _count: { select: { tickets: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Data kendaraan
        </p>
        <h1 className="mt-2 text-3xl font-bold">Kendaraan saya</h1>
        <p className="mt-2 text-sm text-slate-400">
          Data kendaraan hanya dapat dilihat dan dikelola oleh pemiliknya.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-bold">Tambah kendaraan</h2>
        <VehicleForm />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Daftar kendaraan</h2>
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            Belum ada kendaraan. Tambahkan kendaraan untuk mengambil antrian.
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-bold text-amber-300">
                    {vehicle.plateNumber}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {vehicleSchema.shape.type.parse(vehicle.type) === "MOTOR"
                      ? "Motor"
                      : "Mobil"}{" "}
                    ·{" "}
                    {vehicle.brand} {vehicle.model} · {vehicle.year}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {vehicle._count.tickets} riwayat antrian
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <details className="group">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold hover:border-amber-400">
                      Ubah data
                    </summary>
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:min-w-[26rem]">
                      <VehicleForm
                        key={`${vehicle.id}-${vehicle.plateNumber}-${vehicle.brand}-${vehicle.model}-${vehicle.year}`}
                        vehicle={{
                          id: vehicle.id,
                          plateNumber: vehicle.plateNumber,
                          type: vehicleSchema.shape.type.parse(vehicle.type),
                          brand: vehicle.brand,
                          model: vehicle.model,
                          year: vehicle.year,
                        } satisfies EditableVehicle}
                      />
                    </div>
                  </details>
                  <DeleteVehicleButton vehicleId={vehicle.id} />
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
