import { Client as PgClient } from 'pg';
import {
  BASE_SITE_CONTENT,
  getSiteContent,
  listContactMessages,
  listOrders,
  listProducts,
} from './db';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig } from './runtimeStore';
import {
  SUPABASE_SCHEMA_SQL,
  buildSupabaseFullSql,
  buildSupabaseRestHeaders,
  maskPostgresUri,
  maskSecret,
  sanitizeDatabaseError,
  validatePostgresConnectionUri,
  validateSupabaseProjectUrl,
} from '../src/utils/supabaseSql';

export interface SupabaseStatusSummary {
  projectUrl: string;
  hasAnonKey: boolean;
  anonKeyMasked: string;
  hasServiceRoleKey: boolean;
  serviceRoleKeyMasked: string;
  hasPostgresUri: boolean;
  postgresUriMasked: string;
  connectedMode: 'postgres' | 'rest' | 'unconfigured';
  updatedAt: string;
}

export interface SqlExecutionResult {
  target: 'supabase';
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  command: string;
  durationMs: number;
}

export function getPublicSupabaseStatus(): SupabaseStatusSummary {
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
    connectedMode: hasPostgresUri ? 'postgres' : hasRestConfig ? 'rest' : 'unconfigured',
    updatedAt: raw.updatedAt,
  };
}

