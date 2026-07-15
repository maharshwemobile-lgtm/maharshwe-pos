const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requirePermission, requireWritableSubscription } = require('./auth-api');

const UPLOAD_ROOT = path.resolve(process.env.PRODUCT_UPLOAD_ROOT || path.join(process.cwd(), 'uploads', 'products'));
const PUBLIC_PREFIX = '/uploads/products';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

class CommerceError extends Error { constructor(status, message) { super(message); this.status = status; } }
const wrap = (fn) => async (req, res) => { try { await fn(req, res); } catch (e) { console.error(e); res.status(e.status || 500).json({ ok: false, message: e.message }); } };
const text = (v) => v == null ? null : String(v).trim() || null;
const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
const stockStatus = (qty, low) => Number(qty) <= 0 ? 'out_of_stock' : Number(qty) <= Number(low || 0) ? 'low_stock' : 'in_stock';

async function productCommerce(productId, shopId) {
  const rows = await prisma.$queryRawUnsafe(`SELECT id::text, slug, description, primary_image_url AS "primaryImageUrl", gallery_images AS "galleryImages", is_published_online AS "isPublishedOnline" FROM products WHERE id=$1::uuid AND shop_id=$2::uuid`, productId, shopId);
  if (!rows.length) throw new CommerceError(404, 'Product not found');
  return rows[0];
}

function attachProductCommerceApi(app) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  app.use(PUBLIC_PREFIX, express.static(UPLOAD_ROOT));

  const write = [requireAuth, requireShopUser, requireWritableSubscription, requirePermission('inventory')];

  app.get('/api/products/:id/commerce', requireAuth, requireShopUser, wrap(async (req,res)=>res.json({ok:true, commerce: await productCommerce(req.params.id, req.auth.shopId)})));

  app.patch('/api/products/:id/commerce', ...write, wrap(async(req,res)=>{
    const current = await productCommerce(req.params.id, req.auth.shopId);
    const slug = req.body.slug === undefined ? current.slug : slugify(req.body.slug);
    await prisma.$executeRawUnsafe(`UPDATE products SET slug=$1, description=$2, is_published_online=$3, updated_at=NOW() WHERE id=$4::uuid AND shop_id=$5::uuid`, slug || null, text(req.body.description), Boolean(req.body.isPublishedOnline), req.params.id, req.auth.shopId);
    res.json({ok:true, commerce: await productCommerce(req.params.id, req.auth.shopId)});
  }));

  app.get('/api/public/shops/:shopSlug/products', wrap(async(req,res)=>{
    const rows = await prisma.$queryRawUnsafe(`SELECT p.slug,p.name,p.brand,p.model,p.description,p.primary_image_url AS "primaryImageUrl",p.gallery_images AS "galleryImages",pv.id::text AS "productVariantId",pv.variant_name AS "variantName",pv.standard_selling_price AS "sellingPrice",COALESCE(ib.quantity,0) AS "availableQty",COALESCE(ib.min_alert_quantity,0) AS "lowStockThreshold",c.name AS category FROM shops s JOIN products p ON p.shop_id=s.id JOIN product_variants pv ON pv.product_id=p.id LEFT JOIN categories c ON c.id=COALESCE(pv.category_id,p.category_id) LEFT JOIN inventory_balances ib ON ib.product_variant_id=pv.id WHERE s.slug=$1 AND p.active=true AND p.is_published_online=true AND pv.active=true`, req.params.shopSlug);
    res.json({success:true, products: rows.map(p=>({...p, sellingPrice:Number(p.sellingPrice||0), stockStatus:stockStatus(p.availableQty,p.lowStockThreshold)}))});
  }));
}
module.exports = attachProductCommerceApi;
