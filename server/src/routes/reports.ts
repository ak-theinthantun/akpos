import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { requireAuth } from '../middleware/require-auth';
import { getSalesSummary, listSaleSummaries } from '../persistence/sales-store';

export const reportsRouter = Router();
reportsRouter.use(asyncHandler(requireAuth));

reportsRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const summary = await getSalesSummary();
    return res.json({
      summary,
    });
  })
);

reportsRouter.get(
  '/sales',
  asyncHandler(async (_req, res) => {
    const sales = await listSaleSummaries();
    return res.json({
      sales,
    });
  })
);
