-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QueueTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueNumber" TEXT NOT NULL,
    "queueDate" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "mechanicId" TEXT,
    "complaint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "partsUsed" TEXT NOT NULL DEFAULT '[]',
    "totalCost" INTEGER,
    "calledAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'ONLINE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QueueTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QueueTicket_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QueueTicket_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QueueTicket_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueueCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueDate" DATETIME NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QueueStatusLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueueStatusLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "QueueTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QueueStatusLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkshopSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "openTime" TEXT NOT NULL DEFAULT '08:00',
    "closeTime" TEXT NOT NULL DEFAULT '17:00',
    "dailyQuota" INTEGER NOT NULL DEFAULT 30,
    "holidays" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE INDEX "QueueTicket_queueDate_status_createdAt_idx" ON "QueueTicket"("queueDate", "status", "createdAt");

-- CreateIndex
CREATE INDEX "QueueTicket_customerId_queueDate_idx" ON "QueueTicket"("customerId", "queueDate");

-- CreateIndex
CREATE INDEX "QueueTicket_mechanicId_queueDate_status_idx" ON "QueueTicket"("mechanicId", "queueDate", "status");

-- CreateIndex
CREATE INDEX "QueueTicket_vehicleId_queueDate_status_idx" ON "QueueTicket"("vehicleId", "queueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QueueTicket_queueDate_queueNumber_key" ON "QueueTicket"("queueDate", "queueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QueueCounter_queueDate_key" ON "QueueCounter"("queueDate");

-- CreateIndex
CREATE INDEX "QueueStatusLog_ticketId_createdAt_idx" ON "QueueStatusLog"("ticketId", "createdAt");
