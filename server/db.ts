import crypto from 'node:crypto';
import { Client as PgClient } from 'pg';
import type {
  AdminStats,
  ContactMessage,
  Order,
  Product,
  ProductCategory,
  SiteContent,
} from '../src/types';
import { buildSupabaseRestHeaders, sanitizeDatabaseError } from '../src/utils/supabaseSql';
import { getStoredSupabaseConfig } from './runtimeStore';

export const BASE_SITE_CONTENT: SiteContent = {
  farmName: 'Domaine Essaoudi',
  heroTitle_fr: 'La terre marocaine, cultivée avec patience et sincérité.',
  heroTitle_en: 'Moroccan soil, cultivated with patience and sincerity.',
  heroTitle_ar: 'أرض مغربية أصيلة، تُزرع بعناية وإخلاص.',
  heroSubtitle_fr:
    'Depuis la plaine fertile de la Chaouia : légumes bio cueillis à l’aube, huile d’olive Beldi pressée à froid et volailles fermières élevées en plein air sous nos oliviers.',
  heroSubtitle_en:
    'From the fertile Chaouia plain: organic vegetables harvested at dawn, cold-pressed Beldi olive oil, and free-range Beldi poultry raised naturally beneath our olive groves.',
  heroSubtitle_ar:
    'من سهول الشاوية الخصبة: خضروات موسمية طازجة تُجنى عند الفجر، زيت زيتون بلدي معصور على البارد، ودواجن بلدية تتربى في المراعي الحرة تحت أشجار الزيتون.',
  phone: '+212 654 53 85 95',
  whatsapp: '+212 654 53 85 95',
  email: 'domaineessaoudi@gmail.com',
  address_fr: 'Douar Ouled Ziane, Route de Berrechid, Province de Berrechid, Chaouia, Maroc',
  address_en: 'Douar Ouled Ziane, Berrechid Road, Berrechid Province, Chaouia, Morocco',
  address_ar: 'دوار أولاد زيان، طريق برشيد، إقليم برشيد، الشاوية، المغرب',
  hours_fr: 'Lundi – Samedi : 07h30 – 18h30 · Livraison fraîcheur chaque matin',
  hours_en: 'Monday – Saturday: 07:30 – 18:30 · Fresh morning harvests & deliveries',
  hours_ar: 'الإثنين – السبت: 07:30 – 18:30 · توصيل صباحي طازج يومياً',
  socialInstagram: 'https://www.instagram.com/domaineessaoudi/',
  socialFacebook: 'https://www.facebook.com/profile.php?id=61596964379987',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
  deliveryZones: [
    {
      id: 'casablanca-chaouia',
      name_fr: 'Casablanca, Berrechid & Chaouia',
      name_en: 'Casablanca, Berrechid & Chaouia',
      name_ar: 'الدار البيضاء، برشيد والشاوية',
      fee_mad: 25,
      free_threshold_mad: 300,
      eta_fr: 'Livraison le jour même ou J+1',
      eta_en: 'Same-day or next-morning delivery',
      eta_ar: 'التوصيل في نفس اليوم أو صباح الغد',
    },
    {
      id: 'rabat-kenitra',
      name_fr: 'Rabat, Salé & Kénitra',
      name_en: 'Rabat, Salé & Kenitra',
      name_ar: 'الرباط، سلا والقنيطرة',
      fee_mad: 35,
      free_threshold_mad: 450,
      eta_fr: 'Livraison réfrigérée sous 24h',
      eta_en: 'Chilled delivery within 24h',
      eta_ar: 'توصيل مبرد خلال 24 ساعة',
    },
    {
      id: 'marrakech-eljadida',
      name_fr: 'Marrakech, Settat & El Jadida',
      name_en: 'Marrakech, Settat & El Jadida',
      name_ar: 'مراكش، سطات والجديدة',
      fee_mad: 40,
      free_threshold_mad: 500,
      eta_fr: 'Livraison sous 24h – 48h',
      eta_en: 'Delivery within 24h – 48h',
      eta_ar: 'التوصيل خلال 24 – 48 ساعة',
    },
    {
      id: 'national-other',
      name_fr: 'Tanger, Fès, Agadir & Autres Villes',
      name_en: 'Tangier, Fes, Agadir & Other Cities',
      name_ar: 'طنجة، فاس، أكادير وباقي المدن',
      fee_mad: 55,
      free_threshold_mad: 650,
      eta_fr: 'Expédition express 48h (Huile & Produits secs)',
      eta_en: '48h express shipping (Olive oil & dry goods)',
      eta_ar: 'شحن سريع خلال 48 ساعة (زيت الزيتون والمنتجات المحفوظة)',
    },
  ],
  testimonials: [],
};

