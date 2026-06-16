-- Phase 10 supplier and purchase order foundation

CREATE TABLE "suppliers" (
  "id" UUID NOT NULL,
  "shop_id" UUID NOT NULL,
  "supplier_code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE,
  CONSTRAINT "suppliers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "suppliers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "suppliers_shop_id_supplier_code_key" UNIQUE ("shop_id", "supplier_code")
);

CREATE INDEX "suppliers_shop_id_active_name_idx" ON "suppliers"("shop_id", "active", "name");
