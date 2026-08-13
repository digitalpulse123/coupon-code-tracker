-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('daily', 'email_limited');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('percentage', 'fixed', 'threshold', 'multibuy', 'bogof', 'bogohp', 'free_gift');

-- CreateEnum
CREATE TYPE "FulfilmentGroup" AS ENUM ('guaranteed', 'click_collect', 'click_reserve');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('online', 'instore');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'viewer');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('csv', 'metorik_api');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete');

-- CreateTable
CREATE TABLE "coupon" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CouponType",
    "campaign" TEXT,
    "valid_online" BOOLEAN NOT NULL,
    "valid_instore" BOOLEAN NOT NULL,
    "offer_type" "OfferType",
    "offer_value" DECIMAL(10,2),
    "min_spend" DECIMAL(10,2),
    "multibuy_qty" INTEGER,
    "multibuy_pay_qty" INTEGER,
    "gift_sku" TEXT,
    "starts_on" DATE,
    "ends_on" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_alias" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "source_value" TEXT NOT NULL,

    CONSTRAINT "store_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_redemption" (
    "id" UUID NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "coupon_id" UUID,
    "order_number" TEXT NOT NULL,
    "order_date" TIMESTAMPTZ(6) NOT NULL,
    "order_total" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "shipping_method_raw" TEXT,
    "fulfilment_group" "FulfilmentGroup",
    "store_id" UUID,
    "is_refunded" BOOLEAN NOT NULL DEFAULT false,
    "import_batch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instore_redemption" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "redeemed_on" DATE NOT NULL,
    "store_id" UUID NOT NULL,
    "transaction_total" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2),
    "receipt_ref" TEXT,
    "items_text" TEXT,
    "entered_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "instore_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_line_item" (
    "id" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "online_redemption_id" UUID,
    "instore_redemption_id" UUID,
    "product_name" TEXT,
    "sku" TEXT,
    "quantity" INTEGER,
    "line_value" DECIMAL(10,2),

    CONSTRAINT "redemption_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch" (
    "id" UUID NOT NULL,
    "source" "ImportSource" NOT NULL,
    "range_from" DATE,
    "range_to" DATE,
    "rows_read" INTEGER NOT NULL DEFAULT 0,
    "rows_created" INTEGER NOT NULL DEFAULT 0,
    "rows_updated" INTEGER NOT NULL DEFAULT 0,
    "rows_skipped" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL,
    "error_detail" TEXT,
    "run_by" UUID,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "store_name_key" ON "store"("name");

-- CreateIndex
CREATE UNIQUE INDEX "store_short_code_key" ON "store"("short_code");

-- CreateIndex
CREATE UNIQUE INDEX "store_alias_source_value_key" ON "store_alias"("source_value");

-- CreateIndex
CREATE INDEX "online_redemption_order_date_idx" ON "online_redemption"("order_date");

-- CreateIndex
CREATE INDEX "online_redemption_coupon_code_order_date_idx" ON "online_redemption"("coupon_code", "order_date");

-- CreateIndex
CREATE INDEX "online_redemption_store_id_order_date_idx" ON "online_redemption"("store_id", "order_date");

-- CreateIndex
CREATE UNIQUE INDEX "online_redemption_order_number_coupon_code_key" ON "online_redemption"("order_number", "coupon_code");

-- CreateIndex
CREATE INDEX "instore_redemption_coupon_id_redeemed_on_idx" ON "instore_redemption"("coupon_id", "redeemed_on");

-- CreateIndex
CREATE INDEX "instore_redemption_store_id_redeemed_on_idx" ON "instore_redemption"("store_id", "redeemed_on");

-- CreateIndex
CREATE INDEX "redemption_line_item_online_redemption_id_idx" ON "redemption_line_item"("online_redemption_id");

-- CreateIndex
CREATE INDEX "redemption_line_item_instore_redemption_id_idx" ON "redemption_line_item"("instore_redemption_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "store_alias" ADD CONSTRAINT "store_alias_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_redemption" ADD CONSTRAINT "online_redemption_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_redemption" ADD CONSTRAINT "online_redemption_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_redemption" ADD CONSTRAINT "online_redemption_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instore_redemption" ADD CONSTRAINT "instore_redemption_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instore_redemption" ADD CONSTRAINT "instore_redemption_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instore_redemption" ADD CONSTRAINT "instore_redemption_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_line_item" ADD CONSTRAINT "redemption_line_item_online_redemption_id_fkey" FOREIGN KEY ("online_redemption_id") REFERENCES "online_redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_line_item" ADD CONSTRAINT "redemption_line_item_instore_redemption_id_fkey" FOREIGN KEY ("instore_redemption_id") REFERENCES "instore_redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_run_by_fkey" FOREIGN KEY ("run_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: a coupon must be valid on at least one channel (SPEC section 5)
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_channel_validity_check"
    CHECK ("valid_online" OR "valid_instore");

-- CheckConstraint: multibuy pay quantity must be present and less than the deal quantity (SPEC section 5)
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_multibuy_qty_check"
    CHECK (
        "offer_type" <> 'multibuy'
        OR ("multibuy_qty" IS NOT NULL AND "multibuy_pay_qty" IS NOT NULL AND "multibuy_pay_qty" < "multibuy_qty")
    );

-- CheckConstraint: in-store discount cannot exceed the transaction total (instore_redemption validation)
ALTER TABLE "instore_redemption" ADD CONSTRAINT "instore_discount_not_over_total_check"
    CHECK ("discount_amount" IS NULL OR "discount_amount" <= "transaction_total");

-- CheckConstraint: a line item belongs to exactly one redemption, online xor in-store (SPEC section 5)
ALTER TABLE "redemption_line_item" ADD CONSTRAINT "line_item_single_parent_check"
    CHECK (
        ("online_redemption_id" IS NOT NULL)::int + ("instore_redemption_id" IS NOT NULL)::int = 1
    );

