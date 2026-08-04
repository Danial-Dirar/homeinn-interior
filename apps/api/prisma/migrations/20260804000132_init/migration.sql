-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('CONTACT', 'CONSULTATION', 'QUOTE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "blurhash" TEXT,
    "altEn" TEXT NOT NULL,
    "altBn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seo" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleBn" TEXT,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "ogImageId" TEXT,

    CONSTRAINT "Seo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryBn" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyBn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "coverId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "seoId" TEXT,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkingArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "clientName" TEXT,
    "locationEn" TEXT NOT NULL,
    "locationBn" TEXT NOT NULL,
    "areaSqft" INTEGER,
    "year" INTEGER,
    "descriptionEn" TEXT NOT NULL,
    "descriptionBn" TEXT NOT NULL,
    "workingAreaId" TEXT NOT NULL,
    "coverId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoId" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateClient" (
    "id" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isFlagship" BOOLEAN NOT NULL DEFAULT false,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CorporateClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentialClient" (
    "id" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "publiclyListed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ResidentialClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "issuer" TEXT,
    "reference" TEXT,
    "documentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroSegment" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "imageId" TEXT NOT NULL,
    "foregroundId" TEXT,
    "labelEn" TEXT NOT NULL,
    "labelBn" TEXT NOT NULL,
    "captionEn" TEXT,
    "captionBn" TEXT,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HeroSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "excerptEn" TEXT NOT NULL,
    "excerptBn" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyBn" TEXT NOT NULL,
    "coverId" TEXT,
    "tags" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "seoId" TEXT,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "roleEn" TEXT,
    "roleBn" TEXT,
    "quoteEn" TEXT NOT NULL,
    "quoteBn" TEXT NOT NULL,
    "rating" INTEGER,
    "avatarId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleEn" TEXT NOT NULL,
    "roleBn" TEXT NOT NULL,
    "bioEn" TEXT,
    "bioBn" TEXT,
    "photoId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "serviceId" TEXT,
    "sourcePath" TEXT,
    "locale" TEXT NOT NULL,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressEn" TEXT NOT NULL,
    "addressBn" TEXT NOT NULL,
    "hoursEn" TEXT NOT NULL,
    "hoursBn" TEXT NOT NULL,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "establishedYear" INTEGER NOT NULL,
    "corporateProjectCount" INTEGER NOT NULL,
    "residentialProjectCount" INTEGER NOT NULL,
    "districtCount" INTEGER NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceGallery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceGallery_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectGallery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectGallery_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_seoId_key" ON "Service"("seoId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingArea_slug_key" ON "WorkingArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_seoId_key" ON "Project"("seoId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_seoId_key" ON "BlogPost"("seoId");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "_ServiceGallery_B_index" ON "_ServiceGallery"("B");

-- CreateIndex
CREATE INDEX "_ProjectGallery_B_index" ON "_ProjectGallery"("B");

-- AddForeignKey
ALTER TABLE "Seo" ADD CONSTRAINT "Seo_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "Seo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workingAreaId_fkey" FOREIGN KEY ("workingAreaId") REFERENCES "WorkingArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "Seo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroSegment" ADD CONSTRAINT "HeroSegment_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroSegment" ADD CONSTRAINT "HeroSegment_foregroundId_fkey" FOREIGN KEY ("foregroundId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "Seo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceGallery" ADD CONSTRAINT "_ServiceGallery_A_fkey" FOREIGN KEY ("A") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceGallery" ADD CONSTRAINT "_ServiceGallery_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectGallery" ADD CONSTRAINT "_ProjectGallery_A_fkey" FOREIGN KEY ("A") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectGallery" ADD CONSTRAINT "_ProjectGallery_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
