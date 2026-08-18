-- Rework online_redemption to attribute by the IJW promotion id instead of a
-- coupon code. Safe: no online redemptions have been imported yet.

-- AlterTable
ALTER TABLE "online_redemption" ADD COLUMN "promotion_id" TEXT;
ALTER TABLE "online_redemption" ALTER COLUMN "coupon_code" DROP NOT NULL;

-- Replace the old coupon-code based unique and index
DROP INDEX "online_redemption_order_number_coupon_code_key";
DROP INDEX "online_redemption_coupon_code_order_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "online_redemption_order_number_promotion_id_key" ON "online_redemption"("order_number", "promotion_id");

-- CreateIndex
CREATE INDEX "online_redemption_promotion_id_order_date_idx" ON "online_redemption"("promotion_id", "order_date");

-- CreateIndex
CREATE INDEX "online_redemption_coupon_id_order_date_idx" ON "online_redemption"("coupon_id", "order_date");