export function saveSupabaseConfig(input: {
  projectUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  postgresUri?: string;
}): { ok: boolean; status?: SupabaseStatusSummary; error?: string } {
  const existing = getStoredSupabaseConfig();

  const urlCheck =
    input.projectUrl !== undefined
      ? validateSupabaseProjectUrl(input.projectUrl)
      : { valid: true, normalized: existing.projectUrl };
  if (!urlCheck.valid) {
    return { ok: false, error: urlCheck.error };
  }

  const uriCheck =
    input.postgresUri !== undefined && input.postgresUri.trim() !== ''
      ? validatePostgresConnectionUri(input.postgresUri)
      : {
          valid: true,
          normalized: existing.postgresUri,
        };
  if (!uriCheck.valid) {
    return { ok: false, error: uriCheck.error };
  }

  const nextAnonKey =
    input.anonKey !== undefined && input.anonKey.trim() !== ''
      ? input.anonKey.trim()
      : existing.anonKey;
  const nextServiceRole =
    input.serviceRoleKey !== undefined && input.serviceRoleKey.trim() !== ''
      ? input.serviceRoleKey.trim()
      : existing.serviceRoleKey;
  const nextPostgresUri =
    input.postgresUri !== undefined && input.postgresUri.trim() !== ''
      ? uriCheck.normalized
      : existing.postgresUri;

  saveStoredSupabaseConfig({
    projectUrl: urlCheck.normalized,
    anonKey: nextAnonKey,
    serviceRoleKey: nextServiceRole,
    postgresUri: nextPostgresUri,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, status: getPublicSupabaseStatus() };
}

export function clearSupabaseConfig(): SupabaseStatusSummary {
  saveStoredSupabaseConfig({
    projectUrl: '',
    anonKey: '',
    serviceRoleKey: '',
    postgresUri: '',
    updatedAt: new Date().toISOString(),
  });
  return getPublicSupabaseStatus();
}

async function withPgClient<T>(
  postgresUri: string,
  fn: (client: PgClient) => Promise<T>
): Promise<T> {
  const uriCheck = validatePostgresConnectionUri(postgresUri);
  if (!uriCheck.valid || !uriCheck.normalized) {
    throw new Error(uriCheck.error || 'URI PostgreSQL Supabase non configurée.');
  }

  const client = new PgClient({
    connectionString: uriCheck.normalized,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  postgresConnected: boolean;
  restReachable: boolean;
  pgVersion?: string;
  latencyMs?: number;
  message: string;
}> {
  const cfg = getStoredSupabaseConfig();
  const started = Date.now();
  let postgresConnected = false;
  let restReachable = false;
  let pgVersion: string | undefined;
  const details: string[] = [];

  if (!cfg.postgresUri && !cfg.projectUrl) {
    return {
      ok: false,
      postgresConnected: false,
      restReachable: false,
      message:
        'Veuillez saisir votre URL Supabase ou votre URI PostgreSQL avant de tester la connexion.',
    };
  }

  if (cfg.postgresUri) {
    try {
      const result = await withPgClient(cfg.postgresUri, async (client) => {
        const res = await client.query<{ pg_version: string }>('SELECT version() AS pg_version');
        return res.rows[0]?.pg_version || 'PostgreSQL';
      });
      postgresConnected = true;
      pgVersion = result.split(' on ')[0];
      details.push(`PostgreSQL OK (${pgVersion})`);
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const ipv6Hint = /ENETUNREACH|EHOSTUNREACH|ETIMEDOUT/i.test(rawMsg)
        ? ' Astuce : si vous utilisez la Direct Connection (db.*.supabase.co en IPv6), utilisez plutôt l’URI Session Pooler (aws-0-...pooler.supabase.com:5432) dans Supabase → Connect.'
        : '';
      return {
        ok: false,
        postgresConnected: false,
        restReachable: false,
        latencyMs: Date.now() - started,
        message: `Échec connexion PostgreSQL Supabase : ${sanitizeDatabaseError(rawMsg)}${ipv6Hint}`,
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
        message: urlCheck.error || 'URL Supabase invalide.',
      };
    }

    const apiKey = cfg.serviceRoleKey || cfg.anonKey;
    if (apiKey) {
      try {
        const res = await fetch(`${urlCheck.normalized}/rest/v1/products?select=id&limit=1`, {
          method: 'GET',
          headers: buildSupabaseRestHeaders(apiKey),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          restReachable = true;
          details.push('API REST Supabase OK (lecture dynamique active)');
        } else if (res.status === 401 || res.status === 403) {
          const txt = await res.text().catch(() => '');
          details.push(
            txt.includes('42501')
              ? 'Projet Supabase joignable, mais permissions manquantes (42501). Cliquez sur « SQL Complet Supabase », copiez le script et exécutez-le dans Supabase SQL Editor (ou ajoutez votre Service Role Key).'
              : `API REST Supabase HTTP ${res.status} — vérifiez vos clés ou permissions GRANT/RLS.`
          );
        } else if (res.status === 404) {
          restReachable = true;
          details.push(
            'Projet Supabase joignable (tables non encore créées — exécutez le script « SQL Complet Supabase »)'
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
    message: details.join(' · ') || 'Vérification terminée.',
  };
}

export async function executeSqlQuery(input: {
  target?: 'supabase';
  sql: string;
}): Promise<SqlExecutionResult> {
  const sql = String(input.sql || '').trim();
  if (!sql) {
    throw new Error('Veuillez saisir une requête SQL.');
  }
  if (sql.length > 20000) {
    throw new Error('Requête SQL trop longue (maximum 20 000 caractères).');
  }

  const started = Date.now();
  const cfg = getStoredSupabaseConfig();
  if (!cfg.postgresUri) {
    throw new Error(
      'URI PostgreSQL Supabase manquante. Enregistrez votre URI Supabase Session Pooler (Connection String) ci-dessus pour exécuter du SQL directement sur Supabase depuis ce tableau de bord, ou copiez le script SQL dans Supabase SQL Editor.'
    );
  }

  try {
    return await withPgClient(cfg.postgresUri, async (client) => {
      const res = await client.query(sql);
      const last = Array.isArray(res) ? res[res.length - 1] : res;
      const rows = Array.isArray(last?.rows) ? last.rows.slice(0, 200) : [];
      const columns =
        last?.fields?.map((f: { name: string }) => f.name) ||
        (rows.length > 0 ? Object.keys(rows[0]) : []);

      return {
        target: 'supabase',
        columns,
        rows,
        rowCount: typeof last?.rowCount === 'number' ? last.rowCount : rows.length,
        command: last?.command || 'SQL',
        durationMs: Date.now() - started,
      };
    });
  } catch (err) {
    throw new Error(sanitizeDatabaseError(err instanceof Error ? err.message : String(err)));
  }
}

export async function pushSchemaAndDataToSupabase(): Promise<{
  ok: boolean;
  mode: 'postgres' | 'rest';
  counts: { products: number; orders: number; messages: number; siteContent: number };
  message: string;
}> {
  const cfg = getStoredSupabaseConfig();
  const [products, orders, messages, siteContent] = await Promise.all([
    listProducts({ includeUnavailable: true }).catch(() => []),
    listOrders().catch(() => []),
    listContactMessages().catch(() => []),
    getSiteContent().catch(() => BASE_SITE_CONTENT),
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
              p.harvest_note_fr || '',
              p.harvest_note_en || '',
              p.harvest_note_ar || '',
              p.created_at || null,
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
              ord.customer_email || '',
              ord.city,
              ord.delivery_zone,
              ord.address,
              ord.delivery_method,
              ord.delivery_fee_mad,
              ord.subtotal_mad,
              ord.total_mad,
              ord.notes || '',
              ord.status,
              ord.email_status || 'pending_emailjs',
              ord.email_recipient || 'domaineessaoudi@gmail.com',
              JSON.stringify(ord.items || []),
              ord.created_at || null,
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
              msg.email || '',
              msg.subject,
              msg.message,
              msg.status,
              msg.created_at || null,
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
        mode: 'postgres',
        counts: {
          products: products.length,
          orders: orders.length,
          messages: messages.length,
          siteContent: 1,
        },
        message: `Tables créées & synchronisées sur Supabase : ${products.length} produits, ${orders.length} commandes, ${messages.length} messages.`,
      };
    } catch (err) {
      throw new Error(
        `Échec synchronisation Supabase PostgreSQL : ${sanitizeDatabaseError(
          err instanceof Error ? err.message : String(err)
        )}`
      );
    }
  }

  const urlCheck = validateSupabaseProjectUrl(cfg.projectUrl);
  if (!urlCheck.valid || !urlCheck.normalized || !cfg.serviceRoleKey) {
    throw new Error(
      'Pour synchroniser automatiquement vers Supabase, renseignez votre URI PostgreSQL Session Pooler (ou Service Role Key après avoir exécuté le script « SQL Complet Supabase » dans Supabase SQL Editor).'
    );
  }

  const headers = buildSupabaseRestHeaders(cfg.serviceRoleKey, {
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  });

  const pushRestTable = async (table: string, payload: unknown) => {
    const res = await fetch(`${urlCheck.normalized}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      if (res.status === 404 || txt.includes('PGRST205')) {
        throw new Error(
          `La table '${table}' n'existe pas encore sur Supabase. Copiez le script « SQL Complet Supabase » et exécutez-le dans Supabase SQL Editor.`
        );
      }
      throw new Error(`Erreur REST Supabase (${table} - HTTP ${res.status})`);
    }
  };

  await pushRestTable(
    'products',
    products.map((p) => ({
      ...p,
      available: Boolean(p.available),
      featured: Boolean(p.featured),
      variants_json: p.variants || [],
    }))
  );
  if (orders.length > 0) {
    await pushRestTable(
      'orders',
      orders.map((o) => ({
        id: o.id,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        customer_email: o.customer_email || '',
        city: o.city,
        delivery_zone: o.delivery_zone,
        address: o.address,
        delivery_method: o.delivery_method,
        delivery_fee_mad: o.delivery_fee_mad,
        subtotal_mad: o.subtotal_mad,
        total_mad: o.total_mad,
        notes: o.notes || '',
        status: o.status,
        email_status: o.email_status || 'pending_emailjs',
        email_recipient: o.email_recipient || 'domaineessaoudi@gmail.com',
        items_json: o.items || [],
        created_at: o.created_at,
      }))
    );
  }
  if (messages.length > 0) {
    await pushRestTable('contact_messages', messages);
  }
  await pushRestTable('site_content', {
    key: 'main',
    value_json: siteContent,
    updated_at: new Date().toISOString(),
  });

  return {
    ok: true,
    mode: 'rest',
    counts: {
      products: products.length,
      orders: orders.length,
      messages: messages.length,
      siteContent: 1,
    },
    message: `Données synchronisées via REST Supabase : ${products.length} produits, ${orders.length} commandes, ${messages.length} messages.`,
  };
}

export async function exportSupabaseFullSql(): Promise<string> {
  const [products, siteContent] = await Promise.all([
    listProducts({ includeUnavailable: true }).catch(() => []),
    getSiteContent().catch(() => BASE_SITE_CONTENT),
  ]);
  return buildSupabaseFullSql(products, siteContent);
}
