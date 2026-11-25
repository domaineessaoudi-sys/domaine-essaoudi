import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SQL_PRESETS,
  SUPABASE_SCHEMA_SQL,
  buildSupabaseFullSql,
  buildSupabaseRestHeaders,
  escapeSqlLiteral,
  maskPostgresUri,
  maskSecret,
  sanitizeDatabaseError,
  validatePostgresConnectionUri,
  validateSupabaseProjectUrl,
} from './supabaseSql';

test('validateSupabaseProjectUrl accepts valid Supabase HTTPS origin and blocks SSRF targets', () => {
  const valid = validateSupabaseProjectUrl('https://abcdefg.supabase.co/rest/v1');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, 'https://abcdefg.supabase.co');

  assert.equal(validateSupabaseProjectUrl('http://abcdefg.supabase.co').valid, false);
  assert.equal(validateSupabaseProjectUrl('https://localhost:5432').valid, false);
  assert.equal(validateSupabaseProjectUrl('https://127.0.0.1/test').valid, false);
  assert.equal(validateSupabaseProjectUrl('https://169.254.169.254/latest').valid, false);
  assert.equal(validateSupabaseProjectUrl('https://192.168.1.50').valid, false);
});

test('validatePostgresConnectionUri accepts Supabase Postgres URIs and rejects placeholder or localhost IPs', () => {
  const ok = validatePostgresConnectionUri(
    'postgresql://postgres.ref:SuperSecret123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  );
  assert.equal(ok.valid, true);

  assert.equal(
    validatePostgresConnectionUri(
      'postgresql://postgres:[YOUR-DATABASE-PASSWORD]@db.dfqyzoxomnqnkfhtyfti.supabase.co:5432/postgres'
    ).valid,
    false
  );
  assert.equal(
    validatePostgresConnectionUri('postgresql://postgres:pass@127.0.0.1:5432/postgres').valid,
    false
  );
  assert.equal(
    validatePostgresConnectionUri('mysql://root:pass@db.example.com:3306/app').valid,
    false
  );
});

test('buildSupabaseRestHeaders includes apikey and Bearer Authorization for all keys', () => {
  const pubHeaders = buildSupabaseRestHeaders('sb_publishable_Tjdiha_test');
  assert.equal(pubHeaders.apikey, 'sb_publishable_Tjdiha_test');
  assert.equal(pubHeaders.Authorization, 'Bearer sb_publishable_Tjdiha_test');

  const jwtHeaders = buildSupabaseRestHeaders('eyJhbGciOiJIUzI1NiJ9.payload.sig');
  assert.equal(jwtHeaders.apikey, 'eyJhbGciOiJIUzI1NiJ9.payload.sig');
  assert.equal(jwtHeaders.Authorization, 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig');
});

test('maskPostgresUri and maskSecret redact credentials without exposing passwords', () => {
  const masked = maskPostgresUri(
    'postgresql://postgres.abc:MyTopSecretPass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
  );
  assert.equal(masked.includes('MyTopSecretPass'), false);
  assert.equal(
    masked,
    'postgresql://postgres.abc:••••••@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
  );

  const keyMask = maskSecret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  assert.equal(keyMask, 'eyJh••••VCJ9');
  assert.equal(maskSecret('short'), '••••••••');
});

test('sanitizeDatabaseError strips embedded connection strings', () => {
  const sanitized = sanitizeDatabaseError(
    'Failed connecting to postgresql://postgres:secretPass@db.supabase.co:5432/postgres timeout'
  );
  assert.equal(sanitized.includes('secretPass'), false);
  assert.ok(sanitized.includes('postgresql://[MASQUÉ]'));
});

test('SQL_PRESETS target Supabase PostgreSQL only with zero SQLite presets', () => {
  assert.ok(SQL_PRESETS.length >= 4);
  for (const preset of SQL_PRESETS) {
    assert.equal(preset.target, 'supabase');
    assert.equal(preset.sql.toLowerCase().includes('sqlite'), false);
  }
});

test('SUPABASE_SCHEMA_SQL defines all 4 tables, grants, and idempotent RLS policies', () => {
  assert.ok(SUPABASE_SCHEMA_SQL.includes('CREATE TABLE IF NOT EXISTS public.products'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('CREATE TABLE IF NOT EXISTS public.orders'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('CREATE TABLE IF NOT EXISTS public.site_content'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('CREATE TABLE IF NOT EXISTS public.contact_messages'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('GRANT ALL ON TABLE public.products, public.orders, public.site_content, public.contact_messages TO service_role'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('GRANT SELECT ON TABLE public.products, public.site_content TO anon, authenticated'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('DROP POLICY IF EXISTS'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('CREATE POLICY'));
});

test('escapeSqlLiteral and buildSupabaseFullSql escape apostrophes and clean demo orders', () => {
  assert.equal(escapeSqlLiteral("Huile d'Olive"), "'Huile d''Olive'");
  const sql = buildSupabaseFullSql(
    [
      {
        id: 'oil-beldi-1l',
        slug: 'huile-olive-haouzia',
        category: 'olive-oil',
        subcategory: 'oil',
        name_fr: "Huile d'Olive Haouzia",
        name_en: 'Haouzia Olive Oil',
        name_ar: 'زيت زيتون الحوزية',
        desc_fr: "C'est 100% naturel",
        desc_en: 'Natural',
        desc_ar: 'طبيعي',
        price_mad: 50,
        unit_fr: '1 L à 10 L',
        unit_en: '1 L to 10 L',
        unit_ar: '1 لتر',
        stock: 150,
        available: true,
        featured: true,
        image_url: '/src/assets/images/cat_olive_oil_beldi_1795435654212.jpg',
        variants: [],
        harvest_note_fr: '',
        harvest_note_en: '',
        harvest_note_ar: '',
      },
    ],
    {
      farmName: 'Domaine Essaoudi',
      heroTitle_fr: "Terre d'origine",
      heroTitle_en: 'Origin',
      heroTitle_ar: 'أرض',
      heroSubtitle_fr: '',
      heroSubtitle_en: '',
      heroSubtitle_ar: '',
      phone: '+212 654 53 85 95',
      whatsapp: '+212 654 53 85 95',
      email: 'domaineessaoudi@gmail.com',
      address_fr: '',
      address_en: '',
      address_ar: '',
      hours_fr: '',
      hours_en: '',
      hours_ar: '',
      deliveryZones: [],
      testimonials: [
        {
          id: 'fake',
          name: 'Youssef El Mansouri',
          city: 'Casablanca',
          quote_fr: 'Fake',
          quote_en: 'Fake',
          quote_ar: 'Fake',
          role_fr: 'Client',
          role_en: 'Client',
          role_ar: 'Client',
        },
      ],
      socialInstagram: '',
      socialFacebook: '',
    }
  );
  assert.ok(sql.includes('INSERT INTO public.products'));
  assert.ok(sql.includes("'Huile d''Olive Haouzia'"));
  assert.ok(sql.includes('domaineessaoudi@gmail.com'));
  assert.ok(sql.includes("DELETE FROM public.orders WHERE id IN ('ORD-2026-101', 'ORD-2026-102', 'ORD-2026-95007')"));
  assert.equal(sql.includes('Youssef El Mansouri'), false);
});
