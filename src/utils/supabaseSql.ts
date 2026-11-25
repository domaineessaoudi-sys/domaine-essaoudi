import type { Product, SiteContent } from '../types';

export interface SqlPreset {
  id: string;
  label: string;
  target: 'supabase';
  sql: string;
}

export const SUPABASE_SCHEMA_SQL = `-- Domaine Essaoudi — Schema & Permissions Supabase (PostgreSQL)
-- Collez ce script dans Supabase SQL Editor (ou exécutez-le ici via URI PostgreSQL)
-- pour créer les 4 tables et activer l'accès dynamique du site.

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  desc_fr TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '',
  desc_ar TEXT NOT NULL DEFAULT '',
  price_mad DOUBLE PRECISION NOT NULL,
  unit_fr TEXT NOT NULL,
  unit_en TEXT NOT NULL,
  unit_ar TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT NOT NULL,
  variants_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  harvest_note_fr TEXT NOT NULL DEFAULT '',
  harvest_note_en TEXT NOT NULL DEFAULT '',
  harvest_note_ar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  city TEXT NOT NULL,
  delivery_zone TEXT NOT NULL,
  address TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  delivery_fee_mad DOUBLE PRECISION NOT NULL DEFAULT 0,
  subtotal_mad DOUBLE PRECISION NOT NULL,
  total_mad DOUBLE PRECISION NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  email_status TEXT NOT NULL DEFAULT 'pending_emailjs',
  email_recipient TEXT NOT NULL DEFAULT 'domaineessaoudi@gmail.com',
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.site_content (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages (status);

-- Permissions API REST Supabase (évite l'erreur 42501 permission denied pour anon et service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products, public.orders, public.site_content, public.contact_messages TO service_role;
GRANT SELECT ON TABLE public.products, public.site_content TO anon, authenticated;
GRANT INSERT ON TABLE public.orders, public.contact_messages TO anon, authenticated;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read site_content" ON public.site_content;
CREATE POLICY "Public read site_content" ON public.site_content
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
CREATE POLICY "Public insert orders" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert contact_messages" ON public.contact_messages;
CREATE POLICY "Public insert contact_messages" ON public.contact_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
`;

export const SQL_PRESETS: SqlPreset[] = [
  {
    id: 'supabase-schema',
    label: 'Schema & Permissions Supabase',
    target: 'supabase',
    sql: SUPABASE_SCHEMA_SQL,
  },
  {
    id: 'list-products',
    label: 'Produits & Stock',
    target: 'supabase',
    sql: `SELECT id, category, name_fr, price_mad, stock, available
FROM public.products
ORDER BY category, name_fr;`,
  },
  {
    id: 'list-orders',
    label: 'Dernières Commandes',
    target: 'supabase',
    sql: `SELECT id, customer_name, customer_phone, city, total_mad, status, email_status, created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 25;`,
  },
  {
    id: 'list-messages',
    label: 'Messages Clients',
    target: 'supabase',
    sql: `SELECT id, name, phone, subject, status, created_at
FROM public.contact_messages
ORDER BY created_at DESC
LIMIT 25;`,
  },
  {
    id: 'pg-tables',
    label: 'Tables Supabase (information_schema)',
    target: 'supabase',
    sql: `SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;`,
  },
];

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) {
    return true;
  }

  return false;
}

export function validateSupabaseProjectUrl(rawUrl: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, normalized: '', error: 'URL Supabase invalide (ex: https://xyz.supabase.co).' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, normalized: '', error: 'L’URL Supabase doit utiliser HTTPS.' };
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return { valid: false, normalized: '', error: 'Hôte privé ou local non autorisé.' };
  }
  return { valid: true, normalized: parsed.origin };
}

export function validatePostgresConnectionUri(rawUri: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = rawUri.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  if (/\[YOUR[-_ ]DATABASE[-_ ]PASSWORD\]/i.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      error:
        'Remplacez [YOUR-DATABASE-PASSWORD] par votre vrai mot de passe de base de données Supabase.',
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalized: '',
      error: 'URI PostgreSQL invalide (ex: postgresql://postgres:...@aws-0-eu-central-1.pooler.supabase.com:5432/postgres).',
    };
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    return {
      valid: false,
      normalized: '',
      error: 'L’URI doit commencer par postgres:// ou postgresql://.',
    };
  }
  if (!parsed.hostname || isPrivateOrLoopbackHost(parsed.hostname)) {
    return {
      valid: false,
      normalized: '',
      error: 'L’hôte PostgreSQL doit être une adresse distante valide (Supabase).',
    };
  }
  return { valid: true, normalized: trimmed };
}

