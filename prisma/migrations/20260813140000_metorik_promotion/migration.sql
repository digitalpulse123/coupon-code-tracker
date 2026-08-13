-- CreateTable
CREATE TABLE "metorik_promotion" (
    "id" UUID NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "coupon_id" UUID,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "sample_products" TEXT,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metorik_promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metorik_promotion_promotion_id_key" ON "metorik_promotion"("promotion_id");

-- CreateIndex
CREATE INDEX "metorik_promotion_coupon_id_idx" ON "metorik_promotion"("coupon_id");

-- AddForeignKey
ALTER TABLE "metorik_promotion" ADD CONSTRAINT "metorik_promotion_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
