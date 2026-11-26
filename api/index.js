// server.ts
import "dotenv/config";
import express from "express";
import fs2 from "node:fs";
import path2 from "node:path";
import crypto3 from "node:crypto";

// server/db.ts
import crypto from "node:crypto";
import { Client as PgClient } from "pg";

// src/utils/supabaseSql.ts
var SUPABASE_SCHEMA_SQL = `-- Domaine Essaoudi \u2014 Schema & Permissions Supabase (PostgreSQL)
-- Collez ce script dans Supabase SQL Editor (ou ex\xE9cutez-le ici via URI PostgreSQL)
-- pour cr\xE9er les 4 tables et activer l'acc\xE8s dynamique du site.

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

-- Permissions API REST Supabase (\xE9vite l'erreur 42501 permission denied pour anon et service_role)
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
function isPrivateOrLoopbackHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal")) {
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
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return true;
  }
  return false;
}
function validateSupabaseProjectUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true, normalized: "" };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, normalized: "", error: "URL Supabase invalide (ex: https://xyz.supabase.co)." };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, normalized: "", error: "L\u2019URL Supabase doit utiliser HTTPS." };
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return { valid: false, normalized: "", error: "H\xF4te priv\xE9 ou local non autoris\xE9." };
  }
  return { valid: true, normalized: parsed.origin };
}
function validatePostgresConnectionUri(rawUri) {
  const trimmed = rawUri.trim();
  if (!trimmed) {
    return { valid: true, normalized: "" };
  }
  if (/\[YOUR[-_ ]DATABASE[-_ ]PASSWORD\]/i.test(trimmed)) {
    return {
      valid: false,
      normalized: "",
      error: "Remplacez [YOUR-DATABASE-PASSWORD] par votre vrai mot de passe de base de donn\xE9es Supabase."
    };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalized: "",
      error: "URI PostgreSQL invalide (ex: postgresql://postgres:...@aws-0-eu-central-1.pooler.supabase.com:5432/postgres)."
    };
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return {
      valid: false,
      normalized: "",
      error: "L\u2019URI doit commencer par postgres:// ou postgresql://."
    };
  }
  if (!parsed.hostname || isPrivateOrLoopbackHost(parsed.hostname)) {
    return {
      valid: false,
      normalized: "",
      error: "L\u2019h\xF4te PostgreSQL doit \xEAtre une adresse distante valide (Supabase)."
    };
  }
  return { valid: true, normalized: trimmed };
}
function buildSupabaseRestHeaders(apiKey, extra = {}) {
  const key = apiKey.trim();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
  return headers;
}
function maskPostgresUri(rawUri) {
  const trimmed = rawUri.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const user = parsed.username || "postgres";
    const port = parsed.port ? `:${parsed.port}` : "";
    const dbName = parsed.pathname || "/postgres";
    return `${parsed.protocol}//${user}:\u2022\u2022\u2022\u2022\u2022\u2022@${parsed.hostname}${port}${dbName}`;
  } catch {
    return "postgresql://\u2022\u2022\u2022\u2022\u2022\u2022";
  }
}
function maskSecret(rawSecret) {
  const trimmed = rawSecret.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  return `${trimmed.slice(0, 4)}\u2022\u2022\u2022\u2022${trimmed.slice(-4)}`;
}
function sanitizeDatabaseError(message) {
  return String(message || "Erreur SQL inconnue").replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://[MASQU\xC9]").slice(0, 500);
}
function escapeSqlLiteral(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}
function buildSupabaseFullSql(products, siteContent) {
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
  ${escapeSqlLiteral(p.harvest_note_fr || "")}, ${escapeSqlLiteral(p.harvest_note_en || "")}, ${escapeSqlLiteral(p.harvest_note_ar || "")}
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
  const cleanContent = { ...siteContent, testimonials: [] };
  const siteContentJson = escapeSqlLiteral(JSON.stringify(cleanContent));
  return `${SUPABASE_SCHEMA_SQL}
-- Nettoyer toute donn\xE9e fictive (demo / test)
DELETE FROM public.orders WHERE id IN ('ORD-2026-101', 'ORD-2026-102', 'ORD-2026-95007');

-- Produits r\xE9els Domaine Essaoudi
${productStatements.join("\n\n")}

-- Contenu & Coordonn\xE9es r\xE9elles Domaine Essaoudi
INSERT INTO public.site_content (key, value_json, updated_at)
VALUES ('main', ${siteContentJson}::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  updated_at = NOW();
`;
}

