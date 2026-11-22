// prisma/seed.ts
// Seeds the initial categories and demo data for MS2
// Run with: npm run db:seed

import { PrismaClient, OfferStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MS2 database...');

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { slug: 'bakeries',           name_fr: 'Boulangeries',                name_ar: 'مخابز',              icon: '🥖', sort_order: 1 },
    { slug: 'restaurants',        name_fr: 'Restaurants',                 name_ar: 'مطاعم',              icon: '🍽️', sort_order: 2 },
    { slug: 'fruits-vegetables',  name_fr: 'Fruits et légumes',           name_ar: 'فواكه وخضروات',     icon: '🥦', sort_order: 3 },
    { slug: 'groceries',          name_fr: 'Épicerie et conserves',       name_ar: 'بقالة ومعلبات',     icon: '🛒', sort_order: 4 },
    { slug: 'near-expiry',        name_fr: 'Produits proches de la DLUO', name_ar: 'منتجات قرب انتهاء صلاحيتها', icon: '⏰', sort_order: 5 },
    { slug: 'supermarkets',       name_fr: 'Supermarchés',               name_ar: 'سوبرماركت',          icon: '🏪', sort_order: 6 },
    { slug: 'clothing',           name_fr: 'Vêtements',                  name_ar: 'ملابس',              icon: '👕', sort_order: 7 },
    { slug: 'shoes',              name_fr: 'Chaussures',                 name_ar: 'أحذية',              icon: '👟', sort_order: 8 },
    { slug: 'other',              name_fr: 'Autre',                      name_ar: 'أخرى',               icon: '📦', sort_order: 9 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name_fr: cat.name_fr, name_ar: cat.name_ar, icon: cat.icon, sort_order: cat.sort_order },
      create: cat,
    });
  }
  console.log(`✅ ${categories.length} categories seeded.`);

  // ── Demo shop snapshot ─────────────────────────────────────────────────────
  // This represents a shop from MS1; in production this comes via RabbitMQ
  const demoShop = await prisma.shopSnapshot.upsert({
    where: { id: 'shop-demo-00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id:             'shop-demo-00000000-0000-0000-0000-000000000001',
      name:           'Boulangerie Al Baraka',
      address:        '12 Rue Didouche Mourad, Alger',
      latitude:       36.7372,
      longitude:      3.0865,
      status:         'ACTIVE',
      average_rating: 4.5,
      sales_count:    120,
      merchant_id:    'merchant-demo-00000000-0000-0000-0001',
    },
  });

  // ── Demo offers ───────────────────────────────────────────────────────────
  const bakeryCategory = await prisma.category.findUnique({ where: { slug: 'bakeries' } });
  const fruitCategory  = await prisma.category.findUnique({ where: { slug: 'fruits-vegetables' } });

  if (bakeryCategory && fruitCategory) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.offer.upsert({
      where: { id: 'offer-demo-00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id:                 'offer-demo-00000000-0000-0000-0000-000000000001',
        merchant_id:        'merchant-demo-00000000-0000-0000-0001',
        shop_id:            demoShop.id,
        category_id:        bakeryCategory.id,
        name:               'Panier de croissants du soir',
        description:        'Assortiment de croissants et viennoiseries invendus de la journée. Frais et délicieux.',
        original_price:     650,
        discounted_price:   250,
        discount_percent:   62,
        quantity_available: 5,
        quantity_initial:   5,
        expires_at:         tomorrow,
        status:             OfferStatus.ACTIVE,
        published_at:       new Date(),
      },
    });

    await prisma.offer.upsert({
      where: { id: 'offer-demo-00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id:                 'offer-demo-00000000-0000-0000-0000-000000000002',
        merchant_id:        'merchant-demo-00000000-0000-0000-0001',
        shop_id:            demoShop.id,
        category_id:        fruitCategory.id,
        name:               'Boîte de fraises fraîches',
        description:        'Fraises locales, légèrement trop mûres pour la vente standard. Idéales pour confitures.',
        original_price:     400,
        discounted_price:   150,
        discount_percent:   63,
        quantity_available: 10,
        quantity_initial:   10,
        expires_at:         tomorrow,
        status:             OfferStatus.ACTIVE,
        published_at:       new Date(),
      },
    });

    console.log('✅ Demo offers seeded.');
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
