-- Phase 10 supplier and purchase order foundation

CREATE TABLE "suppliers" (
  "id" UUID NOT NULL,
  "shop_id" UUID NOT NULL,
  "supplier_code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
