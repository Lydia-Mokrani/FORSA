// prisma/seed.ts
// Seeds the initial categories and demo data for MS2
// Run with: npm run db:seed

import { PrismaClient, OfferStatus, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MS2 database...');

  // ── Categories (Strictly Food Products per FORSA requirements) ───────────
  const categories = [
    { slug: 'bakeries',           name_fr: 'Boulangeries et viennoiseries', name_ar: 'مخابز ومعجنات',              icon: '🥖', sort_order: 1 },
    { slug: 'fruits-vegetables',  name_fr: 'Fruits et légumes',             name_ar: 'فواكه وخضروات',              icon: '🥦', sort_order: 2 },
    { slug: 'dairy-eggs',         name_fr: 'Produits laitiers et œufs',     name_ar: 'منتجات الألبان والبيض',      icon: '🧀', sort_order: 3 },
    { slug: 'meat-fish',          name_fr: 'Viandes et poissons',           name_ar: 'لحوم وأسماك',                icon: '🥩', sort_order: 4 },
    { slug: 'prepared-meals',     name_fr: 'Plats préparés et traiteur',    name_ar: 'وجبات جاهزة ومأكولات',       icon: '🍽️', sort_order: 5 },
    { slug: 'groceries',          name_fr: 'Épicerie et conserves',         name_ar: 'بقالة ومعلبات',              icon: '🛒', sort_order: 6 },
    { slug: 'beverages',          name_fr: 'Boissons',                      name_ar: 'مشروبات',                    icon: '🧃', sort_order: 7 },
    { slug: 'other-food',         name_fr: 'Autres produits alimentaires',  name_ar: 'منتجات غذائية أخرى',          icon: '📦', sort_order: 8 },
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
    const now = new Date();

    // Offer 1: Same-day bakery items (expires end of today)
    const todayExpiry = new Date(now);
    todayExpiry.setUTCHours(23, 59, 59, 999);
    const todayDeadline = new Date(now);
    todayDeadline.setUTCHours(21, 0, 0, 0);

    // Offer 2: Fresh fruits (good for 2 more days)
    const tomorrowDeadline = new Date(now);
    tomorrowDeadline.setDate(tomorrowDeadline.getDate() + 1);
    tomorrowDeadline.setUTCHours(18, 0, 0, 0);
    const futureExpiry = new Date(now);
    futureExpiry.setDate(futureExpiry.getDate() + 2);
    futureExpiry.setUTCHours(23, 59, 59, 999);

    await prisma.offer.upsert({
      where: { id: 'offer-demo-00000000-0000-0000-0000-000000000001' },
      update: {
        product_expiry_date: todayExpiry,
        expires_at:          todayDeadline,
      },
      create: {
        id:                  'offer-demo-00000000-0000-0000-0000-000000000001',
        merchant_id:         'merchant-demo-00000000-0000-0000-0001',
        shop_id:             demoShop.id,
        category_id:         bakeryCategory.id,
        name:                'Panier de croissants du soir',
        description:         'Assortiment de croissants et viennoiseries invendus de la journée. Frais et délicieux.',
        product_type:        ProductType.FRESH,
        same_day_expiry:     true,
        original_price:      650,
        discounted_price:    250,
        discount_percent:    62,
        quantity_available:  5,
        quantity_initial:    5,
        expires_at:          todayDeadline,
        product_expiry_date: todayExpiry,
        status:              OfferStatus.ACTIVE,
        published_at:        now,
      },
    });

    await prisma.offer.upsert({
      where: { id: 'offer-demo-00000000-0000-0000-0000-000000000002' },
      update: {
        product_expiry_date: futureExpiry,
        expires_at:          tomorrowDeadline,
      },
      create: {
        id:                  'offer-demo-00000000-0000-0000-0000-000000000002',
        merchant_id:         'merchant-demo-00000000-0000-0000-0001',
        shop_id:             demoShop.id,
        category_id:         fruitCategory.id,
        name:                'Boîte de fraises fraîches',
        description:         'Fraises locales, légèrement trop mûres pour la vente standard. Idéales pour confitures.',
        product_type:        ProductType.FRESH,
        same_day_expiry:     false,
        original_price:      400,
        discounted_price:    150,
        discount_percent:    63,
        quantity_available:  10,
        quantity_initial:    10,
        expires_at:          tomorrowDeadline,
        product_expiry_date: futureExpiry,
        status:              OfferStatus.ACTIVE,
        published_at:        now,
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
