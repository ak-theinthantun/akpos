import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().trim().optional(),
    JWT_SECRET: z.string().trim().min(1, 'JWT_SECRET is required'),
    CORS_ORIGIN: z.string().trim().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required in production',
      });
    }
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

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(', ');
    throw new Error(`Invalid server environment: ${message}`);
  }

  cachedEnv = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    jwtSecret: parsed.data.JWT_SECRET,
    corsOrigins: parseCorsOrigins(parsed.data.CORS_ORIGIN),
  };

  return cachedEnv;
}

