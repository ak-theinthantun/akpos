import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().trim().optional(),
    JWT_SECRET: z.string().trim().optional(),
    CORS_ORIGIN: z.string().trim().optional(),
  });

export type ServerEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl?: string;
  jwtSecret: string;
  corsOrigins: string[];
};

function parseCorsOrigins(value?: string) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

let cachedEnv: ServerEnv | null = null;
let cachedEnvKey = '';

export function getServerEnv(options?: { requireJwtSecret?: boolean }): ServerEnv {
  const requireJwtSecret = options?.requireJwtSecret ?? true;
  const cacheKey = JSON.stringify({ requireJwtSecret });
  if (cachedEnv && cachedEnvKey === cacheKey) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(', ');
    throw new Error(`Invalid server environment: ${message}`);
  }

  if (parsed.data.NODE_ENV === 'production' && !parsed.data.DATABASE_URL) {
    throw new Error('Invalid server environment: DATABASE_URL is required in production');
  }

  if (requireJwtSecret && parsed.data.NODE_ENV === 'production' && !parsed.data.JWT_SECRET) {
    throw new Error('Invalid server environment: JWT_SECRET is required');
  }

  cachedEnv = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    jwtSecret: parsed.data.JWT_SECRET ?? 'dev-secret',
    corsOrigins: parseCorsOrigins(parsed.data.CORS_ORIGIN),
  };
  cachedEnvKey = cacheKey;

  return cachedEnv;
}
