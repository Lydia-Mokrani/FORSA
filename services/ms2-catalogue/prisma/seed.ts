// prisma/seed.ts
// Seeds the database with 8 standard food categories and demo merchant data.
// Safe to re-run: uses upsert so existing data is not duplicated.

import { PrismaClient, ShopStatus, OfferStatus, ProductType } from '@prisma/client';
import { getAlgiersCalendarDate, getAlgiersEndOfDay } from '../src/utils/timezone';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'bakeries',          name_fr: 'Boulangeries & Pâtisseries', name_ar: 'مخابز وحلويات',          icon: 'croissant',  sort_order: 1 },
  { slug: 'fruits-vegetables', name_fr: 'Fruits & Légumes',           name_ar: 'فواكه وخضروات',          icon: 'apple',      sort_order: 2 },
  { slug: 'meals-catering',    name_fr: 'Repas & Traiteurs',          name_ar: 'وجبات وأطعمة جاهزة',     icon: 'utensils',   sort_order: 3 },
  { slug: 'groceries',         name_fr: 'Épicerie & Produits frais',  name_ar: 'بقالة ومنتجات طازجة',     icon: 'shopping',   sort_order: 4 },
  { slug: 'dairy',             name_fr: 'Produits Laitiers',          name_ar: 'منتجات الألبان',         icon: 'milk',       sort_order: 5 },
  { slug: 'butchery',          name_fr: 'Boucherie & Volailles',      name_ar: 'لحوم ودواجن',            icon: 'meat',       sort_order: 6 },
  { slug: 'seafood',           name_fr: 'Poissonnerie & Mer',         name_ar: 'أسماك ومأكولات بحرية',   icon: 'fish',       sort_order: 7 },
  { slug: 'beverages',         name_fr: 'Jus & Boissons Fraîches',    name_ar: 'عصائر ومشروبات طازجة',    icon: 'cup',        sort_order: 8 },
];

async function main() {
  console.log('🌱 Seeding MS2 Catalogue database...');

  // ── Seed Categories ────────────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name_fr: cat.name_fr, name_ar: cat.name_ar, icon: cat.icon, sort_order: cat.sort_order },
      create: cat,
    });
  }
  console.log(`✅ ${CATEGORIES.length} food categories seeded.`);

  // ── Seed Demo Shop Snapshot (MS1 mock data for development) ────────────────
  const demoShop = await prisma.shopSnapshot.upsert({
    where:  { id: 'shop-demo-00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id:             'shop-demo-00000000-0000-0000-0000-000000000001',
      name:           'Boulangerie Benali & Frères',
      address:        '14 Rue Didouche Mourad, Alger Centre',
      latitude:       36.7725,
      longitude:      3.0588,
      status:         ShopStatus.ACTIVE,
      average_rating: 4.6,
      sales_count:    84,
      merchant_id:    'merchant-demo-00000000-0000-0000-0001',
    },
  });
  console.log('✅ Demo shop snapshot seeded.');

  // ── Demo offers ───────────────────────────────────────────────────────────
  const bakeryCategory = await prisma.category.findUnique({ where: { slug: 'bakeries' } });
  const fruitCategory  = await prisma.category.findUnique({ where: { slug: 'fruits-vegetables' } });

  if (bakeryCategory && fruitCategory) {
    const now = new Date();

    // Offer 1: Same-day bakery items (expires on tomorrow's calendar day in Africa/Algiers)
    // Using tomorrow ensures deadlines are always in the future regardless of time of day
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    const tomorrowAlgiersDate = getAlgiersCalendarDate(tomorrow); // 'YYYY-MM-DD'

    // In Africa/Algiers (UTC+1): 20:00:00 local time = 19:00:00 UTC
    const sameDayDeadline = new Date(`${tomorrowAlgiersDate}T19:00:00.000Z`);
    // End of day in Africa/Algiers (23:59:59.999 local time = 22:59:59.999 UTC)
    const sameDayExpiry = getAlgiersEndOfDay(tomorrow);

    // Offer 2: Fresh fruits (good for 3 days)
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
    const futureDeadline = new Date(`${getAlgiersCalendarDate(inTwoDays)}T17:00:00.000Z`);
    const futureExpiry = getAlgiersEndOfDay(inThreeDays);

    await prisma.offer.upsert({
      where: { id: 'offer-demo-00000000-0000-0000-0000-000000000001' },
      update: {
        product_expiry_date: sameDayExpiry,
        expires_at:          sameDayDeadline,
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
        expires_at:          sameDayDeadline,
        product_expiry_date: sameDayExpiry,
        status:              OfferStatus.ACTIVE,
        published_at:        now,
      },
    });

    await prisma.offer.upsert({
      where: { id: 'offer-demo-00000000-0000-0000-0000-000000000002' },
      update: {
        product_expiry_date: futureExpiry,
        expires_at:          futureDeadline,
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
        expires_at:          futureDeadline,
        product_expiry_date: futureExpiry,
        status:              OfferStatus.ACTIVE,
        published_at:        now,
      },
    });

    console.log('✅ Demo offers seeded with valid Africa/Algiers timezone dates.');
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
