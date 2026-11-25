import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FACEBOOK_URL,
  DEFAULT_INSTAGRAM_URL,
  buildMailtoOrderUrl,
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  calculateDeliveryFee,
  formatMad,
  getProductQuantityMode,
  isValidMoroccanPhone,
  normalizeMoroccanPhone,
  sanitizeExternalHttpUrl,
  validateCheckoutForm,
} from './commerce';
import type { CartItem, DeliveryZone } from '../types';

const casablancaZone: DeliveryZone = {
  id: 'casablanca-chaouia',
  name_fr: 'Casablanca & Chaouia',
  name_en: 'Casablanca & Chaouia',
  name_ar: 'الدار البيضاء والشاوية',
  fee_mad: 25,
  free_threshold_mad: 300,
  eta_fr: '24h',
  eta_en: '24h',
  eta_ar: '24 ساعة',
};

test('normalizes and validates Moroccan phone numbers (+212, 06, 07, 05)', () => {
  assert.equal(normalizeMoroccanPhone('06 12-34 56 78'), '+212612345678');
  assert.equal(normalizeMoroccanPhone('+212 7 01 23 45 67'), '+212701234567');
  assert.equal(normalizeMoroccanPhone('00212522987654'), '+212522987654');

  assert.equal(isValidMoroccanPhone('0612345678'), true);
  assert.equal(isValidMoroccanPhone('+212712345678'), true);
  assert.equal(isValidMoroccanPhone('+212 522 11 22 33'), true);
  assert.equal(isValidMoroccanPhone('0123456789'), false);
  assert.equal(isValidMoroccanPhone('+33612345678'), false);
});

test('calculates delivery fees and free delivery threshold accurately', () => {
  assert.equal(calculateDeliveryFee(150, casablancaZone, 'delivery'), 25);
  assert.equal(calculateDeliveryFee(300, casablancaZone, 'delivery'), 0);
  assert.equal(calculateDeliveryFee(450, casablancaZone, 'delivery'), 0);
  assert.equal(calculateDeliveryFee(100, casablancaZone, 'pickup'), 0);
});

test('calculates cart totals and remaining amount for free delivery', () => {
  const items: CartItem[] = [
    {
      productId: 'oil-1l',
      name_fr: 'Huile Beldi 1L',
      name_en: 'Beldi Oil 1L',
      name_ar: 'زيت بلدي 1 لتر',
      unit_fr: '1L',
      unit_en: '1L',
      unit_ar: '1 لتر',
      price_mad: 110,
      quantity: 2,
      image_url: '/img.jpg',
      maxStock: 20,
    },
    {
      productId: 'tom-1kg',
      name_fr: 'Tomates',
      name_en: 'Tomatoes',
      name_ar: 'طماطم',
      unit_fr: '1kg',
      unit_en: '1kg',
      unit_ar: '1 كغ',
      price_mad: 12,
      quantity: 3,
      image_url: '/img2.jpg',
      maxStock: 50,
    },
  ];

  const deliveryTotals = calculateCartTotals(items, casablancaZone, 'delivery');
  assert.equal(deliveryTotals.itemCount, 5);
  assert.equal(deliveryTotals.subtotalMad, 256);
  assert.equal(deliveryTotals.deliveryFeeMad, 25);
  assert.equal(deliveryTotals.totalMad, 281);
  assert.equal(deliveryTotals.amountToFreeDelivery, 44);

  const pickupTotals = calculateCartTotals(items, casablancaZone, 'pickup');
  assert.equal(pickupTotals.deliveryFeeMad, 0);
  assert.equal(pickupTotals.totalMad, 256);
  assert.equal(pickupTotals.amountToFreeDelivery, 0);
});

test('validates checkout form fields across delivery and pickup modes', () => {
  const invalidErrors = validateCheckoutForm(
    {
      customerName: 'A',
      customerPhone: '123',
      city: '',
      deliveryZoneId: 'casablanca-chaouia',
      address: 'ab',
      deliveryMethod: 'delivery',
    },
    'en'
  );
  assert.ok(invalidErrors.customerName);
  assert.ok(invalidErrors.customerPhone);
  assert.ok(invalidErrors.city);
  assert.ok(invalidErrors.address);

  const validPickupErrors = validateCheckoutForm(
    {
      customerName: 'Karim Benali',
      customerPhone: '+212661223344',
      city: '',
      deliveryZoneId: 'casablanca-chaouia',
      address: '',
      deliveryMethod: 'pickup',
    },
    'fr'
  );
  assert.deepEqual(validPickupErrors, {});
});

