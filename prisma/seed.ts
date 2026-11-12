import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  dateFromDateKey,
  getWorkshopDateKey,
} from "../src/lib/queue/date";
import {
  isActiveQueueStatus,
  type QueueStatus,
} from "../src/lib/queue/status";

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "MECHANIC" | "CUSTOMER";
};

const seedUsers: SeedUser[] = [
  {
    name: "Admin Bengkel",
    email: "admin@bengkel.test",
    phone: "081200000001",
    role: "ADMIN",
  },
  {
    name: "Mekanik Andi",
    email: "mekanik1@bengkel.test",
    phone: "081200000002",
    role: "MECHANIC",
  },
  {
    name: "Mekanik Budi",
    email: "mekanik2@bengkel.test",
    phone: "081200000003",
    role: "MECHANIC",
  },
  {
    name: "Pelanggan Sari",
    email: "pelanggan1@bengkel.test",
    phone: "081200000004",
    role: "CUSTOMER",
  },
  {
    name: "Pelanggan Dimas",
    email: "pelanggan2@bengkel.test",
    phone: "081200000005",
    role: "CUSTOMER",
  },
  {
    name: "Pelanggan Rina",
    email: "pelanggan3@bengkel.test",
    phone: "081200000006",
    role: "CUSTOMER",
  },
];

