import fs from 'node:fs';
import path from 'node:path';

export interface StoredAdminAuth {
  passwordHash: string;
  salt: string;
  updatedAt: string;
}

export interface StoredAdminSession {
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredSupabaseConfig {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  postgresUri: string;
  updatedAt: string;
}

interface RuntimeState {
  adminAuth: StoredAdminAuth | null;
  adminSessions: StoredAdminSession[];
  supabaseConfig: StoredSupabaseConfig;
}

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const statePath = path.join(dataDir, 'runtime-state.json');

const EMPTY_STATE: RuntimeState = {
  adminAuth: null,
  adminSessions: [],
  supabaseConfig: {
    projectUrl: '',
    anonKey: '',
    serviceRoleKey: '',
    postgresUri: '',
    updatedAt: '',
  },
};

let memoryState: RuntimeState | null = null;

function readState(): RuntimeState {
  if (memoryState) {
    return memoryState;
  }
  try {
    if (!fs.existsSync(statePath)) {
      memoryState = structuredClone(EMPTY_STATE);
      return memoryState;
    }
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RuntimeState>;
    memoryState = {
      adminAuth: parsed.adminAuth || null,
      adminSessions: Array.isArray(parsed.adminSessions) ? parsed.adminSessions : [],
      supabaseConfig: {
        ...EMPTY_STATE.supabaseConfig,
        ...(parsed.supabaseConfig || {}),
      },
    };
    return memoryState;
  } catch {
    memoryState = structuredClone(EMPTY_STATE);
    return memoryState;
  }
}

function writeState(next: RuntimeState): void {
  memoryState = next;
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2), { mode: 0o600 });
  } catch {
    // Ignore persistence errors in read-only serverless environments
  }
}

export function getStoredAdminAuth(): StoredAdminAuth | null {
  return readState().adminAuth;
}

export function setStoredAdminAuthIfUnset(auth: StoredAdminAuth): boolean {
  const state = readState();
  if (state.adminAuth) return false;
  state.adminAuth = auth;
  writeState(state);
  return true;
}

export function addAdminSession(session: StoredAdminSession): void {
  const state = readState();
  const nowMs = Date.now();
  state.adminSessions = state.adminSessions
    .filter((s) => new Date(s.expiresAt).getTime() > nowMs)
    .concat(session);
  writeState(state);
}

export function hasValidAdminSession(tokenHash: string): boolean {
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

export function removeAdminSession(tokenHash: string): void {
  const state = readState();
  const before = state.adminSessions.length;
  state.adminSessions = state.adminSessions.filter((s) => s.tokenHash !== tokenHash);
  if (state.adminSessions.length !== before) {
    writeState(state);
  }
}

export function getStoredSupabaseConfig(): StoredSupabaseConfig {
  const cfg = readState().supabaseConfig;
  return {
    projectUrl: (
      cfg.projectUrl ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ''
    ).trim(),
    anonKey: (
      cfg.anonKey ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim(),
    serviceRoleKey: (
      cfg.serviceRoleKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      ''
    ).trim(),
    postgresUri: (
      cfg.postgresUri ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      ''
    ).trim(),
    updatedAt: cfg.updatedAt || '',
  };
}

export function saveStoredSupabaseConfig(config: StoredSupabaseConfig): void {
  const state = readState();
  state.supabaseConfig = config;
  writeState(state);
}
