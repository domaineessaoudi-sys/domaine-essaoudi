import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { SQL_PRESETS, SUPABASE_SCHEMA_SQL } from '../utils/supabaseSql';

interface SupabaseStatusSummary {
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

interface SqlExecutionResult {
  target: 'supabase';
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  command: string;
  durationMs: number;
}

interface AdminSqlEditorProps {
  adminToken: string;
  showToast: (msg: string) => void;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function AdminSqlEditor({ adminToken, showToast }: AdminSqlEditorProps) {
  const [status, setStatus] = useState<SupabaseStatusSummary | null>(null);
  const [projectUrl, setProjectUrl] = useState('');
  const [postgresUri, setPostgresUri] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');

  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [sqlQuery, setSqlQuery] = useState<string>(SQL_PRESETS[0].sql);
  const [executingSql, setExecutingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState<SqlExecutionResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const loadSupabaseStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/supabase/config', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.supabase) {
        setStatus(data.supabase);
        setProjectUrl(data.supabase.projectUrl || '');
      }
    } catch {
      // ignore network error
    }
  }, [adminToken]);

  useEffect(() => {
    loadSupabaseStatus();
  }, [loadSupabaseStatus]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConnectionFeedback(null);
    try {
      const res = await fetch('/api/admin/supabase/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          projectUrl,
          anonKey: anonKey.trim() || undefined,
          serviceRoleKey: serviceRoleKey.trim() || undefined,
          postgresUri: postgresUri.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectionFeedback({
          ok: false,
          message: data.error || 'Impossible d’enregistrer la configuration Supabase.',
        });
        return;
      }
      setStatus(data.supabase);
      setPostgresUri('');
      setAnonKey('');
      setServiceRoleKey('');
      setConnectionFeedback({
        ok: true,
        message: 'Paramètres Supabase enregistrés de manière sécurisée côté serveur.',
      });
      showToast('Configuration Supabase enregistrée');
    } catch {
      setConnectionFeedback({
        ok: false,
        message: 'Erreur réseau lors de l’enregistrement Supabase.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnectionFeedback(null);
    try {
      const res = await fetch('/api/admin/supabase/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setConnectionFeedback({
        ok: Boolean(data.ok),
        message: data.message || (data.ok ? 'Connexion réussie.' : 'Connexion échouée.'),
      });
      showToast(data.ok ? 'Connexion Supabase réussie' : 'Échec du test Supabase');
    } catch {
      setConnectionFeedback({
        ok: false,
        message: 'Erreur réseau pendant le test Supabase.',
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setSyncingData(true);
    setConnectionFeedback(null);
    try {
      const res = await fetch('/api/admin/supabase/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setConnectionFeedback({
          ok: false,
          message: data.error || 'La synchronisation Supabase a échoué.',
        });
        return;
      }
      setConnectionFeedback({ ok: true, message: data.message });
      showToast('Données synchronisées vers Supabase');
    } catch {
      setConnectionFeedback({
        ok: false,
        message: 'Erreur réseau pendant la synchronisation Supabase.',
      });
    } finally {
      setSyncingData(false);
    }
  };

  const handleDisconnect = async () => {
    setConnectionFeedback(null);
    const res = await fetch('/api/admin/supabase/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setStatus(data.supabase);
      setProjectUrl('');
      setPostgresUri('');
      setAnonKey('');
      setServiceRoleKey('');
      setConnectionFeedback({
        ok: true,
        message: 'Identifiants Supabase effacés du serveur.',
      });
      showToast('Supabase déconnecté');
    }
  };

  const handleRunSql = async () => {
    setExecutingSql(true);
    setSqlError(null);
    try {
      const res = await fetch('/api/admin/sql/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ target: 'supabase', sql: sqlQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSqlResult(null);
        setSqlError(data.error || 'Erreur lors de l’exécution de la requête SQL.');
        return;
      }
      setSqlResult(data.result);
    } catch {
      setSqlResult(null);
      setSqlError('Erreur réseau lors de l’exécution SQL.');
    } finally {
      setExecutingSql(false);
    }
  };

  const handleCopySql = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedSchema(true);
      showToast('SQL copié dans le presse-papiers');
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch {
      showToast('Copiez le SQL manuellement depuis l’éditeur');
    }
  };

  const handleLoadFullSupabaseSql = async () => {
    setSqlError(null);
    try {
      const res = await fetch('/api/admin/supabase/export-sql', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        setSqlError('Impossible de générer le script SQL Supabase.');
        return;
      }
      const data = await res.json();
      if (data.sql) {
        setSqlQuery(data.sql);
        showToast('Script SQL complet chargé (prêt à coller dans Supabase)');
      }
    } catch {
      setSqlError('Erreur réseau lors de la génération du SQL.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Supabase Connection Card */}
      <div className="bg-[#12222B] rounded-2xl border border-[#1E3444] p-6 sm:p-7 space-y-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1E3444]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
              <Database className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#EEF6FA]">
                Base de Données Dynamique Supabase (PostgreSQL &amp; REST)
              </h2>
              <p className="text-xs text-[#7A98A8]">
                Toutes les données du domaine (produits, commandes, messages et contenu) sont
                connectées à votre projet Supabase.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              status?.connectedMode === 'postgres'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : status?.connectedMode === 'rest'
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            {status?.connectedMode === 'postgres'
              ? 'Supabase PostgreSQL Connecté'
              : status?.connectedMode === 'rest'
                ? 'Supabase REST Configuré'
                : 'Supabase Non Configuré'}
          </span>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="supabase-project-url"
                className="block text-xs font-medium text-[#8AA4B4] mb-1"
              >
                Supabase Project URL
              </label>
              <input
                id="supabase-project-url"
                type="url"
                dir="ltr"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://dfqyzoxomnqnkfhtyfti.supabase.co"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
              />
            </div>

            <div>
              <label
                htmlFor="supabase-postgres-uri"
                className="block text-xs font-medium text-[#8AA4B4] mb-1"
              >
                Supabase Postgres Connection URI (Session Pooler pour SQL Editor &amp; Sync)
              </label>
              <input
                id="supabase-postgres-uri"
                type="password"
                dir="ltr"
                autoComplete="off"
                value={postgresUri}
                onChange={(e) => setPostgresUri(e.target.value)}
                placeholder={
                  status?.hasPostgresUri
                    ? `Enregistrée : ${status.postgresUriMasked}`
                    : 'postgresql://postgres.ref:MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
                }
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
              />
              <p className="text-[11px] text-[#7A98A8] mt-1">
                Remplacez <code className="font-mono text-[#38BDF8]">[YOUR-DATABASE-PASSWORD]</code> par votre mot
                de passe (Session Pooler IPv4 dans Supabase → Connect).
              </p>
            </div>

            <div>
              <label
                htmlFor="supabase-anon-key"
                className="block text-xs font-medium text-[#8AA4B4] mb-1"
              >
                Supabase Publishable / Anon Key
              </label>
              <input
                id="supabase-anon-key"
                type="password"
                dir="ltr"
                autoComplete="off"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder={
                  status?.hasAnonKey
                    ? `Enregistrée : ${status.anonKeyMasked}`
                    : 'sb_publishable_... / eyJ...'
                }
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
              />
            </div>

            <div>
              <label
                htmlFor="supabase-service-key"
                className="block text-xs font-medium text-[#8AA4B4] mb-1"
              >
                Supabase Secret / Service Role Key (écriture serveur sans blocage RLS)
              </label>
              <input
                id="supabase-service-key"
                type="password"
                dir="ltr"
                autoComplete="off"
                value={serviceRoleKey}
                onChange={(e) => setServiceRoleKey(e.target.value)}
                placeholder={
                  status?.hasServiceRoleKey
                    ? `Enregistrée : ${status.serviceRoleKeyMasked}`
                    : 'sb_secret_... / eyJ...'
                }
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
              />
            </div>
          </div>

          {connectionFeedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                connectionFeedback.ok
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-red-950/60 text-red-200 border-red-800'
              }`}
            >
              {connectionFeedback.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{savingConfig ? 'Enregistrement…' : 'Enregistrer la connexion'}</span>
            </button>

            <button
              type="button"
              disabled={testingConn}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1E3444] bg-[#0B151C] text-[#EEF6FA] hover:bg-[#162833] disabled:opacity-60 text-xs font-semibold transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${testingConn ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{testingConn ? 'Test en cours…' : 'Tester la connexion'}</span>
            </button>

            <button
              type="button"
              disabled={syncingData}
              onClick={handleSyncToSupabase}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#00C9A7]/40 bg-[#00C9A7]/10 hover:bg-[#00C9A7]/20 disabled:opacity-60 text-[#00C9A7] text-xs font-semibold transition-colors"
            >
              <UploadCloud className="w-4 h-4" aria-hidden="true" />
              <span>
                {syncingData
                  ? 'Synchronisation…'
                  : 'Créer les tables & Synchroniser vers Supabase'}
              </span>
            </button>

            {(status?.projectUrl || status?.hasPostgresUri || status?.hasServiceRoleKey) && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-800/40 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-xs font-semibold transition-colors ms-auto"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Déconnecter</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Interactive Supabase SQL Editor */}
      <div className="bg-[#12222B] rounded-2xl border border-[#1E3444] p-6 sm:p-7 space-y-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-sky-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-[#EEF6FA]">
                SQL Editor — Supabase PostgreSQL
              </h2>
              <p className="text-xs text-[#7A98A8]">
                Exécutez vos requêtes SQL directement sur Supabase PostgreSQL (via Session Pooler
                URI) ou copiez le script complet dans votre Supabase SQL Editor.
              </p>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl border border-[#1E3444] bg-[#0B151C] text-xs font-semibold text-[#EEF6FA]">
            Cible : Supabase PostgreSQL {status?.hasPostgresUri ? '(Prêt)' : '(URI requise)'}
          </span>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {SQL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSqlQuery(preset.sql);
                setSqlError(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-[#1E3444] bg-[#0B151C] hover:bg-[#162833] text-xs font-medium text-[#EEF6FA] transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Editor Textarea */}
        <div className="space-y-3">
          <label htmlFor="admin-sql-textarea" className="sr-only">
            Requête SQL Supabase
          </label>
          <textarea
            id="admin-sql-textarea"
            dir="ltr"
            rows={11}
            spellCheck={false}
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunSql();
              }
            }}
            placeholder="SELECT id, name_fr, price_mad, stock FROM public.products;"
            className="w-full p-4 rounded-xl border border-[#1E3444] bg-[#070E13] text-[#67D4F8] font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={executingSql}
                onClick={handleRunSql}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{executingSql ? 'Exécution…' : 'Exécuter sur Supabase (Ctrl+Entrée)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopySql(sqlQuery)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#1E3444] bg-[#0B151C] hover:bg-[#162833] text-xs font-semibold text-[#EEF6FA] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copier cette requête</span>
              </button>

              <button
                type="button"
                onClick={handleLoadFullSupabaseSql}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#00C9A7]/40 bg-[#00C9A7]/10 hover:bg-[#00C9A7]/20 text-xs font-semibold text-[#00C9A7] transition-colors"
              >
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>SQL Complet Supabase (Tables + Permissions + Produits réels)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopySql(SUPABASE_SCHEMA_SQL)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#1E3444] bg-[#0B151C] hover:bg-[#162833] text-xs font-semibold text-[#EEF6FA] transition-colors"
              >
                {copiedSchema ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Copier le Schema + Permissions SQL</span>
              </button>
            </div>

            {sqlResult && (
              <span className="text-xs font-mono text-[#7A98A8]" dir="ltr">
                SUPABASE · {sqlResult.command} · {sqlResult.rowCount} ligne(s) ·{' '}
                {sqlResult.durationMs} ms
              </span>
            )}
          </div>
        </div>

        {/* Error Box */}
        {sqlError && (
          <div className="p-3.5 rounded-xl bg-red-950/60 text-red-200 border border-red-800 text-xs font-mono whitespace-pre-wrap">
            {sqlError}
          </div>
        )}

        {/* Result Grid */}
        {sqlResult && (
          <div className="rounded-xl border border-[#1E3444] overflow-hidden bg-[#0B151C]">
            <div className="overflow-x-auto">
              {sqlResult.rows.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#7A98A8]">
                  Requête exécutée ({sqlResult.command}) — 0 ligne retournée en {sqlResult.durationMs}{' '}
                  ms.
                </div>
              ) : (
                <table className="w-full text-xs text-start" dir="ltr">
                  <thead>
                    <tr className="bg-[#0E1A22] border-b border-[#1E3444] text-[#7A98A8]">
                      {sqlResult.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-mono font-semibold text-start">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2E3B] text-[#C5D9E5]">
                    {sqlResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#162833] transition-colors">
                        {sqlResult.columns.map((col) => {
                          const val = row[col];
                          const formatted = formatCellValue(val);
                          return (
                            <td
                              key={col}
                              className={`py-2 px-3 font-mono max-w-xs truncate ${
                                val === null || val === undefined
                                  ? 'text-[#7A98A8]/60 italic'
                                  : 'text-[#EEF6FA]'
                              }`}
                              title={formatted}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
