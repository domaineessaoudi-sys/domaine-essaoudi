import type { CartItem, DeliveryZone, Language, Product } from '../types';

export function getLocalizedField(
  obj: Record<string, any>,
  baseKey: string,
  lang: Language
): string {
  const localized = obj[`${baseKey}_${lang}`];
  if (typeof localized === 'string' && localized.trim().length > 0) {
    return localized;
  }
  return obj[`${baseKey}_fr`] || obj[`${baseKey}_en`] || obj[`${baseKey}_ar`] || '';
}

export function formatMad(amount: number, lang: Language = 'fr'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = Number.isInteger(safe) ? safe.toString() : safe.toFixed(2);
  if (lang === 'ar') {
    return `${formatted} درهم`;
  }
  if (lang === 'en') {
    return `${formatted} MAD`;
  }
  return `${formatted} DH`;
}

export function normalizeMoroccanPhone(input: string): string {
  const stripped = input.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('00212')) {
    return `+212${stripped.slice(5)}`;
  }
  if (stripped.startsWith('212')) {
    return `+${stripped}`;
  }
  if (stripped.startsWith('0') && stripped.length === 10) {
    return `+212${stripped.slice(1)}`;
  }
  return stripped;
}

export function isValidMoroccanPhone(input: string): boolean {
  const normalized = normalizeMoroccanPhone(input.trim());
  return /^\+212[567]\d{8}$/.test(normalized);
}

export function calculateDeliveryFee(
  subtotalMad: number,
  zone: DeliveryZone | undefined,
  deliveryMethod: 'delivery' | 'pickup'
): number {
  if (deliveryMethod === 'pickup') {
    return 0;
  }
  if (!zone) {
    return 0;
  }
  if (subtotalMad >= zone.free_threshold_mad && zone.free_threshold_mad > 0) {
    return 0;
  }
  return Math.max(0, Number(zone.fee_mad) || 0);
}

export function calculateCartTotals(
  items: CartItem[],
  zone: DeliveryZone | undefined,
  deliveryMethod: 'delivery' | 'pickup'
): {
  itemCount: number;
  subtotalMad: number;
  deliveryFeeMad: number;
  totalMad: number;
  amountToFreeDelivery: number;
} {
  const itemCount = items.reduce((acc, item) => acc + Math.max(0, item.quantity), 0);
  const subtotalMad = items.reduce(
    (acc, item) => acc + Math.max(0, item.price_mad) * Math.max(0, item.quantity),
    0
  );
  const roundedSubtotal = Math.round(subtotalMad * 100) / 100;
  const deliveryFeeMad =
    items.length === 0 ? 0 : calculateDeliveryFee(roundedSubtotal, zone, deliveryMethod);
  const totalMad = Math.round((roundedSubtotal + deliveryFeeMad) * 100) / 100;
  const threshold = zone?.free_threshold_mad ?? 0;
  const amountToFreeDelivery =
    deliveryMethod === 'delivery' && threshold > 0 && roundedSubtotal < threshold
      ? Math.round((threshold - roundedSubtotal) * 100) / 100
      : 0;

  return {
    itemCount,
    subtotalMad: roundedSubtotal,
    deliveryFeeMad,
    totalMad,
    amountToFreeDelivery,
  };
}

export interface CheckoutFormInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  deliveryZoneId: string;
  address: string;
  deliveryMethod: 'delivery' | 'pickup';
}

export function validateCheckoutForm(
  form: CheckoutFormInput,
  lang: Language
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.customerName.trim().length < 2) {
    errors.customerName =
      lang === 'ar'
        ? 'يرجى إدخال الاسم الكامل'
        : lang === 'en'
          ? 'Please enter your full name'
          : 'Veuillez saisir votre nom complet';
  }
  if (!isValidMoroccanPhone(form.customerPhone)) {
    errors.customerPhone =
      lang === 'ar'
        ? 'رقم هاتف مغربي غير صالح (+212 6XX XX XX XX)'
        : lang === 'en'
          ? 'Enter a valid Moroccan phone (+212 6XX XX XX XX)'
          : 'Numéro marocain invalide (+212 6XX XX XX XX)';
  }
  if (form.customerEmail && form.customerEmail.trim().length > 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) {
      errors.customerEmail =
        lang === 'ar'
          ? 'البريد الإلكتروني غير صالح'
          : lang === 'en'
            ? 'Invalid email address'
            : 'Adresse e-mail invalide';
    }
  }
  if (form.deliveryMethod === 'delivery') {
    if (!form.city.trim()) {
      errors.city =
        lang === 'ar'
          ? 'يرجى تحديد المدينة'
          : lang === 'en'
            ? 'Please enter your city'
            : 'Veuillez indiquer votre ville';
    }
    if (form.address.trim().length < 5) {
      errors.address =
        lang === 'ar'
          ? 'يرجى إدخال عنوان التوصيل الكامل'
          : lang === 'en'
            ? 'Please enter your delivery address'
            : 'Veuillez préciser votre adresse de livraison';
    }
  }
  return errors;
}

