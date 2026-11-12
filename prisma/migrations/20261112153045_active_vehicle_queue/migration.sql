-- CreateTable
CREATE TABLE "ActiveVehicleQueue" (
    "vehicleId" TEXT NOT NULL,
    "queueDate" DATETIME NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("vehicleId", "queueDate"),
    CONSTRAINT "ActiveVehicleQueue_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveVehicleQueue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "QueueTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveVehicleQueue_ticketId_key" ON "ActiveVehicleQueue"("ticketId");
