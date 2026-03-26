import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getServerEnv } from '../config/env';

export interface AuthUserRecord {
  id: string;
  name: string;
  username: string;
  password: string;
  role: string;
}

export interface AuthDeviceSessionRecord {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  device: {
    id: string;
    name: string;
    platform: string;
    appVersion: string;
    lastPullCursor: string | null;
  };
}

let pool: Pool | null = null;
const memorySessions = new Map<
  string,
  {
    refreshToken: string;
    userId: string;
    userName: string;
    userRole: string;
    deviceId: string;
  }
>();

function getPool() {
  const env = getServerEnv({ requireJwtSecret: false });
  if (!env.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
    });
  }
  return pool;
}

export async function ensureAuthSchema() {
  const db = getPool();
  if (!db) {
    return { mode: 'memory' as const };
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS auth_devices (
      id TEXT PRIMARY KEY,
      device_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      app_version TEXT NOT NULL,
      last_user_id TEXT,
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_pull_cursor TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      refresh_token TEXT NOT NULL,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  return { mode: 'postgres' as const };
}

export async function saveDeviceLogin(input: {
  user: AuthUserRecord;
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion: string;
}): Promise<AuthDeviceSessionRecord> {
  const db = getPool();
  const token = `session-${randomUUID()}`;
  const refreshToken = `refresh-${randomUUID()}`;

  if (!db) {
    memorySessions.set(token, {
      refreshToken,
      userId: input.user.id,
      userName: input.user.name,
      userRole: input.user.role,
      deviceId: input.deviceId,
    });

    return {
      token,
      refreshToken,
      user: {
        id: input.user.id,
        name: input.user.name,
        role: input.user.role,
      },
      device: {
        id: input.deviceId,
        name: input.deviceName,
        platform: input.platform,
        appVersion: input.appVersion,
        lastPullCursor: null,
      },
    };
  }

  await ensureAuthSchema();

  await db.query(
    `INSERT INTO auth_devices (id, device_name, platform, app_version, last_user_id, last_login_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       device_name = EXCLUDED.device_name,
       platform = EXCLUDED.platform,
       app_version = EXCLUDED.app_version,
       last_user_id = EXCLUDED.last_user_id,
       last_login_at = NOW()`,
    [input.deviceId, input.deviceName, input.platform, input.appVersion, input.user.id]
  );

  await db.query(
    `INSERT INTO auth_sessions (token, refresh_token, user_id, device_id, updated_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [token, refreshToken, input.user.id, input.deviceId]
  );

  const cursorResult = await db.query<{ last_pull_cursor: string | null }>(
    `SELECT last_pull_cursor
     FROM auth_devices
     WHERE id = $1`,
    [input.deviceId]
  );

  return {
    token,
    refreshToken,
    user: {
      id: input.user.id,
      name: input.user.name,
      role: input.user.role,
    },
    device: {
      id: input.deviceId,
      name: input.deviceName,
      platform: input.platform,
      appVersion: input.appVersion,
      lastPullCursor: cursorResult.rows[0]?.last_pull_cursor ?? null,
    },
  };
}

export async function updateDevicePullCursor(deviceId: string, cursor: string) {
  if (!deviceId) return;
  const db = getPool();
  if (!db) return;

  await ensureAuthSchema();

  await db.query(
    `UPDATE auth_devices
     SET last_pull_cursor = $2
     WHERE id = $1`,
    [deviceId, cursor]
  );
}

export async function findSessionByToken(token: string) {
  const db = getPool();
  if (!db) {
    const session = memorySessions.get(token);
    if (!session) return null;
    return {
      token,
      refreshToken: session.refreshToken,
      user: {
        id: session.userId,
        name: session.userName,
        role: session.userRole,
      },
      device: {
        id: session.deviceId,
      },
    };
  }

  await ensureAuthSchema();

  const result = await db.query<{
    token: string;
    refresh_token: string;
    user_id: string;
    device_id: string;
  }>(
    `SELECT token, refresh_token, user_id, device_id
     FROM auth_sessions
     WHERE token = $1`,
    [token]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    token: row.token,
    refreshToken: row.refresh_token,
    user: {
      id: row.user_id,
      name: row.user_id,
      role: 'unknown',
    },
    device: {
      id: row.device_id,
    },
  };
}