export function buildSupabaseRestHeaders(
  apiKey: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  const key = apiKey.trim();
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
  return headers;
}

export function maskPostgresUri(rawUri: string): string {
  const trimmed = rawUri.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const user = parsed.username || 'postgres';
    const port = parsed.port ? `:${parsed.port}` : '';
    const dbName = parsed.pathname || '/postgres';
    return `${parsed.protocol}//${user}:••••••@${parsed.hostname}${port}${dbName}`;
  } catch {
    return 'postgresql://••••••';
  }
}

export function maskSecret(rawSecret: string): string {
  const trimmed = rawSecret.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function sanitizeDatabaseError(message: string): string {
  return String(message || 'Erreur SQL inconnue')
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgresql://[MASQUÉ]')
    .slice(0, 500);
}

export function escapeSqlLiteral(value: string): string {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

export function buildSupabaseFullSql(products: Product[], siteContent: SiteContent): string {
  const productStatements = products.map((p) => {
    const variantsJson = escapeSqlLiteral(JSON.stringify(p.variants || []));
    return `INSERT INTO public.products (
  id, slug, category, subcategory,
  name_fr, name_en, name_ar,
  desc_fr, desc_en, desc_ar,
  price_mad, unit_fr, unit_en, unit_ar,
  stock, available, featured, image_url, variants_json,
  harvest_note_fr, harvest_note_en, harvest_note_ar
) VALUES (
  ${escapeSqlLiteral(p.id)}, ${escapeSqlLiteral(p.slug)}, ${escapeSqlLiteral(p.category)}, ${escapeSqlLiteral(p.subcategory)},
  ${escapeSqlLiteral(p.name_fr)}, ${escapeSqlLiteral(p.name_en)}, ${escapeSqlLiteral(p.name_ar)},
  ${escapeSqlLiteral(p.desc_fr)}, ${escapeSqlLiteral(p.desc_en)}, ${escapeSqlLiteral(p.desc_ar)},
  ${Number(p.price_mad)}, ${escapeSqlLiteral(p.unit_fr)}, ${escapeSqlLiteral(p.unit_en)}, ${escapeSqlLiteral(p.unit_ar)},
  ${Math.max(0, Math.floor(Number(p.stock)))}, ${Boolean(p.available)}, ${Boolean(p.featured)}, ${escapeSqlLiteral(p.image_url)}, ${variantsJson}::jsonb,
  ${escapeSqlLiteral(p.harvest_note_fr || '')}, ${escapeSqlLiteral(p.harvest_note_en || '')}, ${escapeSqlLiteral(p.harvest_note_ar || '')}
)
ON CONFLICT (id) DO UPDATE SET
  name_fr = EXCLUDED.name_fr,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  desc_fr = EXCLUDED.desc_fr,
  desc_en = EXCLUDED.desc_en,
  desc_ar = EXCLUDED.desc_ar,
  price_mad = EXCLUDED.price_mad,
  unit_fr = EXCLUDED.unit_fr,
  unit_en = EXCLUDED.unit_en,
  unit_ar = EXCLUDED.unit_ar,
  stock = EXCLUDED.stock,
  available = EXCLUDED.available,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url,
  variants_json = EXCLUDED.variants_json,
  updated_at = NOW();`;
  });

  const cleanContent: SiteContent = { ...siteContent, testimonials: [] };
  const siteContentJson = escapeSqlLiteral(JSON.stringify(cleanContent));

  return `${SUPABASE_SCHEMA_SQL}
-- Nettoyer toute donnée fictive (demo / test)
DELETE FROM public.orders WHERE id IN ('ORD-2026-101', 'ORD-2026-102', 'ORD-2026-95007');

-- Produits réels Domaine Essaoudi
${productStatements.join('\n\n')}

-- Contenu & Coordonnées réelles Domaine Essaoudi
INSERT INTO public.site_content (key, value_json, updated_at)
VALUES ('main', ${siteContentJson}::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  updated_at = NOW();
`;
}