const serviceTypes = [
  { name: "Ganti Oli", estimatedMinutes: 30, basePrice: 50000 },
  { name: "Servis Rutin", estimatedMinutes: 90, basePrice: 150000 },
  { name: "Tune Up", estimatedMinutes: 120, basePrice: 200000 },
  { name: "Ganti Ban", estimatedMinutes: 45, basePrice: 75000 },
  { name: "Servis Rem", estimatedMinutes: 60, basePrice: 100000 },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed data must not be created in production.");
  }

  const password = process.env.SEED_DEMO_PASSWORD ?? "Demo123!";
  const passwordHash = await bcrypt.hash(password, 12);
  const users = new Map<string, { id: string }>();

  for (const user of seedUsers) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        phone: user.phone,
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: { ...user, passwordHash },
      select: { id: true },
    });
    users.set(user.email, savedUser);
  }

  const vehicleData = [
    {
      ownerEmail: "pelanggan1@bengkel.test",
      plateNumber: "B 1234 SRI",
      type: "MOTOR",
      brand: "Honda",
      model: "Vario",
      year: 2022,
    },
    {
      ownerEmail: "pelanggan2@bengkel.test",
      plateNumber: "B 5678 DMS",
      type: "MOTOR",
      brand: "Yamaha",
      model: "NMAX",
      year: 2021,
    },
    {
      ownerEmail: "pelanggan3@bengkel.test",
      plateNumber: "B 9012 RIN",
      type: "CAR",
      brand: "Toyota",
      model: "Avanza",
      year: 2020,
    },
  ];
  const vehicles = new Map<string, { id: string }>();

  for (const vehicle of vehicleData) {
    const { ownerEmail, ...vehicleFields } = vehicle;
    const owner = users.get(ownerEmail);
    if (!owner) {
      throw new Error(`Missing seeded owner: ${ownerEmail}`);
    }

    const savedVehicle = await prisma.vehicle.upsert({
      where: { plateNumber: vehicleFields.plateNumber },
      update: { ...vehicleFields, ownerId: owner.id },
      create: { ...vehicleFields, ownerId: owner.id },
      select: { id: true },
    });
    vehicles.set(vehicleFields.plateNumber, savedVehicle);
  }

  const services = new Map<string, { id: string }>();
  for (const service of serviceTypes) {
    const savedService = await prisma.serviceType.upsert({
      where: { name: service.name },
      update: { ...service, isActive: true },
      create: service,
      select: { id: true },
    });
    services.set(service.name, savedService);
  }

  await prisma.workshopSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      openTime: "08:00",
      closeTime: "17:00",
      dailyQuota: 30,
      holidays: "[]",
    },
  });

  const now = new Date();
  const queueDate = dateFromDateKey(getWorkshopDateKey(now));
  const mechanicOne = users.get("mekanik1@bengkel.test");
  const mechanicTwo = users.get("mekanik2@bengkel.test");
  const admin = users.get("admin@bengkel.test");
  const samples: {
    number: string;
    customerEmail: string;
    plateNumber: string;
    serviceName: string;
    status: QueueStatus;
    mechanicId: string | null;
  }[] = [
    {
      number: "A-001",
      customerEmail: "pelanggan1@bengkel.test",
      plateNumber: "B 1234 SRI",
      serviceName: "Ganti Oli",
      status: "WAITING",
      mechanicId: null,
    },
    {
      number: "A-002",
      customerEmail: "pelanggan2@bengkel.test",
      plateNumber: "B 5678 DMS",
      serviceName: "Servis Rutin",
      status: "CALLED",
      mechanicId: mechanicOne?.id ?? null,
    },
    {
      number: "A-003",
      customerEmail: "pelanggan3@bengkel.test",
      plateNumber: "B 9012 RIN",
      serviceName: "Tune Up",
      status: "IN_PROGRESS",
      mechanicId: mechanicTwo?.id ?? null,
    },
    {
      number: "A-004",
      customerEmail: "pelanggan1@bengkel.test",
      plateNumber: "B 1234 SRI",
      serviceName: "Servis Rem",
      status: "DONE",
      mechanicId: mechanicOne?.id ?? null,
    },
    {
      number: "A-005",
      customerEmail: "pelanggan2@bengkel.test",
      plateNumber: "B 5678 DMS",
      serviceName: "Ganti Ban",
      status: "NO_SHOW",
      mechanicId: null,
    },
  ];

  for (const sample of samples) {
    const customer = users.get(sample.customerEmail);
    const vehicle = vehicles.get(sample.plateNumber);
    const service = services.get(sample.serviceName);
    if (!customer || !vehicle || !service || !admin) {
      throw new Error(`Missing related seed data for ${sample.number}`);
    }

    const ticket = await prisma.queueTicket.upsert({
      where: {
        queueDate_queueNumber: {
          queueDate,
          queueNumber: sample.number,
        },
      },
      update: {
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceTypeId: service.id,
        mechanicId: sample.mechanicId,
        status: sample.status,
        source: "ONLINE",
        calledAt: sample.status === "CALLED" ? now : null,
        startedAt:
          sample.status === "IN_PROGRESS" || sample.status === "DONE"
            ? now
            : null,
        finishedAt: sample.status === "DONE" ? now : null,
        totalCost: sample.status === "DONE" ? 100000 : null,
      },
      create: {
        queueNumber: sample.number,
        queueDate,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceTypeId: service.id,
        mechanicId: sample.mechanicId,
        complaint: "Pemeriksaan dan servis kendaraan.",
        status: sample.status,
        source: "ONLINE",
        calledAt: sample.status === "CALLED" ? now : null,
        startedAt:
          sample.status === "IN_PROGRESS" || sample.status === "DONE"
            ? now
            : null,
        finishedAt: sample.status === "DONE" ? now : null,
        totalCost: sample.status === "DONE" ? 100000 : null,
      },
      select: { id: true },
    });

    await prisma.queueStatusLog.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.queueStatusLog.create({
      data: {
        ticketId: ticket.id,
        fromStatus: null,
        toStatus: "WAITING",
        changedById: admin.id,
      },
    });
    if (sample.status !== "WAITING") {
      await prisma.queueStatusLog.create({
        data: {
          ticketId: ticket.id,
          fromStatus: "WAITING",
          toStatus: sample.status,
          changedById: admin.id,
        },
      });
    }

    if (isActiveQueueStatus(sample.status)) {
      await prisma.activeVehicleQueue.upsert({
        where: {
          vehicleId_queueDate: {
            vehicleId: vehicle.id,
            queueDate,
          },
        },
        update: { ticketId: ticket.id },
        create: {
          vehicleId: vehicle.id,
          queueDate,
          ticketId: ticket.id,
        },
      });
    } else {
      await prisma.activeVehicleQueue.deleteMany({
        where: { ticketId: ticket.id },
      });
    }
  }

  await prisma.queueCounter.upsert({
    where: { queueDate },
    update: { lastNumber: samples.length },
    create: { queueDate, lastNumber: samples.length },
  });

  console.log("Development seed data ready.");
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed development data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