export const BASE_PRODUCTS: Product[] = [];

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function getDefaultImageForCategory(category: string): string {
  if (category === 'olive-oil') return '/src/assets/images/cat_olive_oil_beldi_1795435654212.jpg';
  if (category === 'poultry') return '/src/assets/images/cat_poulet_beldi_1795435654032.jpg';
  return '/src/assets/images/cat_fresh_vegetables_1795435654556.jpg';
}

function rowToProduct(row: Record<string, unknown>): Product {
  const category = (row.category || 'vegetables') as ProductCategory;
  return {
    id: String(row.id),
    slug: String(row.slug),
    category,
    subcategory: String(row.subcategory || 'general'),
    name_fr: String(row.name_fr || ''),
    name_en: String(row.name_en || row.name_fr || ''),
    name_ar: String(row.name_ar || row.name_fr || ''),
    desc_fr: String(row.desc_fr || ''),
    desc_en: String(row.desc_en || ''),
    desc_ar: String(row.desc_ar || ''),
    price_mad: Number(row.price_mad || 0),
    unit_fr: String(row.unit_fr || '1 kg'),
    unit_en: String(row.unit_en || '1 kg'),
    unit_ar: String(row.unit_ar || '1 كغ'),
    stock: Number(row.stock !== undefined && row.stock !== null ? row.stock : 100),
    available: row.available === undefined || row.available === null ? true : Boolean(row.available),
    featured: Boolean(row.featured),
    image_url: String(row.image_url || getDefaultImageForCategory(category)),
    variants: parseJsonField(row.variants_json, []),
    harvest_note_fr: String(row.harvest_note_fr || ''),
    harvest_note_en: String(row.harvest_note_en || ''),
    harvest_note_ar: String(row.harvest_note_ar || ''),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    customer_name: String(row.customer_name || ''),
    customer_phone: String(row.customer_phone || ''),
    customer_email: String(row.customer_email || ''),
    city: String(row.city || ''),
    delivery_zone: String(row.delivery_zone || ''),
    address: String(row.address || ''),
    delivery_method: row.delivery_method === 'pickup' ? 'pickup' : 'delivery',
    delivery_fee_mad: Number(row.delivery_fee_mad || 0),
    subtotal_mad: Number(row.subtotal_mad || 0),
    total_mad: Number(row.total_mad || 0),
    notes: String(row.notes || ''),
    status: (row.status || 'pending') as Order['status'],
    email_status: (row.email_status || 'pending_emailjs') as Order['email_status'],
    email_recipient: String(row.email_recipient || 'domaineessaoudi@gmail.com'),
    items: parseJsonField(row.items_json, []),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

function rowToContactMessage(row: Record<string, unknown>): ContactMessage {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    subject: String(row.subject || ''),
    message: String(row.message || ''),
    status: (row.status || 'unread') as ContactMessage['status'],
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

async function withPg<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  const cfg = getStoredSupabaseConfig();
  if (!cfg.postgresUri) {
    throw new Error('URI PostgreSQL Supabase non configurée.');
  }
  const client = new PgClient({
    connectionString: cfg.postgresUri,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 12000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function supabaseRest(
  pathWithQuery: string,
  options: {
    method?: string;
    body?: unknown;
    prefer?: string;
    requireServiceRole?: boolean;
  } = {}
): Promise<{ ok: boolean; status: number; data: unknown; errorText?: string }> {
  const cfg = getStoredSupabaseConfig();
  if (!cfg.projectUrl) {
    return {
      ok: false,
      status: 0,
      data: null,
      errorText: 'Supabase Project URL non configurée.',
    };
  }
  const apiKey = cfg.serviceRoleKey || (options.requireServiceRole ? '' : cfg.anonKey);
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      data: null,
      errorText: options.requireServiceRole
        ? 'Clé secrète Supabase (sb_secret_... / service_role) ou URI Session Pooler requise pour cette opération admin.'
        : 'Clé API Supabase manquante.',
    };
  }

  const extra: Record<string, string> = {};
  if (options.body !== undefined) {
    extra['Content-Type'] = 'application/json';
  }
  if (options.prefer) {
    extra.Prefer = options.prefer;
  }

  const res = await fetch(`${cfg.projectUrl}/rest/v1/${pathWithQuery}`, {
    method: options.method || 'GET',
    headers: buildSupabaseRestHeaders(apiKey, extra),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(10000),
  });

  const text = await res.text().catch(() => '');
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return {
    ok: res.ok,
    status: res.status,
    data: parsed,
    errorText: res.ok ? undefined : sanitizeDatabaseError(text || `HTTP ${res.status}`),
  };
}

function formatSupabaseError(context: string, status: number, errorText?: string): Error {
  if (status === 401 || status === 403 || (errorText && errorText.includes('42501'))) {
    return new Error(
      `${context} — Supabase a refusé l'accès (42501 permission denied). Exécutez le script « Schema & Permissions Supabase » dans Supabase SQL Editor ou ajoutez votre clé secrète (sb_secret_...) dans /admin.`
    );
  }
  return new Error(`${context} — ${errorText || `HTTP ${status}`}`);
}

export async function listProducts(options?: {
  category?: string;
  featured?: boolean;
  includeUnavailable?: boolean;
}): Promise<Product[]> {
  const filterRows = (items: Product[]) =>
    items.filter((p) => {
      if (!options?.includeUnavailable && !p.available) return false;
      if (options?.category && options.category !== 'all' && p.category !== options.category) {
        return false;
      }
      if (options?.featured && !p.featured) return false;
      return true;
    });

  const cfg = getStoredSupabaseConfig();

  if (cfg.postgresUri) {
    try {
      const rows = await withPg(async (client) => {
        const res = await client.query(
          'SELECT * FROM public.products ORDER BY category ASC, name_fr ASC'
        );
        return res.rows.map((r) => rowToProduct(r as Record<string, unknown>));
      });
      if (rows.length > 0) {
        return filterRows(rows);
      }
    } catch (pgErr) {
      console.warn('PostgreSQL query notice (falling back):', pgErr instanceof Error ? pgErr.message : pgErr);
    }
  }

  if (cfg.projectUrl && (cfg.serviceRoleKey || cfg.anonKey)) {
    try {
      const res = await supabaseRest('products?select=*&order=category.asc,name_fr.asc');
      if (res.ok && Array.isArray(res.data)) {
        const rows = res.data.map((r) => rowToProduct(r as Record<string, unknown>));
        return filterRows(rows);
      }
      if (!res.ok) {
        console.warn('Supabase REST query failed:', res.status, res.errorText);
      }
    } catch (restErr) {
      console.warn('Supabase REST query notice (falling back):', restErr instanceof Error ? restErr.message : restErr);
    }
  }

  return filterRows(BASE_PRODUCTS);
}

export async function getProductByIdOrSlug(idOrSlug: string): Promise<Product | null> {
  const all = await listProducts({ includeUnavailable: true });
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
}

export async function createProduct(
  input: Omit<Product, 'id' | 'slug' | 'created_at' | 'updated_at'>
): Promise<Product> {
  const id = `prod-${crypto.randomBytes(4).toString('hex')}`;
  const slugBase = input.name_fr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const slug = `${slugBase || 'produit'}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();

  const newProduct: Product = {
    ...input,
    id,
    slug,
    created_at: now,
    updated_at: now,
  };

  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.products (
          id, slug, category, subcategory,
          name_fr, name_en, name_ar, desc_fr, desc_en, desc_ar,
          price_mad, unit_fr, unit_en, unit_ar,
          stock, available, featured, image_url, variants_json,
          harvest_note_fr, harvest_note_en, harvest_note_ar,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [
          newProduct.id,
          newProduct.slug,
          newProduct.category,
          newProduct.subcategory || 'general',
          newProduct.name_fr,
          newProduct.name_en,
          newProduct.name_ar,
          newProduct.desc_fr,
          newProduct.desc_en,
          newProduct.desc_ar,
          newProduct.price_mad,
          newProduct.unit_fr,
          newProduct.unit_en,
          newProduct.unit_ar,
          newProduct.stock,
          newProduct.available,
          newProduct.featured,
          newProduct.image_url,
          JSON.stringify(newProduct.variants || []),
          newProduct.harvest_note_fr || '',
          newProduct.harvest_note_en || '',
          newProduct.harvest_note_ar || '',
          now,
          now,
        ]
      );
    });
    return newProduct;
  }

  const res = await supabaseRest('products', {
    method: 'POST',
    prefer: 'return=representation',
    requireServiceRole: true,
    body: {
      id: newProduct.id,
      slug: newProduct.slug,
      category: newProduct.category,
      subcategory: newProduct.subcategory || 'general',
      name_fr: newProduct.name_fr,
      name_en: newProduct.name_en,
      name_ar: newProduct.name_ar,
      desc_fr: newProduct.desc_fr,
      desc_en: newProduct.desc_en,
      desc_ar: newProduct.desc_ar,
      price_mad: newProduct.price_mad,
      unit_fr: newProduct.unit_fr,
      unit_en: newProduct.unit_en,
      unit_ar: newProduct.unit_ar,
      stock: newProduct.stock,
      available: newProduct.available,
      featured: newProduct.featured,
      image_url: newProduct.image_url,
      variants_json: newProduct.variants || [],
      harvest_note_fr: newProduct.harvest_note_fr || '',
      harvest_note_en: newProduct.harvest_note_en || '',
      harvest_note_ar: newProduct.harvest_note_ar || '',
      created_at: now,
      updated_at: now,
    },
  });

  if (!res.ok) {
    throw formatSupabaseError('Échec création produit sur Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data) && res.data[0]
    ? rowToProduct(res.data[0] as Record<string, unknown>)
    : newProduct;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
  const existing = await getProductByIdOrSlug(id);
  if (!existing) return null;

  const updated: Product = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    await withPg(async (client) => {
      await client.query(
        `UPDATE public.products SET
          category = $1, subcategory = $2,
          name_fr = $3, name_en = $4, name_ar = $5,
          desc_fr = $6, desc_en = $7, desc_ar = $8,
          price_mad = $9, unit_fr = $10, unit_en = $11, unit_ar = $12,
          stock = $13, available = $14, featured = $15, image_url = $16,
          variants_json = $17,
          harvest_note_fr = $18, harvest_note_en = $19, harvest_note_ar = $20,
          updated_at = $21
        WHERE id = $22`,
        [
          updated.category,
          updated.subcategory,
          updated.name_fr,
          updated.name_en,
          updated.name_ar,
          updated.desc_fr,
          updated.desc_en,
          updated.desc_ar,
          updated.price_mad,
          updated.unit_fr,
          updated.unit_en,
          updated.unit_ar,
          updated.stock,
          updated.available,
          updated.featured,
          updated.image_url,
          JSON.stringify(updated.variants || []),
          updated.harvest_note_fr,
          updated.harvest_note_en,
          updated.harvest_note_ar,
          updated.updated_at,
          id,
        ]
      );
    });
    return updated;
  }

  const res = await supabaseRest(`products?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    requireServiceRole: true,
    body: {
      category: updated.category,
      subcategory: updated.subcategory,
      name_fr: updated.name_fr,
      name_en: updated.name_en,
      name_ar: updated.name_ar,
      desc_fr: updated.desc_fr,
      desc_en: updated.desc_en,
      desc_ar: updated.desc_ar,
      price_mad: updated.price_mad,
      unit_fr: updated.unit_fr,
      unit_en: updated.unit_en,
      unit_ar: updated.unit_ar,
      stock: updated.stock,
      available: updated.available,
      featured: updated.featured,
      image_url: updated.image_url,
      variants_json: updated.variants || [],
      harvest_note_fr: updated.harvest_note_fr,
      harvest_note_en: updated.harvest_note_en,
      harvest_note_ar: updated.harvest_note_ar,
      updated_at: updated.updated_at,
    },
  });

  if (!res.ok) {
    throw formatSupabaseError('Échec mise à jour produit sur Supabase', res.status, res.errorText);
  }
  return updated;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    const changes = await withPg(async (client) => {
      const r = await client.query('DELETE FROM public.products WHERE id = $1', [id]);
      return r.rowCount || 0;
    });
    return changes > 0;
  }

  const res = await supabaseRest(`products?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    prefer: 'return=representation',
    requireServiceRole: true,
  });
  if (!res.ok) {
    throw formatSupabaseError('Échec suppression produit sur Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data) ? res.data.length > 0 : true;
}

function normalizeSocialSiteContent(merged: SiteContent): SiteContent {
  const legacyInstagram = new Set(['', 'https://instagram.com/domaine.essaoudi']);
  const legacyFacebook = new Set(['', 'https://facebook.com/domaine.essaoudi']);
  return {
    ...merged,
    socialInstagram: legacyInstagram.has((merged.socialInstagram || '').trim())
      ? BASE_SITE_CONTENT.socialInstagram
      : merged.socialInstagram,
    socialFacebook: legacyFacebook.has((merged.socialFacebook || '').trim())
      ? BASE_SITE_CONTENT.socialFacebook
      : merged.socialFacebook,
    testimonials: [],
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const cfg = getStoredSupabaseConfig();

  if (cfg.postgresUri) {
    try {
      const resRows = await withPg(async (client) => {
        const r = await client.query('SELECT value_json FROM public.site_content WHERE key = $1', [
          'main',
        ]);
        return r.rows;
      });
      if (resRows.length > 0) {
        const parsed = parseJsonField<Partial<SiteContent>>(resRows[0].value_json, {});
        return normalizeSocialSiteContent({ ...BASE_SITE_CONTENT, ...parsed });
      }
    } catch (pgErr) {
      console.warn('Postgres site_content query notice:', pgErr instanceof Error ? pgErr.message : pgErr);
    }
  }

  if (cfg.projectUrl && (cfg.serviceRoleKey || cfg.anonKey)) {
    try {
      const res = await supabaseRest('site_content?key=eq.main&select=value_json&limit=1');
      if (res.ok && Array.isArray(res.data) && res.data[0]) {
        const row = res.data[0] as Record<string, unknown>;
        const parsed = parseJsonField<Partial<SiteContent>>(row.value_json, {});
        return normalizeSocialSiteContent({ ...BASE_SITE_CONTENT, ...parsed });
      }
    } catch (restErr) {
      console.warn('Supabase REST site_content notice:', restErr instanceof Error ? restErr.message : restErr);
    }
  }

  return BASE_SITE_CONTENT;
}

export async function updateSiteContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const current = await getSiteContent();
  const next: SiteContent = { ...current, ...patch, testimonials: [] };
  const now = new Date().toISOString();
  const cfg = getStoredSupabaseConfig();

  if (cfg.postgresUri) {
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.site_content (key, value_json, updated_at)
         VALUES ('main', $1, $2)
         ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
        [JSON.stringify(next), now]
      );
    });
    return next;
  }

  const res = await supabaseRest('site_content?on_conflict=key', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    requireServiceRole: true,
    body: {
      key: 'main',
      value_json: next,
      updated_at: now,
    },
  });
  if (!res.ok) {
    throw formatSupabaseError('Échec sauvegarde contenu sur Supabase', res.status, res.errorText);
  }
  return next;
}

export async function createOrderRecord(
  order: Omit<Order, 'id' | 'created_at' | 'status'>
): Promise<Order> {
  const now = new Date().toISOString();
  const suffix = Math.floor(100 + Math.random() * 900);
  const id = `ORD-${new Date().getFullYear()}-${suffix}${crypto.randomBytes(1).toString('hex').toUpperCase()}`;

  const createdOrder: Order = {
    id,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || '',
    city: order.city,
    delivery_zone: order.delivery_zone,
    address: order.address,
    delivery_method: order.delivery_method,
    delivery_fee_mad: order.delivery_fee_mad,
    subtotal_mad: order.subtotal_mad,
    total_mad: order.total_mad,
    notes: order.notes || '',
    status: 'pending',
    email_status: 'pending_emailjs',
    email_recipient: 'domaineessaoudi@gmail.com',
    items: order.items,
    created_at: now,
  };

  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.orders (
          id, customer_name, customer_phone, customer_email, city, delivery_zone,
          address, delivery_method, delivery_fee_mad, subtotal_mad, total_mad,
          notes, status, email_status, email_recipient, items_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          createdOrder.id,
          createdOrder.customer_name,
          createdOrder.customer_phone,
          createdOrder.customer_email,
          createdOrder.city,
          createdOrder.delivery_zone,
          createdOrder.address,
          createdOrder.delivery_method,
          createdOrder.delivery_fee_mad,
          createdOrder.subtotal_mad,
          createdOrder.total_mad,
          createdOrder.notes,
          createdOrder.status,
          createdOrder.email_status,
          createdOrder.email_recipient,
          JSON.stringify(createdOrder.items),
          now,
        ]
      );
      for (const item of order.items) {
        await client.query(
          'UPDATE public.products SET stock = GREATEST(0, stock - $1) WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
    });
    return createdOrder;
  }

  const res = await supabaseRest('orders', {
    method: 'POST',
    prefer: cfg.serviceRoleKey ? 'return=representation' : 'return=minimal',
    body: {
      id: createdOrder.id,
      customer_name: createdOrder.customer_name,
      customer_phone: createdOrder.customer_phone,
      customer_email: createdOrder.customer_email,
      city: createdOrder.city,
      delivery_zone: createdOrder.delivery_zone,
      address: createdOrder.address,
      delivery_method: createdOrder.delivery_method,
      delivery_fee_mad: createdOrder.delivery_fee_mad,
      subtotal_mad: createdOrder.subtotal_mad,
      total_mad: createdOrder.total_mad,
      notes: createdOrder.notes,
      status: createdOrder.status,
      email_status: createdOrder.email_status,
      email_recipient: createdOrder.email_recipient,
      items_json: createdOrder.items,
      created_at: now,
    },
  });

  if (!res.ok) {
    throw formatSupabaseError('Échec enregistrement commande sur Supabase', res.status, res.errorText);
  }

  if (cfg.serviceRoleKey) {
    for (const item of order.items) {
      const prodRes = await supabaseRest(
        `products?id=eq.${encodeURIComponent(item.productId)}&select=stock&limit=1`,
        { requireServiceRole: true }
      );
      if (prodRes.ok && Array.isArray(prodRes.data) && prodRes.data[0]) {
        const currentStock = Number((prodRes.data[0] as Record<string, unknown>).stock || 0);
        const nextStock = Math.max(0, currentStock - item.quantity);
        await supabaseRest(`products?id=eq.${encodeURIComponent(item.productId)}`, {
          method: 'PATCH',
          requireServiceRole: true,
          body: { stock: nextStock },
        }).catch(() => {});
      }
    }
  }

  return createdOrder;
}

export async function listOrders(): Promise<Order[]> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const res = await client.query('SELECT * FROM public.orders ORDER BY created_at DESC');
      return res.rows.map((r) => rowToOrder(r as Record<string, unknown>));
    });
  }

  const res = await supabaseRest('orders?select=*&order=created_at.desc');
  if (!res.ok) {
    throw formatSupabaseError('Impossible de charger les commandes depuis Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data)
    ? res.data.map((r) => rowToOrder(r as Record<string, unknown>))
    : [];
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const r = await client.query('UPDATE public.orders SET status = $1 WHERE id = $2 RETURNING *', [
        status,
        id,
      ]);
      return r.rows[0] ? rowToOrder(r.rows[0] as Record<string, unknown>) : null;
    });
  }

  const res = await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    requireServiceRole: true,
    body: { status },
  });
  if (!res.ok) {
    throw formatSupabaseError('Échec mise à jour commande sur Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data) && res.data[0]
    ? rowToOrder(res.data[0] as Record<string, unknown>)
    : null;
}

export async function updateOrderEmailStatus(
  id: string,
  emailStatus: 'sent' | 'pending_smtp' | 'pending_emailjs' | 'failed',
  emailRecipient: string
): Promise<Order | null> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const r = await client.query(
        'UPDATE public.orders SET email_status = $1, email_recipient = $2 WHERE id = $3 RETURNING *',
        [emailStatus, emailRecipient, id]
      );
      return r.rows[0] ? rowToOrder(r.rows[0] as Record<string, unknown>) : null;
    });
  }

  if (!cfg.serviceRoleKey) {
    return null;
  }

  const res = await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    requireServiceRole: true,
    body: { email_status: emailStatus, email_recipient: emailRecipient },
  });
  if (res.ok && Array.isArray(res.data) && res.data[0]) {
    return rowToOrder(res.data[0] as Record<string, unknown>);
  }
  return null;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    const changes = await withPg(async (client) => {
      const r = await client.query('DELETE FROM public.orders WHERE id = $1', [id]);
      return r.rowCount || 0;
    });
    return changes > 0;
  }

  const res = await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    prefer: 'return=representation',
    requireServiceRole: true,
  });
  if (!res.ok) {
    throw formatSupabaseError('Échec suppression commande sur Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data) ? res.data.length > 0 : true;
}

export async function createContactMessage(input: {
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
}): Promise<ContactMessage> {
  const id = `MSG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();
  const msg: ContactMessage = {
    id,
    name: input.name,
    phone: input.phone,
    email: input.email || '',
    subject: input.subject,
    message: input.message,
    status: 'unread',
    created_at: now,
  };

  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.contact_messages (id, name, phone, email, subject, message, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,'unread',$7)`,
        [msg.id, msg.name, msg.phone, msg.email, msg.subject, msg.message, now]
      );
    });
    return msg;
  }

  const res = await supabaseRest('contact_messages', {
    method: 'POST',
    prefer: cfg.serviceRoleKey ? 'return=representation' : 'return=minimal',
    body: msg,
  });
  if (!res.ok) {
    throw formatSupabaseError('Échec enregistrement message sur Supabase', res.status, res.errorText);
  }
  return msg;
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const res = await client.query('SELECT * FROM public.contact_messages ORDER BY created_at DESC');
      return res.rows.map((r) => rowToContactMessage(r as Record<string, unknown>));
    });
  }

  const res = await supabaseRest('contact_messages?select=*&order=created_at.desc');
  if (!res.ok) {
    throw formatSupabaseError('Impossible de charger les messages depuis Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data)
    ? res.data.map((r) => rowToContactMessage(r as Record<string, unknown>))
    : [];
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessage['status']
): Promise<ContactMessage | null> {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const r = await client.query(
        'UPDATE public.contact_messages SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      return r.rows[0] ? rowToContactMessage(r.rows[0] as Record<string, unknown>) : null;
    });
  }

  const res = await supabaseRest(`contact_messages?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    requireServiceRole: true,
    body: { status },
  });
  if (!res.ok) {
    throw formatSupabaseError('Échec mise à jour message sur Supabase', res.status, res.errorText);
  }
  return Array.isArray(res.data) && res.data[0]
    ? rowToContactMessage(res.data[0] as Record<string, unknown>)
    : null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [products, orders, messages] = await Promise.all([
    listProducts({ includeUnavailable: true }),
    listOrders(),
    listContactMessages(),
  ]);

  const categoryCounts: Record<ProductCategory, number> = {
    vegetables: 0,
    'olive-oil': 0,
    poultry: 0,
  };
  for (const p of products) {
    if (p.category in categoryCounts) {
      categoryCounts[p.category] += 1;
    }
  }

  const pendingOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'shipped'].includes(o.status)
  ).length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const totalRevenueMad =
    Math.round(
      orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total_mad || 0), 0) * 100
    ) / 100;
  const unreadMessages = messages.filter((m) => m.status === 'unread').length;

  return {
    totalProducts: products.length,
    availableProducts: products.filter((p) => p.available).length,
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    totalRevenueMad,
    unreadMessages,
    categoryCounts,
    recentOrders: orders.slice(0, 5),
  };
}