test('formats MAD currency and builds WhatsApp URL cleanly', () => {
  assert.equal(formatMad(120, 'fr'), '120 DH');
  assert.equal(formatMad(120, 'en'), '120 MAD');
  assert.equal(formatMad(120, 'ar'), '120 درهم');

  const url = buildWhatsAppOrderUrl(
    '+212 654 53 85 95',
    {
      orderId: 'ORD-1001',
      customerName: 'Salma',
      customerPhone: '+212661001122',
      items: [{ name: 'Huile Beldi', quantity: 2, price_mad: 110 }],
      deliveryFeeMad: 25,
      totalMad: 245,
    },
    'fr'
  );
  assert.ok(url.startsWith('https://wa.me/212654538595?text='));
  assert.ok(decodeURIComponent(url).includes('ORD-1001'));
  assert.ok(decodeURIComponent(url).includes('245 MAD'));

  const mailtoUrl = buildMailtoOrderUrl(
    'domaineessaoudi@gmail.com',
    {
      orderId: 'ORD-1001',
      customerName: 'Salma',
      customerPhone: '+212661001122',
      items: [{ name: 'Huile Haouzia', variantLabel: '2 Litres', quantity: 1, price_mad: 250 }],
      deliveryFeeMad: 0,
      totalMad: 250,
    },
    'fr'
  );
  assert.ok(mailtoUrl.startsWith('mailto:domaineessaoudi%40gmail.com?'));
  assert.ok(decodeURIComponent(mailtoUrl).includes('ORD-1001'));
  assert.ok(decodeURIComponent(mailtoUrl).includes('Huile Haouzia (2 Litres)'));
  assert.ok(decodeURIComponent(mailtoUrl).includes('250 MAD'));
});

test('getProductQuantityMode selects quantity for eggs/trays, kilo for chicken/vegetables, liters for olive oil', () => {
  assert.equal(
    getProductQuantityMode({
      category: 'poultry',
      subcategory: 'eggs',
      name_fr: 'Plateau d’œufs de poulet',
      name_en: 'Farm Chicken Egg Tray',
      name_ar: 'صينية بيض بلدي',
      unit_fr: '1 kg',
      unit_en: '1 kg',
      unit_ar: '1 كغ',
    }),
    'quantity'
  );
  assert.equal(
    getProductQuantityMode({
      category: 'poultry',
      subcategory: 'chicken',
      name_fr: 'Poulets bio et beldi',
      name_en: 'Beldi Chicken',
      name_ar: 'دجاج بلدي',
      unit_fr: '1 kg',
      unit_en: '1 kg',
      unit_ar: '1 كغ',
    }),
    'kilo'
  );
  assert.equal(
    getProductQuantityMode({
      category: 'vegetables',
      subcategory: 'tomatoes',
      name_fr: 'Tomates Beldi',
      name_en: 'Beldi Tomatoes',
      name_ar: 'طماطم بلدية',
      unit_fr: '1 kg',
      unit_en: '1 kg',
      unit_ar: '1 كغ',
    }),
    'kilo'
  );
  assert.equal(
    getProductQuantityMode({
      category: 'olive-oil',
      subcategory: 'oil',
      name_fr: 'Extra virgin olive oil 1 L',
      name_en: 'Extra virgin olive oil',
      name_ar: 'زيت زيتون',
      unit_fr: '1 L',
      unit_en: '1 L',
      unit_ar: '1 لتر',
    }),
    'liters'
  );
});

test('sanitizeExternalHttpUrl allows https/http social links and rejects unsafe schemes', () => {
  assert.equal(
    sanitizeExternalHttpUrl('https://www.instagram.com/domaineessaoudi/', DEFAULT_INSTAGRAM_URL),
    'https://www.instagram.com/domaineessaoudi/'
  );
  assert.equal(
    sanitizeExternalHttpUrl(
      'https://www.facebook.com/profile.php?id=61596964379987',
      DEFAULT_FACEBOOK_URL
    ),
    'https://www.facebook.com/profile.php?id=61596964379987'
  );
  assert.equal(
    sanitizeExternalHttpUrl('javascript:alert(1)', DEFAULT_INSTAGRAM_URL),
    DEFAULT_INSTAGRAM_URL
  );
  assert.equal(
    sanitizeExternalHttpUrl('data:text/html,<script>', DEFAULT_FACEBOOK_URL),
    DEFAULT_FACEBOOK_URL
  );
  assert.equal(sanitizeExternalHttpUrl('', DEFAULT_INSTAGRAM_URL), DEFAULT_INSTAGRAM_URL);
});
