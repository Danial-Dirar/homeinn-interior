-- CreateTable
CREATE TABLE "ClientLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logoId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClientLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientLogo_name_key" ON "ClientLogo"("name");

-- AddForeignKey
ALTER TABLE "ClientLogo" ADD CONSTRAINT "ClientLogo_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
