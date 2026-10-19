-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "secondViewId" TEXT;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_secondViewId_fkey" FOREIGN KEY ("secondViewId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
