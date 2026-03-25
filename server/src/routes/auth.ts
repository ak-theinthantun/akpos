import { Router } from 'express';
import { z } from 'zod';
import { demoUsers } from '../data/demo';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  platform: z.string().min(1),
  appVersion: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid login payload.',
      issues: parsed.error.flatten(),
    });
  }

  const user = demoUsers.find(
    candidate => candidate.username === parsed.data.username && candidate.password === parsed.data.password
  );

  if (!user) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid username or password.',
    });
  }

  return res.json({
    token: `dev-token-${user.id}`,
    refreshToken: `dev-refresh-${user.id}`,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    shop: {
      id: 'shop_1',
      name: 'AKPOS',
    },
    device: {
      id: parsed.data.deviceId,
      lastPullCursor: null,
    },
  });
});