export function buildWhatsAppOrderUrl(
  whatsappRaw: string,
  params: {
    orderId?: string;
    customerName?: string;
    customerPhone?: string;
    city?: string;
    address?: string;
    deliveryMethod?: 'delivery' | 'pickup';
    items: Array<{ name: string; variantLabel?: string; quantity: number; price_mad: number }>;
    deliveryFeeMad: number;
    totalMad: number;
  },
  lang: Language
): string {
  const digits = whatsappRaw.replace(/\D/g, '');
  const lines: string[] = [];

  if (lang === 'ar') {
    lines.push('السلام عليكم مزرعة السعودي، أود تأكيد الطلب التالي:');
  } else if (lang === 'en') {
    lines.push('Hello Domaine Essaoudi, I would like to place this order:');
  } else {
    lines.push('Bonjour Domaine Essaoudi, je souhaite confirmer la commande suivante :');
  }

  if (params.orderId) {
    lines.push(`Ref: ${params.orderId}`);
  }
  lines.push('');

  for (const item of params.items) {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : '';
    lines.push(
      `- ${item.quantity}x ${item.name}${variant} — ${(item.price_mad * item.quantity).toFixed(0)} MAD`
    );
  }

  lines.push('');
  lines.push(
    lang === 'ar'
      ? `التوصيل: ${params.deliveryFeeMad} درهم | المجموع: ${params.totalMad} درهم`
      : `Delivery: ${params.deliveryFeeMad} MAD | Total: ${params.totalMad} MAD`
  );

  if (params.customerName) {
    lines.push(`Client: ${params.customerName} (${params.customerPhone || ''})`);
  }
  if (params.deliveryMethod === 'pickup') {
    lines.push('Mode: Retrait à la ferme / Farm Pickup');
  } else if (params.address) {
    lines.push(`Adresse: ${params.city || ''}, ${params.address}`);
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildWhatsAppDirectProductUrl(
  whatsappRaw: string,
  product: Product,
  quantity: number,
  variantLabel: string | undefined,
  lang: Language
): string {
  const digits = whatsappRaw.replace(/\D/g, '');
  const name = getLocalizedField(product, 'name', lang);
  const v = variantLabel ? ` (${variantLabel})` : '';
  const msg =
    lang === 'ar'
      ? `السلام عليكم مزرعة السعودي، أريد طلب ${quantity} × ${name}${v}.`
      : lang === 'en'
        ? `Hello Domaine Essaoudi, I would like to order ${quantity} × ${name}${v}.`
        : `Bonjour Domaine Essaoudi, je souhaite commander ${quantity} × ${name}${v}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function buildMailtoOrderUrl(
  recipientEmail: string,
  params: {
    orderId?: string;
    customerName?: string;
    customerPhone?: string;
    city?: string;
    address?: string;
    deliveryMethod?: 'delivery' | 'pickup';
    items: Array<{ name: string; variantLabel?: string; quantity: number; price_mad: number }>;
    deliveryFeeMad: number;
    totalMad: number;
  },
  lang: Language
): string {
  const to = (recipientEmail || 'domaineessaoudi@gmail.com').trim();
  const subject = params.orderId
    ? `Commande ${params.orderId} — Domaine Essaoudi (${params.totalMad} MAD)`
    : `Nouvelle commande — Domaine Essaoudi (${params.totalMad} MAD)`;

  const lines: string[] = [];
  if (lang === 'ar') {
    lines.push('السلام عليكم مزرعة السعودي، تفاصيل الطلب:');
  } else if (lang === 'en') {
    lines.push('Hello Domaine Essaoudi, order summary:');
  } else {
    lines.push('Bonjour Domaine Essaoudi, récapitulatif de commande :');
  }
  if (params.orderId) lines.push(`Référence : ${params.orderId}`);
  lines.push('');
  for (const item of params.items) {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : '';
    lines.push(
      `- ${item.quantity}x ${item.name}${variant} : ${(item.price_mad * item.quantity).toFixed(0)} MAD`
    );
  }
  lines.push('');
  lines.push(`Livraison : ${params.deliveryFeeMad} MAD`);
  lines.push(`Total : ${params.totalMad} MAD`);
  if (params.customerName) {
    lines.push(`Client : ${params.customerName} (${params.customerPhone || ''})`);
  }
  if (params.deliveryMethod === 'pickup') {
    lines.push('Mode : Retrait à la ferme');
  } else if (params.address) {
    lines.push(`Adresse : ${params.city || ''}, ${params.address}`);
  }

  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export type ProductQuantityMode = 'liters' | 'kilo' | 'quantity';

export function getProductQuantityMode(
  product: Pick<
    Product,
    'category' | 'subcategory' | 'name_fr' | 'name_en' | 'name_ar' | 'unit_fr' | 'unit_en' | 'unit_ar'
  >
): ProductQuantityMode {
  if (product.category === 'olive-oil') {
    return 'liters';
  }

  const normalizedText = [
    product.subcategory,
    product.name_fr,
    product.name_en,
    product.name_ar,
    product.unit_fr,
    product.unit_en,
    product.unit_ar,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/œ/gi, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/\boeufs?\b|\beggs?\b|\bplateaux?\b|\btrays?\b|بيض|صينية/.test(normalizedText)) {
    return 'quantity';
  }

  const normalizedUnit = [product.unit_fr, product.unit_en, product.unit_ar]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    /\b(boite|piece|douzaine|unit|pack|carton|box|tray|plateau)\b|علبة|قطعة|حبة/.test(
      normalizedUnit
    ) &&
    !/\b(kg|kilo|kilogram)\b|كغ|كيلو/.test(normalizedUnit)
  ) {
    return 'quantity';
  }

  if (product.category === 'poultry' || product.category === 'vegetables') {
    return 'kilo';
  }

  return 'quantity';
}

export const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/domaineessaoudi/';
export const DEFAULT_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61596964379987';

export function sanitizeExternalHttpUrl(raw: string | undefined | null, fallback = ''): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