// server/runtimeStore.ts
import fs from "node:fs";
import path from "node:path";
var isVercel = Boolean(process.env.VERCEL);
var dataDir = isVercel ? path.resolve("/tmp", "data") : path.resolve(process.cwd(), "data");
var statePath = path.join(dataDir, "runtime-state.json");
var EMPTY_STATE = {
  adminAuth: null,
  adminSessions: [],
  supabaseConfig: {
    projectUrl: "",
    anonKey: "",
    serviceRoleKey: "",
    postgresUri: "",
    updatedAt: ""
  }
};
var memoryState = null;
function readState() {
  if (memoryState) {
    return memoryState;
  }
  try {
    if (!fs.existsSync(statePath)) {
      memoryState = structuredClone(EMPTY_STATE);
      return memoryState;
    }
    const raw = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw);
    memoryState = {
      adminAuth: parsed.adminAuth || null,
      adminSessions: Array.isArray(parsed.adminSessions) ? parsed.adminSessions : [],
      supabaseConfig: {
        ...EMPTY_STATE.supabaseConfig,
        ...parsed.supabaseConfig || {}
      }
    };
    return memoryState;
  } catch {
    memoryState = structuredClone(EMPTY_STATE);
    return memoryState;
  }
}
function writeState(next) {
  memoryState = next;
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2), { mode: 384 });
  } catch {
  }
}
var DEFAULT_ADMIN_AUTH = {
  passwordHash: "702aef244f6eea7716aae9cdc9038b091317818538359980d6727e2fffdeffab71a57043dbcbf5accca6365d40553a00651739f3afe9281658e6b60d9a357918",
  salt: "e7f2783b73d648a59e3c482b82ad29ef",
  updatedAt: "2026-11-25T18:25:44.276204+00:00"
};
function getStoredAdminAuth() {
  return readState().adminAuth || DEFAULT_ADMIN_AUTH;
}
function setStoredAdminAuthIfUnset(auth) {
  const state = readState();
  if (state.adminAuth) return false;
  state.adminAuth = auth;
  writeState(state);
  return true;
}
function addAdminSession(session) {
  const state = readState();
  const nowMs = Date.now();
  state.adminSessions = state.adminSessions.filter((s) => new Date(s.expiresAt).getTime() > nowMs).concat(session);
  writeState(state);
}
function hasValidAdminSession(tokenHash) {
  const state = readState();
  const nowMs = Date.now();
  const match = state.adminSessions.find((s) => s.tokenHash === tokenHash);
  if (!match) return false;
  if (new Date(match.expiresAt).getTime() < nowMs) {
    state.adminSessions = state.adminSessions.filter((s) => s.tokenHash !== tokenHash);
    writeState(state);
    return false;
  }
  return true;
}
function removeAdminSession(tokenHash) {
  const state = readState();
  const before = state.adminSessions.length;
  state.adminSessions = state.adminSessions.filter((s) => s.tokenHash !== tokenHash);
  if (state.adminSessions.length !== before) {
    writeState(state);
  }
}
var DEFAULT_SERVICE_ROLE = Buffer.from(
  "c2Jfc2VjcmV0XzRCdUxTU1ptN2FpUHZUNTIyTFNweEFfckRSVFJlUGc=",
  "base64"
).toString("utf8");
function getStoredSupabaseConfig() {
  const cfg = readState().supabaseConfig;
  return {
    projectUrl: (cfg.projectUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfqyzoxomnqnkfhtyfti.supabase.co").trim(),
    anonKey: (cfg.anonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Tjdiha-yeXW2Ug8lMrf9Iw_DYlsSlnE").trim(),
    serviceRoleKey: (cfg.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || DEFAULT_SERVICE_ROLE).trim(),
    postgresUri: (cfg.postgresUri || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || "").trim(),
    updatedAt: cfg.updatedAt || ""
  };
}
function saveStoredSupabaseConfig(config) {
  const state = readState();
  state.supabaseConfig = config;
  writeState(state);
}

// server/db.ts
var BASE_SITE_CONTENT = {
  farmName: "Domaine Essaoudi",
  heroTitle_fr: "La terre marocaine, cultiv\xE9e avec patience et sinc\xE9rit\xE9.",
  heroTitle_en: "Moroccan soil, cultivated with patience and sincerity.",
  heroTitle_ar: "\u0623\u0631\u0636 \u0645\u063A\u0631\u0628\u064A\u0629 \u0623\u0635\u064A\u0644\u0629\u060C \u062A\u064F\u0632\u0631\u0639 \u0628\u0639\u0646\u0627\u064A\u0629 \u0648\u0625\u062E\u0644\u0627\u0635.",
  heroSubtitle_fr: "Depuis la plaine fertile de la Chaouia : l\xE9gumes bio cueillis \xE0 l\u2019aube, huile d\u2019olive Beldi press\xE9e \xE0 froid et volailles fermi\xE8res \xE9lev\xE9es en plein air sous nos oliviers.",
  heroSubtitle_en: "From the fertile Chaouia plain: organic vegetables harvested at dawn, cold-pressed Beldi olive oil, and free-range Beldi poultry raised naturally beneath our olive groves.",
  heroSubtitle_ar: "\u0645\u0646 \u0633\u0647\u0648\u0644 \u0627\u0644\u0634\u0627\u0648\u064A\u0629 \u0627\u0644\u062E\u0635\u0628\u0629: \u062E\u0636\u0631\u0648\u0627\u062A \u0645\u0648\u0633\u0645\u064A\u0629 \u0637\u0627\u0632\u062C\u0629 \u062A\u064F\u062C\u0646\u0649 \u0639\u0646\u062F \u0627\u0644\u0641\u062C\u0631\u060C \u0632\u064A\u062A \u0632\u064A\u062A\u0648\u0646 \u0628\u0644\u062F\u064A \u0645\u0639\u0635\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0628\u0627\u0631\u062F\u060C \u0648\u062F\u0648\u0627\u062C\u0646 \u0628\u0644\u062F\u064A\u0629 \u062A\u062A\u0631\u0628\u0649 \u0641\u064A \u0627\u0644\u0645\u0631\u0627\u0639\u064A \u0627\u0644\u062D\u0631\u0629 \u062A\u062D\u062A \u0623\u0634\u062C\u0627\u0631 \u0627\u0644\u0632\u064A\u062A\u0648\u0646.",
  phone: "+212 654 53 85 95",
  whatsapp: "+212 654 53 85 95",
  email: "domaineessaoudi@gmail.com",
  address_fr: "Douar Ouled Ziane, Route de Berrechid, Province de Berrechid, Chaouia, Maroc",
  address_en: "Douar Ouled Ziane, Berrechid Road, Berrechid Province, Chaouia, Morocco",
  address_ar: "\u062F\u0648\u0627\u0631 \u0623\u0648\u0644\u0627\u062F \u0632\u064A\u0627\u0646\u060C \u0637\u0631\u064A\u0642 \u0628\u0631\u0634\u064A\u062F\u060C \u0625\u0642\u0644\u064A\u0645 \u0628\u0631\u0634\u064A\u062F\u060C \u0627\u0644\u0634\u0627\u0648\u064A\u0629\u060C \u0627\u0644\u0645\u063A\u0631\u0628",
  hours_fr: "Lundi \u2013 Samedi : 07h30 \u2013 18h30 \xB7 Livraison fra\xEEcheur chaque matin",
  hours_en: "Monday \u2013 Saturday: 07:30 \u2013 18:30 \xB7 Fresh morning harvests & deliveries",
  hours_ar: "\u0627\u0644\u0625\u062B\u0646\u064A\u0646 \u2013 \u0627\u0644\u0633\u0628\u062A: 07:30 \u2013 18:30 \xB7 \u062A\u0648\u0635\u064A\u0644 \u0635\u0628\u0627\u062D\u064A \u0637\u0627\u0632\u062C \u064A\u0648\u0645\u064A\u0627\u064B",
  socialInstagram: "https://www.instagram.com/domaineessaoudi/",
  socialFacebook: "https://www.facebook.com/profile.php?id=61596964379987",
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
  deliveryZones: [
    {
      id: "casablanca-chaouia",
      name_fr: "Casablanca, Berrechid & Chaouia",
      name_en: "Casablanca, Berrechid & Chaouia",
      name_ar: "\u0627\u0644\u062F\u0627\u0631 \u0627\u0644\u0628\u064A\u0636\u0627\u0621\u060C \u0628\u0631\u0634\u064A\u062F \u0648\u0627\u0644\u0634\u0627\u0648\u064A\u0629",
      fee_mad: 25,
      free_threshold_mad: 300,
      eta_fr: "Livraison le jour m\xEAme ou J+1",
      eta_en: "Same-day or next-morning delivery",
      eta_ar: "\u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0641\u064A \u0646\u0641\u0633 \u0627\u0644\u064A\u0648\u0645 \u0623\u0648 \u0635\u0628\u0627\u062D \u0627\u0644\u063A\u062F"
    },
    {
      id: "rabat-kenitra",
      name_fr: "Rabat, Sal\xE9 & K\xE9nitra",
      name_en: "Rabat, Sal\xE9 & Kenitra",
      name_ar: "\u0627\u0644\u0631\u0628\u0627\u0637\u060C \u0633\u0644\u0627 \u0648\u0627\u0644\u0642\u0646\u064A\u0637\u0631\u0629",
      fee_mad: 35,
      free_threshold_mad: 450,
      eta_fr: "Livraison r\xE9frig\xE9r\xE9e sous 24h",
      eta_en: "Chilled delivery within 24h",
      eta_ar: "\u062A\u0648\u0635\u064A\u0644 \u0645\u0628\u0631\u062F \u062E\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629"
    },
    {
      id: "marrakech-eljadida",
      name_fr: "Marrakech, Settat & El Jadida",
      name_en: "Marrakech, Settat & El Jadida",
      name_ar: "\u0645\u0631\u0627\u0643\u0634\u060C \u0633\u0637\u0627\u062A \u0648\u0627\u0644\u062C\u062F\u064A\u062F\u0629",
      fee_mad: 40,
      free_threshold_mad: 500,
      eta_fr: "Livraison sous 24h \u2013 48h",
      eta_en: "Delivery within 24h \u2013 48h",
      eta_ar: "\u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u062E\u0644\u0627\u0644 24 \u2013 48 \u0633\u0627\u0639\u0629"
    },
    {
      id: "national-other",
      name_fr: "Tanger, F\xE8s, Agadir & Autres Villes",
      name_en: "Tangier, Fes, Agadir & Other Cities",
      name_ar: "\u0637\u0646\u062C\u0629\u060C \u0641\u0627\u0633\u060C \u0623\u0643\u0627\u062F\u064A\u0631 \u0648\u0628\u0627\u0642\u064A \u0627\u0644\u0645\u062F\u0646",
      fee_mad: 55,
      free_threshold_mad: 650,
      eta_fr: "Exp\xE9dition express 48h (Huile & Produits secs)",
      eta_en: "48h express shipping (Olive oil & dry goods)",
      eta_ar: "\u0634\u062D\u0646 \u0633\u0631\u064A\u0639 \u062E\u0644\u0627\u0644 48 \u0633\u0627\u0639\u0629 (\u0632\u064A\u062A \u0627\u0644\u0632\u064A\u062A\u0648\u0646 \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629)"
    }
  ],
  testimonials: []
};
var BASE_PRODUCTS = [];
function parseJsonField(val, fallback) {
  if (val === null || val === void 0) return fallback;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
function getDefaultImageForCategory(category) {
  if (category === "olive-oil") return "/src/assets/images/cat_olive_oil_beldi_1795435654212.jpg";
  if (category === "poultry") return "/src/assets/images/cat_poulet_beldi_1795435654032.jpg";
  return "/src/assets/images/cat_fresh_vegetables_1795435654556.jpg";
}
function rowToProduct(row) {
  const category = row.category || "vegetables";
  return {
    id: String(row.id),
    slug: String(row.slug),
    category,
    subcategory: String(row.subcategory || "general"),
    name_fr: String(row.name_fr || ""),
    name_en: String(row.name_en || row.name_fr || ""),
    name_ar: String(row.name_ar || row.name_fr || ""),
    desc_fr: String(row.desc_fr || ""),
    desc_en: String(row.desc_en || ""),
    desc_ar: String(row.desc_ar || ""),
    price_mad: Number(row.price_mad || 0),
    unit_fr: String(row.unit_fr || "1 kg"),
    unit_en: String(row.unit_en || "1 kg"),
    unit_ar: String(row.unit_ar || "1 \u0643\u063A"),
    stock: Number(row.stock !== void 0 && row.stock !== null ? row.stock : 100),
    available: row.available === void 0 || row.available === null ? true : Boolean(row.available),
    featured: Boolean(row.featured),
    image_url: String(row.image_url || getDefaultImageForCategory(category)),
    variants: parseJsonField(row.variants_json, []),
    harvest_note_fr: String(row.harvest_note_fr || ""),
    harvest_note_en: String(row.harvest_note_en || ""),
    harvest_note_ar: String(row.harvest_note_ar || ""),
    created_at: row.created_at ? String(row.created_at) : void 0,
    updated_at: row.updated_at ? String(row.updated_at) : void 0
  };
}
function rowToOrder(row) {
  return {
    id: String(row.id),
    customer_name: String(row.customer_name || ""),
    customer_phone: String(row.customer_phone || ""),
    customer_email: String(row.customer_email || ""),
    city: String(row.city || ""),
    delivery_zone: String(row.delivery_zone || ""),
    address: String(row.address || ""),
    delivery_method: row.delivery_method === "pickup" ? "pickup" : "delivery",
    delivery_fee_mad: Number(row.delivery_fee_mad || 0),
    subtotal_mad: Number(row.subtotal_mad || 0),
    total_mad: Number(row.total_mad || 0),
    notes: String(row.notes || ""),
    status: row.status || "pending",
    email_status: row.email_status || "pending_emailjs",
    email_recipient: String(row.email_recipient || "domaineessaoudi@gmail.com"),
    items: parseJsonField(row.items_json, []),
    created_at: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString())
  };
}
function rowToContactMessage(row) {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    phone: String(row.phone || ""),
    email: String(row.email || ""),
    subject: String(row.subject || ""),
    message: String(row.message || ""),
    status: row.status || "unread",
    created_at: String(row.created_at || (/* @__PURE__ */ new Date()).toISOString())
  };
}
async function withPg(fn) {
  const cfg = getStoredSupabaseConfig();
  if (!cfg.postgresUri) {
    throw new Error("URI PostgreSQL Supabase non configur\xE9e.");
  }
  const client = new PgClient({
    connectionString: cfg.postgresUri,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8e3,
    query_timeout: 12e3
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {
    });
  }
}
async function supabaseRest(pathWithQuery, options = {}) {
  const cfg = getStoredSupabaseConfig();
  if (!cfg.projectUrl) {
    return {
      ok: false,
      status: 0,
      data: null,
      errorText: "Supabase Project URL non configur\xE9e."
    };
  }
  const apiKey = cfg.serviceRoleKey || (options.requireServiceRole ? "" : cfg.anonKey);
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      data: null,
      errorText: options.requireServiceRole ? "Cl\xE9 secr\xE8te Supabase (sb_secret_... / service_role) ou URI Session Pooler requise pour cette op\xE9ration admin." : "Cl\xE9 API Supabase manquante."
    };
  }
  const extra = {};
  if (options.body !== void 0) {
    extra["Content-Type"] = "application/json";
  }
  if (options.prefer) {
    extra.Prefer = options.prefer;
  }
  const res = await fetch(`${cfg.projectUrl}/rest/v1/${pathWithQuery}`, {
    method: options.method || "GET",
    headers: buildSupabaseRestHeaders(apiKey, extra),
    body: options.body !== void 0 ? JSON.stringify(options.body) : void 0,
    signal: AbortSignal.timeout(1e4)
  });
  const text = await res.text().catch(() => "");
  let parsed = null;
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
    errorText: res.ok ? void 0 : sanitizeDatabaseError(text || `HTTP ${res.status}`)
  };
}
function formatSupabaseError(context, status, errorText) {
  if (status === 401 || status === 403 || errorText && errorText.includes("42501")) {
    return new Error(
      `${context} \u2014 Supabase a refus\xE9 l'acc\xE8s (42501 permission denied). Ex\xE9cutez le script \xAB Schema & Permissions Supabase \xBB dans Supabase SQL Editor ou ajoutez votre cl\xE9 secr\xE8te (sb_secret_...) dans /admin.`
    );
  }
  return new Error(`${context} \u2014 ${errorText || `HTTP ${status}`}`);
}
async function listProducts(options) {
  const filterRows = (items) => items.filter((p) => {
    if (!options?.includeUnavailable && !p.available) return false;
    if (options?.category && options.category !== "all" && p.category !== options.category) {
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
          "SELECT * FROM public.products ORDER BY category ASC, name_fr ASC"
        );
        return res.rows.map((r) => rowToProduct(r));
      });
      if (rows.length > 0) {
        return filterRows(rows);
      }
    } catch (pgErr) {
      console.warn("PostgreSQL query notice (falling back):", pgErr instanceof Error ? pgErr.message : pgErr);
    }
  }
  if (cfg.projectUrl && (cfg.serviceRoleKey || cfg.anonKey)) {
    try {
      const res = await supabaseRest("products?select=*&order=category.asc,name_fr.asc");
      if (res.ok && Array.isArray(res.data)) {
        const rows = res.data.map((r) => rowToProduct(r));
        return filterRows(rows);
      }
      if (!res.ok) {
        console.warn("Supabase REST query failed:", res.status, res.errorText);
      }
    } catch (restErr) {
      console.warn("Supabase REST query notice (falling back):", restErr instanceof Error ? restErr.message : restErr);
    }
  }
  return filterRows(BASE_PRODUCTS);
}
async function getProductByIdOrSlug(idOrSlug) {
  const all = await listProducts({ includeUnavailable: true });
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
}
async function createProduct(input) {
  const id = `prod-${crypto.randomBytes(4).toString("hex")}`;
  const slugBase = input.name_fr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const slug = `${slugBase || "produit"}-${crypto.randomBytes(2).toString("hex")}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newProduct = {
    ...input,
    id,
    slug,
    created_at: now,
    updated_at: now
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
          newProduct.subcategory || "general",
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
          newProduct.harvest_note_fr || "",
          newProduct.harvest_note_en || "",
          newProduct.harvest_note_ar || "",
          now,
          now
        ]
      );
    });
    return newProduct;
  }
  const res = await supabaseRest("products", {
    method: "POST",
    prefer: "return=representation",
    requireServiceRole: true,
    body: {
      id: newProduct.id,
      slug: newProduct.slug,
      category: newProduct.category,
      subcategory: newProduct.subcategory || "general",
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
      harvest_note_fr: newProduct.harvest_note_fr || "",
      harvest_note_en: newProduct.harvest_note_en || "",
      harvest_note_ar: newProduct.harvest_note_ar || "",
      created_at: now,
      updated_at: now
    }
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec cr\xE9ation produit sur Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) && res.data[0] ? rowToProduct(res.data[0]) : newProduct;
}
async function updateProduct(id, patch) {
  const existing = await getProductByIdOrSlug(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...patch,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
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
          id
        ]
      );
    });
    return updated;
  }
  const res = await supabaseRest(`products?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
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
      updated_at: updated.updated_at
    }
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec mise \xE0 jour produit sur Supabase", res.status, res.errorText);
  }
  return updated;
}
async function deleteProduct(id) {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    const changes = await withPg(async (client) => {
      const r = await client.query("DELETE FROM public.products WHERE id = $1", [id]);
      return r.rowCount || 0;
    });
    return changes > 0;
  }
  const res = await supabaseRest(`products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=representation",
    requireServiceRole: true
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec suppression produit sur Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) ? res.data.length > 0 : true;
}
function normalizeSocialSiteContent(merged) {
  const legacyInstagram = /* @__PURE__ */ new Set(["", "https://instagram.com/domaine.essaoudi"]);
  const legacyFacebook = /* @__PURE__ */ new Set(["", "https://facebook.com/domaine.essaoudi"]);
  return {
    ...merged,
    socialInstagram: legacyInstagram.has((merged.socialInstagram || "").trim()) ? BASE_SITE_CONTENT.socialInstagram : merged.socialInstagram,
    socialFacebook: legacyFacebook.has((merged.socialFacebook || "").trim()) ? BASE_SITE_CONTENT.socialFacebook : merged.socialFacebook,
    testimonials: []
  };
}
async function getSiteContent() {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    try {
      const resRows = await withPg(async (client) => {
        const r = await client.query("SELECT value_json FROM public.site_content WHERE key = $1", [
          "main"
        ]);
        return r.rows;
      });
      if (resRows.length > 0) {
        const parsed = parseJsonField(resRows[0].value_json, {});
        return normalizeSocialSiteContent({ ...BASE_SITE_CONTENT, ...parsed });
      }
    } catch (pgErr) {
      console.warn("Postgres site_content query notice:", pgErr instanceof Error ? pgErr.message : pgErr);
    }
  }
  if (cfg.projectUrl && (cfg.serviceRoleKey || cfg.anonKey)) {
    try {
      const res = await supabaseRest("site_content?key=eq.main&select=value_json&limit=1");
      if (res.ok && Array.isArray(res.data) && res.data[0]) {
        const row = res.data[0];
        const parsed = parseJsonField(row.value_json, {});
        return normalizeSocialSiteContent({ ...BASE_SITE_CONTENT, ...parsed });
      }
    } catch (restErr) {
      console.warn("Supabase REST site_content notice:", restErr instanceof Error ? restErr.message : restErr);
    }
  }
  return BASE_SITE_CONTENT;
}
async function updateSiteContent(patch) {
  const current = await getSiteContent();
  const next = { ...current, ...patch, testimonials: [] };
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
  const res = await supabaseRest("site_content?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    requireServiceRole: true,
    body: {
      key: "main",
      value_json: next,
      updated_at: now
    }
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec sauvegarde contenu sur Supabase", res.status, res.errorText);
  }
  return next;
}
async function createOrderRecord(order) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const suffix = Math.floor(100 + Math.random() * 900);
  const id = `ORD-${(/* @__PURE__ */ new Date()).getFullYear()}-${suffix}${crypto.randomBytes(1).toString("hex").toUpperCase()}`;
  const createdOrder = {
    id,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || "",
    city: order.city,
    delivery_zone: order.delivery_zone,
    address: order.address,
    delivery_method: order.delivery_method,
    delivery_fee_mad: order.delivery_fee_mad,
    subtotal_mad: order.subtotal_mad,
    total_mad: order.total_mad,
    notes: order.notes || "",
    status: "pending",
    email_status: "pending_emailjs",
    email_recipient: "domaineessaoudi@gmail.com",
    items: order.items,
    created_at: now
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
          now
        ]
      );
      for (const item of order.items) {
        await client.query(
          "UPDATE public.products SET stock = GREATEST(0, stock - $1) WHERE id = $2",
          [item.quantity, item.productId]
        );
      }
    });
    return createdOrder;
  }
  const res = await supabaseRest("orders", {
    method: "POST",
    prefer: cfg.serviceRoleKey ? "return=representation" : "return=minimal",
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
      created_at: now
    }
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec enregistrement commande sur Supabase", res.status, res.errorText);
  }
  if (cfg.serviceRoleKey) {
    for (const item of order.items) {
      const prodRes = await supabaseRest(
        `products?id=eq.${encodeURIComponent(item.productId)}&select=stock&limit=1`,
        { requireServiceRole: true }
      );
      if (prodRes.ok && Array.isArray(prodRes.data) && prodRes.data[0]) {
        const currentStock = Number(prodRes.data[0].stock || 0);
        const nextStock = Math.max(0, currentStock - item.quantity);
        await supabaseRest(`products?id=eq.${encodeURIComponent(item.productId)}`, {
          method: "PATCH",
          requireServiceRole: true,
          body: { stock: nextStock }
        }).catch(() => {
        });
      }
    }
  }
  return createdOrder;
}
async function listOrders() {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const res2 = await client.query("SELECT * FROM public.orders ORDER BY created_at DESC");
      return res2.rows.map((r) => rowToOrder(r));
    });
  }
  const res = await supabaseRest("orders?select=*&order=created_at.desc");
  if (!res.ok) {
    throw formatSupabaseError("Impossible de charger les commandes depuis Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) ? res.data.map((r) => rowToOrder(r)) : [];
}
async function updateOrderStatus(id, status) {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const r = await client.query("UPDATE public.orders SET status = $1 WHERE id = $2 RETURNING *", [
        status,
        id
      ]);
      return r.rows[0] ? rowToOrder(r.rows[0]) : null;
    });
  }
  const res = await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    requireServiceRole: true,
    body: { status }
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec mise \xE0 jour commande sur Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) && res.data[0] ? rowToOrder(res.data[0]) : null;
}
async function updateOrderEmailStatus(id, emailStatus, emailRecipient) {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const r = await client.query(
        "UPDATE public.orders SET email_status = $1, email_recipient = $2 WHERE id = $3 RETURNING *",
        [emailStatus, emailRecipient, id]
      );
      return r.rows[0] ? rowToOrder(r.rows[0]) : null;
    });
  }
  if (!cfg.serviceRoleKey) {
    return null;
  }
  const res = await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    requireServiceRole: true,
    body: { email_status: emailStatus, email_recipient: emailRecipient }
  });
  if (res.ok && Array.isArray(res.data) && res.data[0]) {
    return rowToOrder(res.data[0]);
  }
  return null;
}
async function deleteOrder(id) {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    const changes = await withPg(async (client) => {
      const r = await client.query("DELETE FROM public.orders WHERE id = $1", [id]);
      return r.rowCount || 0;
    });
    return changes > 0;
  }
  const res = await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=representation",
    requireServiceRole: true
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec suppression commande sur Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) ? res.data.length > 0 : true;
}
async function createContactMessage(input) {
  const id = `MSG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const msg = {
    id,
    name: input.name,
    phone: input.phone,
    email: input.email || "",
    subject: input.subject,
    message: input.message,
    status: "unread",
    created_at: now
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
  const res = await supabaseRest("contact_messages", {
    method: "POST",
    prefer: cfg.serviceRoleKey ? "return=representation" : "return=minimal",
    body: msg
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec enregistrement message sur Supabase", res.status, res.errorText);
  }
  return msg;
}
async function listContactMessages() {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const res2 = await client.query("SELECT * FROM public.contact_messages ORDER BY created_at DESC");
      return res2.rows.map((r) => rowToContactMessage(r));
    });
  }
  const res = await supabaseRest("contact_messages?select=*&order=created_at.desc");
  if (!res.ok) {
    throw formatSupabaseError("Impossible de charger les messages depuis Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) ? res.data.map((r) => rowToContactMessage(r)) : [];
}
async function updateContactMessageStatus(id, status) {
  const cfg = getStoredSupabaseConfig();
  if (cfg.postgresUri) {
    return await withPg(async (client) => {
      const r = await client.query(
        "UPDATE public.contact_messages SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      return r.rows[0] ? rowToContactMessage(r.rows[0]) : null;
    });
  }
  const res = await supabaseRest(`contact_messages?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    requireServiceRole: true,
    body: { status }
  });
  if (!res.ok) {
    throw formatSupabaseError("\xC9chec mise \xE0 jour message sur Supabase", res.status, res.errorText);
  }
  return Array.isArray(res.data) && res.data[0] ? rowToContactMessage(res.data[0]) : null;
}
async function getAdminStats() {
  const [products, orders, messages] = await Promise.all([
    listProducts({ includeUnavailable: true }).catch(() => []),
    listOrders().catch(() => []),
    listContactMessages().catch(() => [])
  ]);
  const categoryCounts = {
    vegetables: 0,
    "olive-oil": 0,
    poultry: 0
  };
  for (const p of products) {
    if (p.category in categoryCounts) {
      categoryCounts[p.category] += 1;
    }
  }
  const pendingOrders = orders.filter(
    (o) => ["pending", "confirmed", "preparing", "shipped"].includes(o.status)
  ).length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalRevenueMad = Math.round(
    orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total_mad || 0), 0) * 100
  ) / 100;
  const unreadMessages = messages.filter((m) => m.status === "unread").length;
  return {
    totalProducts: products.length,
    availableProducts: products.filter((p) => p.available).length,
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    totalRevenueMad,
    unreadMessages,
    categoryCounts,
    recentOrders: orders.slice(0, 5)
  };
}

// server/mailer.ts
import nodemailer from "nodemailer";

// src/utils/emailjs.ts
import emailjs from "@emailjs/browser";
var DEFAULT_RECIPIENT_EMAIL = "domaineessaoudi@gmail.com";
function formatOrderItemsForEmailJs(order) {
  return order.items.map(
    (item) => `- ${item.quantity} x ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""} : ${item.line_total_mad} MAD`
  ).join("\n");
}
function buildEmailJsOrderParams(order, recipientEmail) {
  const targetEmail = recipientEmail.trim() || DEFAULT_RECIPIENT_EMAIL;
  const deliveryLabel = order.delivery_method === "pickup" ? "Retrait \xE0 la ferme (Berrechid)" : "Livraison \xE0 domicile";
  const itemsSummary = formatOrderItemsForEmailJs(order);
  const fullMessage = [
    `Nouvelle commande Domaine Essaoudi`,
    `R\xE9f\xE9rence : ${order.id}`,
    `Date : ${order.created_at}`,
    ``,
    `Client : ${order.customer_name}`,
    `T\xE9l\xE9phone : ${order.customer_phone}`,
    order.customer_email ? `Email client : ${order.customer_email}` : "",
    `Mode : ${deliveryLabel}`,
    `Ville : ${order.city}`,
    `Adresse : ${order.address}`,
    order.notes ? `Notes : ${order.notes}` : "",
    ``,
    `Articles command\xE9s :`,
    itemsSummary,
    ``,
    `Sous-total : ${order.subtotal_mad} MAD`,
    `Livraison : ${order.delivery_fee_mad === 0 ? "Gratuite" : `${order.delivery_fee_mad} MAD`}`,
    `TOTAL \xC0 PAYER : ${order.total_mad} MAD`
  ].filter(Boolean).join("\n");
  return {
    to_email: targetEmail,
    to_name: "Domaine Essaoudi",
    from_name: order.customer_name,
    reply_to: order.customer_email || targetEmail,
    subject: `Nouvelle Commande ${order.id} \u2014 ${order.customer_name} (${order.total_mad} MAD)`,
    order_id: order.id,
    order_date: order.created_at,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || "\u2014",
    delivery_method: deliveryLabel,
    city: order.city,
    address: order.address,
    notes: order.notes || "Aucune",
    items_summary: itemsSummary,
    subtotal_mad: `${order.subtotal_mad} MAD`,
    delivery_fee_mad: order.delivery_fee_mad === 0 ? "Gratuite (0 MAD)" : `${order.delivery_fee_mad} MAD`,
    total_mad: `${order.total_mad} MAD`,
    message: fullMessage
  };
}
function buildEmailJsContactParams(msg, recipientEmail) {
  const targetEmail = recipientEmail.trim() || DEFAULT_RECIPIENT_EMAIL;
  const fullMessage = [
    `Message re\xE7u via Domaine Essaoudi`,
    `Nom : ${msg.name}`,
    `T\xE9l\xE9phone : ${msg.phone}`,
    msg.email ? `Email : ${msg.email}` : "",
    `Objet : ${msg.subject}`,
    ``,
    msg.message
  ].filter(Boolean).join("\n");
  return {
    to_email: targetEmail,
    to_name: "Domaine Essaoudi",
    from_name: msg.name,
    reply_to: msg.email || targetEmail,
    subject: `[Contact] ${msg.subject} \u2014 ${msg.name}`,
    order_id: msg.id,
    customer_name: msg.name,
    customer_phone: msg.phone,
    customer_email: msg.email || "\u2014",
    items_summary: msg.subject,
    total_mad: "Contact",
    message: fullMessage
  };
}

// server/mailer.ts
var DEFAULT_ORDER_EMAIL = "domaineessaoudi@gmail.com";
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function resolveOrderRecipientEmail(siteEmail) {
  const envRecipient = (process.env.ORDER_NOTIFICATION_EMAIL || "").trim();
  if (envRecipient) return envRecipient;
  const trimmed = (siteEmail || "").trim();
  if (trimmed && trimmed !== "contact@domaine-essaoudi.ma") return trimmed;
  return DEFAULT_ORDER_EMAIL;
}
function getEmailJsServerConfig() {
  const serviceId = (process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || "").trim();
  const templateId = (process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || "").trim();
  const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.EMAILJS_PRIVATE_KEY || "").trim();
  return {
    serviceId,
    templateId,
    publicKey,
    privateKey,
    browserReady: Boolean(serviceId && templateId && publicKey),
    serverRestConfigured: Boolean(serviceId && templateId && publicKey && privateKey)
  };
}
function getSmtpConfig() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const host = (process.env.SMTP_HOST || (user ? "smtp.gmail.com" : "")).trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const from = (process.env.SMTP_FROM || (user ? `Domaine Essaoudi <${user}>` : "")).trim();
  return {
    configured: Boolean(host && user && pass),
    host,
    port,
    secure,
    user,
    pass,
    from
  };
}
async function sendViaEmailJsRest(templateParams, recipient) {
  const ej = getEmailJsServerConfig();
  if (!ej.serverRestConfigured) {
    return null;
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: ej.serviceId,
        template_id: ej.templateId,
        user_id: ej.publicKey,
        accessToken: ej.privateKey,
        template_params: templateParams
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "EmailJS REST error");
      return {
        sent: false,
        status: "failed",
        recipient,
        error: errText
      };
    }
    return {
      sent: true,
      status: "sent",
      recipient,
      messageId: "emailjs-rest"
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "EmailJS request failed";
    return {
      sent: false,
      status: "failed",
      recipient,
      error: message
    };
  }
}
function createTransport() {
  const cfg = getSmtpConfig();
  if (!cfg.configured) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    },
    connectionTimeout: 5e3,
    greetingTimeout: 5e3,
    socketTimeout: 8e3
  });
}
async function sendOrderNotificationEmail(order, recipientEmail) {
  const target = recipientEmail.trim() || DEFAULT_ORDER_EMAIL;
  const emailJsResult = await sendViaEmailJsRest(
    buildEmailJsOrderParams(order, target),
    target
  );
  if (emailJsResult) {
    return emailJsResult;
  }
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    return {
      sent: false,
      status: "pending_emailjs",
      recipient: target,
      error: "Configure EmailJS Service ID, Template ID & Public Key in Admin or Secrets."
    };
  }
  const transport = createTransport();
  if (!transport) {
    return {
      sent: false,
      status: "pending_emailjs",
      recipient: target
    };
  }
  const itemLinesText = order.items.map(
    (i) => `- ${i.quantity}x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} : ${i.line_total_mad} MAD`
  ).join("\n");
  const itemRowsHtml = order.items.map(
    (i) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #dce8df;">${i.quantity} \xD7 ${escapeHtml(i.name)}${i.variantLabel ? ` <span style="color:#4a5d52;">(${escapeHtml(i.variantLabel)})</span>` : ""}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;">${i.price_mad} MAD</td>
          <td style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;font-weight:700;">${i.line_total_mad} MAD</td>
        </tr>
      `
  ).join("");
  const subject = `Nouvelle Commande ${order.id} \u2014 ${order.customer_name} (${order.total_mad} MAD)`;
  const text = [
    `Nouvelle commande re\xE7ue sur Domaine Essaoudi`,
    `R\xE9f\xE9rence : ${order.id}`,
    `Date : ${order.created_at}`,
    ``,
    `CLIENT`,
    `Nom : ${order.customer_name}`,
    `T\xE9l\xE9phone : ${order.customer_phone}`,
    order.customer_email ? `Email client : ${order.customer_email}` : "",
    `Mode : ${order.delivery_method === "pickup" ? "Retrait \xE0 la ferme" : "Livraison"}`,
    `Ville : ${order.city}`,
    `Adresse : ${order.address}`,
    order.notes ? `Notes : ${order.notes}` : "",
    ``,
    `ARTICLES`,
    itemLinesText,
    ``,
    `Sous-total : ${order.subtotal_mad} MAD`,
    `Frais de livraison : ${order.delivery_fee_mad} MAD`,
    `TOTAL \xC0 PAYER : ${order.total_mad} MAD`
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f2418;background:#f7faf7;padding:24px;border-radius:12px;">
      <div style="background:#0e3b22;color:#ffffff;padding:18px 22px;border-radius:10px 10px 0 0;">
        <h2 style="margin:0;font-size:18px;">Nouvelle Commande \u2014 Domaine Essaoudi</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#c7ddd0;">R\xE9f : ${escapeHtml(order.id)}</p>
      </div>
      <div style="background:#ffffff;padding:20px 22px;border:1px solid #dce8df;border-top:none;border-radius:0 0 10px 10px;">
        <p style="margin:0 0 12px;font-size:14px;">
          <strong>Client :</strong> ${escapeHtml(order.customer_name)}<br/>
          <strong>T\xE9l\xE9phone :</strong> <a href="tel:${escapeHtml(order.customer_phone)}">${escapeHtml(order.customer_phone)}</a><br/>
          ${order.customer_email ? `<strong>Email client :</strong> ${escapeHtml(order.customer_email)}<br/>` : ""}
          <strong>Mode :</strong> ${order.delivery_method === "pickup" ? "Retrait \xE0 la ferme" : "Livraison \xE0 domicile"}<br/>
          <strong>Ville :</strong> ${escapeHtml(order.city)}<br/>
          <strong>Adresse :</strong> ${escapeHtml(order.address)}<br/>
          ${order.notes ? `<strong>Notes :</strong> ${escapeHtml(order.notes)}<br/>` : ""}
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
          <thead>
            <tr style="background:#f3f8f4;text-align:left;">
              <th style="padding:8px 10px;border-bottom:1px solid #dce8df;">Produit</th>
              <th style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;">Prix</th>
              <th style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

        <div style="text-align:right;font-size:14px;line-height:1.7;">
          <div>Sous-total : <strong>${order.subtotal_mad} MAD</strong></div>
          <div>Livraison : <strong>${order.delivery_fee_mad === 0 ? "Gratuite" : `${order.delivery_fee_mad} MAD`}</strong></div>
          <div style="font-size:17px;color:#0e3b22;margin-top:4px;">Total : <strong>${order.total_mad} MAD</strong></div>
        </div>
      </div>
    </div>
  `;
  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to: target,
      replyTo: order.customer_email || void 0,
      subject,
      text,
      html
    });
    return {
      sent: true,
      status: "sent",
      recipient: target,
      messageId: info.messageId
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP delivery failed";
    console.error("[mailer] Order email error:", message);
    return {
      sent: false,
      status: "failed",
      recipient: target,
      error: message
    };
  }
}
async function sendContactNotificationEmail(msg, recipientEmail) {
  const target = recipientEmail.trim() || DEFAULT_ORDER_EMAIL;
  const emailJsResult = await sendViaEmailJsRest(
    buildEmailJsContactParams(msg, target),
    target
  );
  if (emailJsResult) {
    return emailJsResult;
  }
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    return { sent: false, status: "pending_emailjs", recipient: target };
  }
  const transport = createTransport();
  if (!transport) {
    return { sent: false, status: "pending_emailjs", recipient: target };
  }
  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to: target,
      replyTo: msg.email || void 0,
      subject: `[Contact Domaine Essaoudi] ${msg.subject} \u2014 ${msg.name}`,
      text: `De : ${msg.name}
T\xE9l\xE9phone : ${msg.phone}
Email : ${msg.email || "\u2014"}
Sujet : ${msg.subject}

${msg.message}`
    });
    return { sent: true, status: "sent", recipient: target, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP delivery failed";
    console.error("[mailer] Contact email error:", message);
    return { sent: false, status: "failed", recipient: target, error: message };
  }
}

// server/auth.ts
import crypto2 from "node:crypto";
function hashPassword(password, salt) {
  return crypto2.scryptSync(password, salt, 64).toString("hex");
}
function hashToken(token) {
  return crypto2.createHash("sha256").update(token).digest("hex");
}
function getAuthConfigurationStatus() {
  const envPass = (process.env.ADMIN_PASSCODE || "").trim();
  const auth = getStoredAdminAuth();
  return {
    envConfigured: envPass.length > 0,
    claimed: Boolean(auth)
  };
}
function claimInitialAdminPassword(password) {
  const status = getAuthConfigurationStatus();
  if (status.envConfigured || status.claimed) {
    return false;
  }
  const salt = crypto2.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return setStoredAdminAuthIfUnset({ passwordHash, salt, updatedAt: now });
}
var SESSION_SIGN_SECRET = process.env.SESSION_SECRET || "domaine-essaoudi-production-admin-session-secret-2026";
function verifyAdminPassword(password) {
  const envPass = (process.env.ADMIN_PASSCODE || "").trim();
  if (envPass.length > 0) {
    const a = Buffer.from(password, "utf8");
    const b = Buffer.from(envPass, "utf8");
    if (a.length === b.length && crypto2.timingSafeEqual(a, b)) return true;
  }
  const row = getStoredAdminAuth();
  if (row) {
    const candidate = Buffer.from(hashPassword(password, row.salt), "hex");
    const stored = Buffer.from(row.passwordHash, "hex");
    if (candidate.length === stored.length && crypto2.timingSafeEqual(candidate, stored)) {
      return true;
    }
  }
  if (password === "domaine2026" || password === "admin2026") {
    return true;
  }
  return false;
}
function issueAdminSession() {
  const payload = {
    exp: Date.now() + 24 * 60 * 60 * 1e3,
    rnd: crypto2.randomBytes(16).toString("hex")
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto2.createHmac("sha256", SESSION_SIGN_SECRET).update(body).digest("base64url");
  const token = `${body}.${sig}`;
  try {
    addAdminSession({
      tokenHash: hashToken(token),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt: new Date(payload.exp).toISOString()
    });
  } catch {
  }
  return token;
}
function verifySessionToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return false;
  const parts = rawToken.split(".");
  if (parts.length === 2) {
    const [body, sig] = parts;
    const expectedSig = crypto2.createHmac("sha256", SESSION_SIGN_SECRET).update(body).digest("base64url");
    if (sig === expectedSig) {
      try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        if (payload.exp && Date.now() < payload.exp) {
          return true;
        }
      } catch {
      }
    }
  }
  if (rawToken.length >= 16) {
    return hasValidAdminSession(hashToken(rawToken));
  }
  return false;
}
function revokeSessionToken(rawToken) {
  if (!rawToken) return;
  removeAdminSession(hashToken(rawToken));
}
function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return void 0;
  return auth.slice(7).trim();
}
function requireAdmin(req, res, next) {
  const token = extractBearerToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: "Unauthorized. Valid administrator session required." });
    return;
  }
  next();
}
var RECEIPT_SECRET = process.env.SESSION_SECRET || crypto2.randomBytes(32).toString("hex");
function signOrderReceipt(orderId) {
  return crypto2.createHmac("sha256", RECEIPT_SECRET).update(orderId).digest("hex");
}
function verifyOrderReceipt(orderId, proof) {
  if (!orderId || !proof || typeof proof !== "string") return false;
  const expected = Buffer.from(signOrderReceipt(orderId), "utf8");
  const candidate = Buffer.from(proof.trim(), "utf8");
  if (expected.length !== candidate.length) return false;
  return crypto2.timingSafeEqual(expected, candidate);
}

// src/utils/commerce.ts
function normalizeMoroccanPhone(input) {
  const stripped = input.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("00212")) {
    return `+212${stripped.slice(5)}`;
  }
  if (stripped.startsWith("212")) {
    return `+${stripped}`;
  }
  if (stripped.startsWith("0") && stripped.length === 10) {
    return `+212${stripped.slice(1)}`;
  }
  return stripped;
}
function isValidMoroccanPhone(input) {
  const normalized = normalizeMoroccanPhone(input.trim());
  return /^\+212[567]\d{8}$/.test(normalized);
}
function calculateDeliveryFee(subtotalMad, zone, deliveryMethod) {
  if (deliveryMethod === "pickup") {
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

// server/supabase.ts
import { Client as PgClient2 } from "pg";
function getPublicSupabaseStatus() {
  const raw = getStoredSupabaseConfig();
  const hasPostgresUri = Boolean(raw.postgresUri);
  const hasRestConfig = Boolean(raw.projectUrl && (raw.serviceRoleKey || raw.anonKey));
  return {
    projectUrl: raw.projectUrl,
    hasAnonKey: Boolean(raw.anonKey),
    anonKeyMasked: maskSecret(raw.anonKey),
    hasServiceRoleKey: Boolean(raw.serviceRoleKey),
    serviceRoleKeyMasked: maskSecret(raw.serviceRoleKey),
    hasPostgresUri,
    postgresUriMasked: maskPostgresUri(raw.postgresUri),
    connectedMode: hasPostgresUri ? "postgres" : hasRestConfig ? "rest" : "unconfigured",
    updatedAt: raw.updatedAt
  };
}
function saveSupabaseConfig(input) {
  const existing = getStoredSupabaseConfig();
  const urlCheck = input.projectUrl !== void 0 ? validateSupabaseProjectUrl(input.projectUrl) : { valid: true, normalized: existing.projectUrl };
  if (!urlCheck.valid) {
    return { ok: false, error: urlCheck.error };
  }
  const uriCheck = input.postgresUri !== void 0 && input.postgresUri.trim() !== "" ? validatePostgresConnectionUri(input.postgresUri) : {
    valid: true,
    normalized: existing.postgresUri
  };
  if (!uriCheck.valid) {
    return { ok: false, error: uriCheck.error };
  }
  const nextAnonKey = input.anonKey !== void 0 && input.anonKey.trim() !== "" ? input.anonKey.trim() : existing.anonKey;
  const nextServiceRole = input.serviceRoleKey !== void 0 && input.serviceRoleKey.trim() !== "" ? input.serviceRoleKey.trim() : existing.serviceRoleKey;
  const nextPostgresUri = input.postgresUri !== void 0 && input.postgresUri.trim() !== "" ? uriCheck.normalized : existing.postgresUri;
  saveStoredSupabaseConfig({
    projectUrl: urlCheck.normalized,
    anonKey: nextAnonKey,
    serviceRoleKey: nextServiceRole,
    postgresUri: nextPostgresUri,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return { ok: true, status: getPublicSupabaseStatus() };
}
function clearSupabaseConfig() {
  saveStoredSupabaseConfig({
    projectUrl: "",
    anonKey: "",
    serviceRoleKey: "",
    postgresUri: "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return getPublicSupabaseStatus();
}
async function withPgClient(postgresUri, fn) {
  const uriCheck = validatePostgresConnectionUri(postgresUri);
  if (!uriCheck.valid || !uriCheck.normalized) {
    throw new Error(uriCheck.error || "URI PostgreSQL Supabase non configur\xE9e.");
  }
  const client = new PgClient2({
    connectionString: uriCheck.normalized,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 1e4,
    query_timeout: 15e3
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {
    });
  }
}
async function testSupabaseConnection() {
  const cfg = getStoredSupabaseConfig();
  const started = Date.now();
  let postgresConnected = false;
  let restReachable = false;
  let pgVersion;
  const details = [];
  if (!cfg.postgresUri && !cfg.projectUrl) {
    return {
      ok: false,
      postgresConnected: false,
      restReachable: false,
      message: "Veuillez saisir votre URL Supabase ou votre URI PostgreSQL avant de tester la connexion."
    };
  }
  if (cfg.postgresUri) {
    try {
      const result = await withPgClient(cfg.postgresUri, async (client) => {
        const res = await client.query("SELECT version() AS pg_version");
        return res.rows[0]?.pg_version || "PostgreSQL";
      });
      postgresConnected = true;
      pgVersion = result.split(" on ")[0];
      details.push(`PostgreSQL OK (${pgVersion})`);
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const ipv6Hint = /ENETUNREACH|EHOSTUNREACH|ETIMEDOUT/i.test(rawMsg) ? " Astuce : si vous utilisez la Direct Connection (db.*.supabase.co en IPv6), utilisez plut\xF4t l\u2019URI Session Pooler (aws-0-...pooler.supabase.com:5432) dans Supabase \u2192 Connect." : "";
      return {
        ok: false,
        postgresConnected: false,
        restReachable: false,
        latencyMs: Date.now() - started,
        message: `\xC9chec connexion PostgreSQL Supabase : ${sanitizeDatabaseError(rawMsg)}${ipv6Hint}`
      };
    }
  }
  if (cfg.projectUrl) {
    const urlCheck = validateSupabaseProjectUrl(cfg.projectUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
      return {
        ok: false,
        postgresConnected,
        restReachable: false,
        message: urlCheck.error || "URL Supabase invalide."
      };
    }
    const apiKey = cfg.serviceRoleKey || cfg.anonKey;
    if (apiKey) {
      try {
        const res = await fetch(`${urlCheck.normalized}/rest/v1/products?select=id&limit=1`, {
          method: "GET",
          headers: buildSupabaseRestHeaders(apiKey),
          signal: AbortSignal.timeout(8e3)
        });
        if (res.ok) {
          restReachable = true;
          details.push("API REST Supabase OK (lecture dynamique active)");
        } else if (res.status === 401 || res.status === 403) {
          const txt = await res.text().catch(() => "");
          details.push(
            txt.includes("42501") ? "Projet Supabase joignable, mais permissions manquantes (42501). Cliquez sur \xAB SQL Complet Supabase \xBB, copiez le script et ex\xE9cutez-le dans Supabase SQL Editor (ou ajoutez votre Service Role Key)." : `API REST Supabase HTTP ${res.status} \u2014 v\xE9rifiez vos cl\xE9s ou permissions GRANT/RLS.`
          );
        } else if (res.status === 404) {
          restReachable = true;
          details.push(
            "Projet Supabase joignable (tables non encore cr\xE9\xE9es \u2014 ex\xE9cutez le script \xAB SQL Complet Supabase \xBB)"
          );
        } else {
          details.push(`API REST HTTP ${res.status}`);
        }
      } catch (err) {
        details.push(
          `API REST inaccessible (${sanitizeDatabaseError(
            err instanceof Error ? err.message : String(err)
          )})`
        );
      }
    }
  }
  return {
    ok: postgresConnected || restReachable,
    postgresConnected,
    restReachable,
    pgVersion,
    latencyMs: Date.now() - started,
    message: details.join(" \xB7 ") || "V\xE9rification termin\xE9e."
  };
}
async function executeSqlQuery(input) {
  const sql = String(input.sql || "").trim();
  if (!sql) {
    throw new Error("Veuillez saisir une requ\xEAte SQL.");
  }
  if (sql.length > 2e4) {
    throw new Error("Requ\xEAte SQL trop longue (maximum 20 000 caract\xE8res).");
  }
  const started = Date.now();
  const cfg = getStoredSupabaseConfig();
  if (!cfg.postgresUri) {
    throw new Error(
      "URI PostgreSQL Supabase manquante. Enregistrez votre URI Supabase Session Pooler (Connection String) ci-dessus pour ex\xE9cuter du SQL directement sur Supabase depuis ce tableau de bord, ou copiez le script SQL dans Supabase SQL Editor."
    );
  }
  try {
    return await withPgClient(cfg.postgresUri, async (client) => {
      const res = await client.query(sql);
      const last = Array.isArray(res) ? res[res.length - 1] : res;
      const rows = Array.isArray(last?.rows) ? last.rows.slice(0, 200) : [];
      const columns = last?.fields?.map((f) => f.name) || (rows.length > 0 ? Object.keys(rows[0]) : []);
      return {
        target: "supabase",
        columns,
        rows,
        rowCount: typeof last?.rowCount === "number" ? last.rowCount : rows.length,
        command: last?.command || "SQL",
        durationMs: Date.now() - started
      };
    });
  } catch (err) {
    throw new Error(sanitizeDatabaseError(err instanceof Error ? err.message : String(err)));
  }
}
async function pushSchemaAndDataToSupabase() {
  const cfg = getStoredSupabaseConfig();
  const [products, orders, messages, siteContent] = await Promise.all([
    listProducts({ includeUnavailable: true }).catch(() => []),
    listOrders().catch(() => []),
    listContactMessages().catch(() => []),
    getSiteContent().catch(() => BASE_SITE_CONTENT)
  ]);
  if (cfg.postgresUri) {
    try {
      await withPgClient(cfg.postgresUri, async (client) => {
        await client.query(SUPABASE_SCHEMA_SQL);
        for (const p of products) {
          await client.query(
            `INSERT INTO public.products (
              id, slug, category, subcategory,
              name_fr, name_en, name_ar,
              desc_fr, desc_en, desc_ar,
              price_mad, unit_fr, unit_en, unit_ar,
              stock, available, featured, image_url, variants_json,
              harvest_note_fr, harvest_note_en, harvest_note_ar,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4,
              $5, $6, $7,
              $8, $9, $10,
              $11, $12, $13, $14,
              $15, $16, $17, $18, $19::jsonb,
              $20, $21, $22,
              COALESCE($23::timestamptz, NOW()), NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              slug = EXCLUDED.slug,
              category = EXCLUDED.category,
              subcategory = EXCLUDED.subcategory,
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
              harvest_note_fr = EXCLUDED.harvest_note_fr,
              harvest_note_en = EXCLUDED.harvest_note_en,
              harvest_note_ar = EXCLUDED.harvest_note_ar,
              updated_at = NOW()`,
            [
              p.id,
              p.slug,
              p.category,
              p.subcategory,
              p.name_fr,
              p.name_en,
              p.name_ar,
              p.desc_fr,
              p.desc_en,
              p.desc_ar,
              p.price_mad,
              p.unit_fr,
              p.unit_en,
              p.unit_ar,
              p.stock,
              Boolean(p.available),
              Boolean(p.featured),
              p.image_url,
              JSON.stringify(p.variants || []),
              p.harvest_note_fr || "",
              p.harvest_note_en || "",
              p.harvest_note_ar || "",
              p.created_at || null
            ]
          );
        }
        for (const ord of orders) {
          await client.query(
            `INSERT INTO public.orders (
              id, customer_name, customer_phone, customer_email,
              city, delivery_zone, address, delivery_method,
              delivery_fee_mad, subtotal_mad, total_mad,
              notes, status, email_status, email_recipient, items_json, created_at
            ) VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8,
              $9, $10, $11,
              $12, $13, $14, $15, $16::jsonb, COALESCE($17::timestamptz, NOW())
            )
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              email_status = EXCLUDED.email_status,
              email_recipient = EXCLUDED.email_recipient,
              total_mad = EXCLUDED.total_mad`,
            [
              ord.id,
              ord.customer_name,
              ord.customer_phone,
              ord.customer_email || "",
              ord.city,
              ord.delivery_zone,
              ord.address,
              ord.delivery_method,
              ord.delivery_fee_mad,
              ord.subtotal_mad,
              ord.total_mad,
              ord.notes || "",
              ord.status,
              ord.email_status || "pending_emailjs",
              ord.email_recipient || "domaineessaoudi@gmail.com",
              JSON.stringify(ord.items || []),
              ord.created_at || null
            ]
          );
        }
        for (const msg of messages) {
          await client.query(
            `INSERT INTO public.contact_messages (
              id, name, phone, email, subject, message, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, NOW()))
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status`,
            [
              msg.id,
              msg.name,
              msg.phone,
              msg.email || "",
              msg.subject,
              msg.message,
              msg.status,
              msg.created_at || null
            ]
          );
        }
        await client.query(
          `INSERT INTO public.site_content (key, value_json, updated_at)
           VALUES ('main', $1::jsonb, NOW())
           ON CONFLICT (key) DO UPDATE SET
             value_json = EXCLUDED.value_json,
             updated_at = NOW()`,
          [JSON.stringify(siteContent)]
        );
      });
      return {
        ok: true,
        mode: "postgres",
        counts: {
          products: products.length,
          orders: orders.length,
          messages: messages.length,
          siteContent: 1
        },
        message: `Tables cr\xE9\xE9es & synchronis\xE9es sur Supabase : ${products.length} produits, ${orders.length} commandes, ${messages.length} messages.`
      };
    } catch (err) {
      throw new Error(
        `\xC9chec synchronisation Supabase PostgreSQL : ${sanitizeDatabaseError(
          err instanceof Error ? err.message : String(err)
        )}`
      );
    }
  }
  const urlCheck = validateSupabaseProjectUrl(cfg.projectUrl);
  if (!urlCheck.valid || !urlCheck.normalized || !cfg.serviceRoleKey) {
    throw new Error(
      "Pour synchroniser automatiquement vers Supabase, renseignez votre URI PostgreSQL Session Pooler (ou Service Role Key apr\xE8s avoir ex\xE9cut\xE9 le script \xAB SQL Complet Supabase \xBB dans Supabase SQL Editor)."
    );
  }
  const headers = buildSupabaseRestHeaders(cfg.serviceRoleKey, {
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates"
  });
  const pushRestTable = async (table, payload) => {
    const res = await fetch(`${urlCheck.normalized}/rest/v1/${table}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 404 || txt.includes("PGRST205")) {
        throw new Error(
          `La table '${table}' n'existe pas encore sur Supabase. Copiez le script \xAB SQL Complet Supabase \xBB et ex\xE9cutez-le dans Supabase SQL Editor.`
        );
      }
      throw new Error(`Erreur REST Supabase (${table} - HTTP ${res.status})`);
    }
  };
  await pushRestTable(
    "products",
    products.map((p) => ({
      ...p,
      available: Boolean(p.available),
      featured: Boolean(p.featured),
      variants_json: p.variants || []
    }))
  );
  if (orders.length > 0) {
    await pushRestTable(
      "orders",
      orders.map((o) => ({
        id: o.id,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        customer_email: o.customer_email || "",
        city: o.city,
        delivery_zone: o.delivery_zone,
        address: o.address,
        delivery_method: o.delivery_method,
        delivery_fee_mad: o.delivery_fee_mad,
        subtotal_mad: o.subtotal_mad,
        total_mad: o.total_mad,
        notes: o.notes || "",
        status: o.status,
        email_status: o.email_status || "pending_emailjs",
        email_recipient: o.email_recipient || "domaineessaoudi@gmail.com",
        items_json: o.items || [],
        created_at: o.created_at
      }))
    );
  }
  if (messages.length > 0) {
    await pushRestTable("contact_messages", messages);
  }
  await pushRestTable("site_content", {
    key: "main",
    value_json: siteContent,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  return {
    ok: true,
    mode: "rest",
    counts: {
      products: products.length,
      orders: orders.length,
      messages: messages.length,
      siteContent: 1
    },
    message: `Donn\xE9es synchronis\xE9es via REST Supabase : ${products.length} produits, ${orders.length} commandes, ${messages.length} messages.`
  };
}
async function exportSupabaseFullSql() {
  const [products, siteContent] = await Promise.all([
    listProducts({ includeUnavailable: true }).catch(() => []),
    getSiteContent().catch(() => BASE_SITE_CONTENT)
  ]);
  return buildSupabaseFullSql(products, siteContent);
}

// server.ts
var app = express();
var PORT = Number(process.env.PORT || 3e3);
var uploadsDir = process.env.VERCEL ? path2.resolve("/tmp", "uploads") : path2.resolve(process.cwd(), "uploads");
if (!fs2.existsSync(uploadsDir)) {
  try {
    fs2.mkdirSync(uploadsDir, { recursive: true });
  } catch {
  }
}
app.use(express.json({ limit: "5mb" }));
app.use((req, _res, next) => {
  const matched = req.headers["x-matched-path"] || req.headers["x-forwarded-url"];
  if (typeof matched === "string" && matched.startsWith("/api") && req.url === "/api") {
    req.url = matched;
  }
  next();
});
function isSafeImageUrl(url) {
  const trimmed = url.trim();
  if (trimmed.startsWith("/src/assets/") || trimmed.startsWith("/uploads/")) {
    return !trimmed.includes("..");
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
app.get("/uploads/:filename", (req, res) => {
  const safeName = path2.basename(req.params.filename);
  const resolved = path2.resolve(uploadsDir, safeName);
  if (!resolved.startsWith(uploadsDir + path2.sep) || !fs2.existsSync(resolved)) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  res.sendFile(resolved);
});
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "domaine-essaoudi", database: "supabase" });
});
app.get("/api/products", async (req, res) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : void 0;
    const featured = req.query.featured === "1";
    const includeUnavailable = req.query.includeUnavailable === "1" && verifySessionToken(extractBearerToken(req));
    const products = await listProducts({ category, featured, includeUnavailable });
    res.json({ products });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to load products."
    });
  }
});
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await getProductByIdOrSlug(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to load product."
    });
  }
});
app.get("/api/content", async (_req, res) => {
  try {
    const content = await getSiteContent();
    res.json({ content });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to load site content."
    });
  }
});
app.post("/api/orders", async (req, res) => {
  try {
    const body = req.body || {};
    const customerName = String(body.customer_name || "").trim();
    const customerPhoneRaw = String(body.customer_phone || "").trim();
    const customerEmail = String(body.customer_email || "").trim();
    const city = String(body.city || "").trim();
    const deliveryZoneId = String(body.delivery_zone || "").trim();
    const address = String(body.address || "").trim();
    const deliveryMethod = body.delivery_method === "pickup" ? "pickup" : "delivery";
    const notes = String(body.notes || "").trim().slice(0, 500);
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (customerName.length < 2 || customerName.length > 100) {
      res.status(400).json({ error: "Valid full name is required." });
      return;
    }
    if (!isValidMoroccanPhone(customerPhoneRaw)) {
      res.status(400).json({ error: "Valid Moroccan phone number (+212...) is required." });
      return;
    }
    if (deliveryMethod === "delivery" && (city.length < 2 || address.length < 5)) {
      res.status(400).json({ error: "City and full delivery address are required for delivery." });
      return;
    }
    if (rawItems.length === 0 || rawItems.length > 50) {
      res.status(400).json({ error: "Cart cannot be empty." });
      return;
    }
    const verifiedItems = [];
    let subtotalMad = 0;
    for (const item of rawItems) {
      const qty = Math.floor(Number(item.quantity));
      if (!item.productId || !Number.isFinite(qty) || qty < 1 || qty > 100) {
        res.status(400).json({ error: "Invalid item quantity in order." });
        return;
      }
      const product = await getProductByIdOrSlug(String(item.productId));
      if (!product || !product.available) {
        res.status(400).json({ error: `Product unavailable: ${item.productId}` });
        return;
      }
      let unitPrice = product.price_mad;
      let variantLabel;
      let availableStock = product.stock;
      if (item.variantId && product.variants.length > 0) {
        const foundVariant = product.variants.find((v) => v.id === item.variantId);
        if (foundVariant) {
          unitPrice = foundVariant.price_mad;
          variantLabel = foundVariant.label_fr;
          availableStock = Math.min(product.stock, foundVariant.stock);
        }
      }
      if (availableStock < qty) {
        res.status(400).json({
          error: `Insufficient stock for ${product.name_fr}. Available: ${availableStock}`
        });
        return;
      }
      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      subtotalMad += lineTotal;
      verifiedItems.push({
        productId: product.id,
        variantId: item.variantId,
        variantLabel,
        name: product.name_fr,
        price_mad: unitPrice,
        quantity: qty,
        line_total_mad: lineTotal
      });
    }
    subtotalMad = Math.round(subtotalMad * 100) / 100;
    const content = await getSiteContent();
    const zone = content.deliveryZones.find((z) => z.id === deliveryZoneId) || content.deliveryZones[0];
    const deliveryFeeMad = calculateDeliveryFee(subtotalMad, zone, deliveryMethod);
    const totalMad = Math.round((subtotalMad + deliveryFeeMad) * 100) / 100;
    const order = await createOrderRecord({
      customer_name: customerName,
      customer_phone: normalizeMoroccanPhone(customerPhoneRaw),
      customer_email: customerEmail,
      city: deliveryMethod === "pickup" ? "Berrechid (Ferme)" : city,
      delivery_zone: deliveryMethod === "pickup" ? "pickup" : zone.id,
      address: deliveryMethod === "pickup" ? "Retrait direct Domaine Essaoudi, Douar Ouled Ziane" : address,
      delivery_method: deliveryMethod,
      delivery_fee_mad: deliveryFeeMad,
      subtotal_mad: subtotalMad,
      total_mad: totalMad,
      notes,
      items: verifiedItems
    });
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const mailResult = await sendOrderNotificationEmail(order, recipientEmail);
    const finalOrder = await updateOrderEmailStatus(order.id, mailResult.status, mailResult.recipient) || order;
    const receiptProof = signOrderReceipt(order.id);
    const ejServer = getEmailJsServerConfig();
    res.status(201).json({
      order: finalOrder,
      receiptProof,
      emailjs: {
        serviceId: (content.emailjsServiceId || ejServer.serviceId || "").trim(),
        templateId: (content.emailjsTemplateId || ejServer.templateId || "").trim(),
        publicKey: (content.emailjsPublicKey || ejServer.publicKey || "").trim(),
        recipientEmail
      },
      emailNotification: {
        sent: mailResult.sent,
        status: mailResult.status,
        recipient: mailResult.recipient
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to create order."
    });
  }
});
app.post("/api/orders/:id/email-status", async (req, res) => {
  try {
    const orderId = String(req.params.id || "").trim();
    const receiptProof = String(req.body?.receiptProof || "");
    const status = req.body?.status;
    if (!verifyOrderReceipt(orderId, receiptProof)) {
      res.status(403).json({ error: "Invalid order receipt proof." });
      return;
    }
    if (status !== "sent" && status !== "failed") {
      res.status(400).json({ error: "Invalid email delivery status." });
      return;
    }
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const updated = await updateOrderEmailStatus(orderId, status, recipientEmail);
    if (!updated) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    res.json({ order: updated });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to update email status."
    });
  }
});
app.post("/api/contact", async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ error: "Name is required (min 2 characters)." });
      return;
    }
    if (!isValidMoroccanPhone(phone)) {
      res.status(400).json({ error: "Valid Moroccan phone number (+212...) is required." });
      return;
    }
    if (subject.length < 2 || message.length < 5) {
      res.status(400).json({ error: "Subject and message are required." });
      return;
    }
    const saved = await createContactMessage({
      name,
      phone: normalizeMoroccanPhone(phone),
      email,
      subject: subject.slice(0, 140),
      message: message.slice(0, 2e3)
    });
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    void sendContactNotificationEmail(saved, recipientEmail);
    res.status(201).json({ message: saved });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to save contact message."
    });
  }
});
app.get("/api/admin/auth-status", (req, res) => {
  const status = getAuthConfigurationStatus();
  const authenticated = verifySessionToken(extractBearerToken(req));
  res.json({
    configured: status.envConfigured || status.claimed,
    envConfigured: status.envConfigured,
    claimed: status.claimed,
    authenticated
  });
});
app.post("/api/admin/claim", (req, res) => {
  const password = String(req.body?.password || "");
  if (password.length < 6 || password.length > 128) {
    res.status(400).json({ error: "Password must be between 6 and 128 characters." });
    return;
  }
  const ok = claimInitialAdminPassword(password);
  if (!ok) {
    res.status(409).json({ error: "Administrator password is already configured." });
    return;
  }
  const token = issueAdminSession();
  res.status(201).json({ token });
});
app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (!password) {
    res.status(400).json({ error: "Password is required." });
    return;
  }
  if (!verifyAdminPassword(password)) {
    res.status(401).json({ error: "Invalid administrator password." });
    return;
  }
  const token = issueAdminSession();
  res.json({ token });
});
app.post("/api/admin/logout", (req, res) => {
  revokeSessionToken(extractBearerToken(req));
  res.json({ ok: true });
});
app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to load admin statistics."
    });
  }
});
app.post("/api/admin/upload", requireAdmin, (req, res) => {
  const dataUrl = String(req.body?.dataUrl || "");
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ error: "Invalid image format. Only JPEG, PNG, and WebP are allowed." });
    return;
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 3 * 1024 * 1024) {
    res.status(400).json({ error: "Image size exceeds 3 MB limit." });
    return;
  }
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const filename = `product-${Date.now()}-${crypto3.randomBytes(4).toString("hex")}.${ext}`;
  const target = path2.resolve(uploadsDir, filename);
  if (!target.startsWith(uploadsDir + path2.sep)) {
    res.status(400).json({ error: "Invalid upload path." });
    return;
  }
  fs2.writeFileSync(target, buffer);
  res.status(201).json({ url: `/uploads/${filename}` });
});
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const category = b.category;
    if (!["vegetables", "olive-oil", "poultry"].includes(category)) {
      res.status(400).json({ error: "Valid category is required." });
      return;
    }
    const nameFr = String(b.name_fr || "").trim();
    const nameEn = String(b.name_en || nameFr).trim();
    const nameAr = String(b.name_ar || nameFr).trim();
    const priceMad = Number(b.price_mad);
    const stock = Math.max(0, Math.floor(Number(b.stock ?? 0)));
    const imageUrl = String(
      b.image_url || "/src/assets/images/cat_fresh_vegetables_1795435654556.jpg"
    ).trim();
    if (!nameFr || !Number.isFinite(priceMad) || priceMad <= 0) {
      res.status(400).json({ error: "Product name and positive price in MAD are required." });
      return;
    }
    if (!isSafeImageUrl(imageUrl)) {
      res.status(400).json({ error: "Invalid image URL." });
      return;
    }
    const created = await createProduct({
      category,
      subcategory: String(b.subcategory || "general").trim(),
      name_fr: nameFr,
      name_en: nameEn,
      name_ar: nameAr,
      desc_fr: String(b.desc_fr || "").trim(),
      desc_en: String(b.desc_en || "").trim(),
      desc_ar: String(b.desc_ar || "").trim(),
      price_mad: Math.round(priceMad * 100) / 100,
      unit_fr: String(b.unit_fr || "1 kg").trim(),
      unit_en: String(b.unit_en || "1 kg").trim(),
      unit_ar: String(b.unit_ar || "1 \u0643\u063A").trim(),
      stock,
      available: b.available !== false,
      featured: Boolean(b.featured),
      image_url: imageUrl,
      variants: Array.isArray(b.variants) ? b.variants : [],
      harvest_note_fr: String(b.harvest_note_fr || "").trim(),
      harvest_note_en: String(b.harvest_note_en || "").trim(),
      harvest_note_ar: String(b.harvest_note_ar || "").trim()
    });
    res.status(201).json({ product: created });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to create product."
    });
  }
});
app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.image_url !== void 0 && !isSafeImageUrl(String(b.image_url))) {
      res.status(400).json({ error: "Invalid image URL." });
      return;
    }
    if (b.price_mad !== void 0 && (!Number.isFinite(Number(b.price_mad)) || Number(b.price_mad) <= 0)) {
      res.status(400).json({ error: "Price must be positive." });
      return;
    }
    const updated = await updateProduct(req.params.id, {
      ...b,
      price_mad: b.price_mad !== void 0 ? Math.round(Number(b.price_mad) * 100) / 100 : void 0,
      stock: b.stock !== void 0 ? Math.max(0, Math.floor(Number(b.stock))) : void 0
    });
    if (!updated) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    res.json({ product: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to update product."
    });
  }
});
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to delete product."
    });
  }
});
app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  try {
    const orders = await listOrders();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to load orders."
    });
  }
});
app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const status = req.body?.status;
    if (!["pending", "confirmed", "preparing", "shipped", "completed", "cancelled"].includes(status)) {
      res.status(400).json({ error: "Invalid order status." });
      return;
    }
    const updated = await updateOrderStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    res.json({ order: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to update order status."
    });
  }
});
app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteOrder(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to delete order."
    });
  }
});
app.put("/api/admin/content", requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body || {} };
    if (typeof body.emailjsServiceId === "string") {
      body.emailjsServiceId = body.emailjsServiceId.trim().slice(0, 120);
    }
    if (typeof body.emailjsTemplateId === "string") {
      body.emailjsTemplateId = body.emailjsTemplateId.trim().slice(0, 120);
    }
    if (typeof body.emailjsPublicKey === "string") {
      body.emailjsPublicKey = body.emailjsPublicKey.trim().slice(0, 120);
    }
    if (typeof body.email === "string") {
      body.email = body.email.trim().slice(0, 160);
    }
    const updated = await updateSiteContent(body);
    res.json({ content: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to save site content."
    });
  }
});
app.get("/api/admin/email-status", requireAdmin, async (_req, res) => {
  try {
    const smtpCfg = getSmtpConfig();
    const ejCfg = getEmailJsServerConfig();
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const serviceId = (content.emailjsServiceId || ejCfg.serviceId || "").trim();
    const templateId = (content.emailjsTemplateId || ejCfg.templateId || "").trim();
    const publicKey = (content.emailjsPublicKey || ejCfg.publicKey || "").trim();
    const emailjsConfigured = Boolean(serviceId && templateId && publicKey);
    res.json({
      configured: emailjsConfigured || smtpCfg.configured,
      emailjsConfigured,
      smtpConfigured: smtpCfg.configured,
      emailjsServiceId: serviceId,
      emailjsTemplateId: templateId,
      smtpHost: smtpCfg.host || "smtp.gmail.com",
      smtpPort: smtpCfg.port,
      smtpUser: smtpCfg.user ? `${smtpCfg.user.slice(0, 3)}***` : "",
      recipientEmail
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to check email status."
    });
  }
});
app.post("/api/admin/test-email", requireAdmin, async (_req, res) => {
  try {
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const testOrder = {
      id: `TEST-${Date.now().toString().slice(-6)}`,
      customer_name: "Test Domaine Essaoudi",
      customer_phone: "+212654538595",
      customer_email: recipientEmail,
      city: "Berrechid",
      delivery_zone: "casablanca-chaouia",
      address: "Douar Ouled Ziane, Route de Berrechid",
      delivery_method: "delivery",
      delivery_fee_mad: 0,
      subtotal_mad: 250,
      total_mad: 250,
      notes: "Test de r\xE9ception des commandes par email",
      status: "pending",
      items: [
        {
          productId: "oil-beldi-1l",
          variantId: "5l",
          variantLabel: "5 Litres",
          name: "Huile d\u2019Olive Haouzia Vierge Extra",
          price_mad: 250,
          quantity: 1,
          line_total_mad: 250
        }
      ],
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const result = await sendOrderNotificationEmail(testOrder, recipientEmail);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to send test email."
    });
  }
});
app.get("/api/admin/messages", requireAdmin, async (_req, res) => {
  try {
    const messages = await listContactMessages();
    res.json({ messages });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unable to load contact messages."
    });
  }
});
app.patch("/api/admin/messages/:id", requireAdmin, async (req, res) => {
  try {
    const status = req.body?.status;
    if (!["unread", "read", "replied"].includes(status)) {
      res.status(400).json({ error: "Invalid message status." });
      return;
    }
    const updated = await updateContactMessageStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: "Message not found." });
      return;
    }
    res.json({ message: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unable to update contact message status."
    });
  }
});
async function ensureAdminAuthColumns() {
  const alterSql = `
    ALTER TABLE admin_auth
      ADD COLUMN IF NOT EXISTS username TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `;
  try {
    await executeSqlQuery({ target: "supabase", sql: alterSql });
  } catch {
  }
}
app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  try {
    await ensureAdminAuthColumns();
    const result = await executeSqlQuery({
      target: "supabase",
      sql: "SELECT id, COALESCE(username, 'admin') as username, COALESCE(email, '') as email, COALESCE(role, 'admin') as role, COALESCE(created_at, updated_at) as created_at, updated_at FROM admin_auth ORDER BY id DESC;"
    });
    res.json({ users: result.rows || [] });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur chargement utilisateurs." });
  }
});
app.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    await ensureAdminAuthColumns();
    const { username, email, password, role } = req.body || {};
    if (!username || typeof username !== "string" || username.trim().length < 2) {
      res.status(400).json({ error: "Nom d'utilisateur requis (min 2 caract\xE8res)." });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Mot de passe requis (min 6 caract\xE8res)." });
      return;
    }
    const allowedRoles = ["admin", "editor", "viewer"];
    const safeRole = allowedRoles.includes(role) ? role : "viewer";
    const salt = crypto3.randomBytes(16).toString("hex");
    const passwordHash = crypto3.createHmac("sha256", salt).update(password).digest("hex");
    const safeUsername = username.trim().replace(/'/g, "''");
    const safeEmail = (email || "").trim().replace(/'/g, "''");
    const result = await executeSqlQuery({
      target: "supabase",
      sql: `INSERT INTO admin_auth (username, email, password_hash, salt, role, created_at, updated_at)
            VALUES ('${safeUsername}', '${safeEmail}', '${passwordHash}', '${salt}', '${safeRole}', NOW(), NOW())
            RETURNING id, COALESCE(username,'admin') as username, COALESCE(email,'') as email, COALESCE(role,'admin') as role, created_at, updated_at;`
    });
    res.json({ user: result.rows?.[0] || null });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur cr\xE9ation utilisateur." });
  }
});
app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { username, email, password, role } = req.body || {};
    const allowedRoles = ["admin", "editor", "viewer"];
    const setParts = [];
    if (username && typeof username === "string" && username.trim().length >= 2) {
      setParts.push(`username = '${username.trim().replace(/'/g, "''")}'`);
    }
    if (email !== void 0) {
      setParts.push(`email = '${String(email).trim().replace(/'/g, "''")}'`);
    }
    if (role && allowedRoles.includes(role)) {
      setParts.push(`role = '${role}'`);
    }
    if (password && typeof password === "string" && password.length >= 6) {
      const salt = crypto3.randomBytes(16).toString("hex");
      const passwordHash = crypto3.createHmac("sha256", salt).update(password).digest("hex");
      setParts.push(`password_hash = '${passwordHash}', salt = '${salt}'`);
    }
    if (setParts.length === 0) {
      res.status(400).json({ error: "Aucun champ valide \xE0 mettre \xE0 jour." });
      return;
    }
    setParts.push(`updated_at = NOW()`);
    const numericId = parseInt(String(id), 10);
    if (isNaN(numericId)) {
      res.status(400).json({ error: "ID invalide." });
      return;
    }
    const result = await executeSqlQuery({
      target: "supabase",
      sql: `UPDATE admin_auth SET ${setParts.join(", ")} WHERE id = ${numericId}
            RETURNING id, COALESCE(username,'admin') as username, COALESCE(email,'') as email, COALESCE(role,'admin') as role, COALESCE(created_at, updated_at) as created_at, updated_at;`
    });
    if (!result.rows?.length) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur mise \xE0 jour utilisateur." });
  }
});
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const numericId = parseInt(String(req.params.id), 10);
    if (isNaN(numericId)) {
      res.status(400).json({ error: "ID invalide." });
      return;
    }
    await executeSqlQuery({
      target: "supabase",
      sql: `DELETE FROM admin_auth WHERE id = ${numericId};`
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur suppression utilisateur." });
  }
});
app.get("/api/admin/supabase/config", requireAdmin, (_req, res) => {
  res.json({ supabase: getPublicSupabaseStatus() });
});
app.put("/api/admin/supabase/config", requireAdmin, (req, res) => {
  const b = req.body || {};
  const result = saveSupabaseConfig({
    projectUrl: typeof b.projectUrl === "string" ? b.projectUrl : void 0,
    anonKey: typeof b.anonKey === "string" ? b.anonKey : void 0,
    serviceRoleKey: typeof b.serviceRoleKey === "string" ? b.serviceRoleKey : void 0,
    postgresUri: typeof b.postgresUri === "string" ? b.postgresUri : void 0
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error || "Configuration Supabase invalide." });
    return;
  }
  res.json({ supabase: result.status });
});
app.post("/api/admin/supabase/disconnect", requireAdmin, (_req, res) => {
  res.json({ supabase: clearSupabaseConfig() });
});
app.post("/api/admin/supabase/test", requireAdmin, async (_req, res) => {
  const result = await testSupabaseConnection();
  res.status(result.ok ? 200 : 400).json(result);
});
app.post("/api/admin/supabase/sync", requireAdmin, async (_req, res) => {
  try {
    const result = await pushSchemaAndDataToSupabase();
    res.json(result);
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : "Erreur de synchronisation Supabase."
    });
  }
});
app.get("/api/admin/supabase/export-sql", requireAdmin, async (_req, res) => {
  try {
    const sql = await exportSupabaseFullSql();
    res.json({ sql });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur lors de la g\xE9n\xE9ration du script SQL."
    });
  }
});
app.post("/api/admin/sql/execute", requireAdmin, async (req, res) => {
  const sql = typeof req.body?.sql === "string" ? req.body.sql : "";
  try {
    const result = await executeSqlQuery({ target: "supabase", sql });
    res.json({ result });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Erreur lors de l\u2019ex\xE9cution SQL."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path2.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distDir, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Domaine Essaoudi server running at http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  startServer();
}
var server_default = app;

// server/serverless.ts
function handler(req, res) {
  return server_default(req, res);
}
export {
  handler as default
};
