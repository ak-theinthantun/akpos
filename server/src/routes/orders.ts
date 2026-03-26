import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { requireAuth } from '../middleware/require-auth';
import { getSyncedSaleById, listSaleSummaries } from '../persistence/sales-store';

export const ordersRouter = Router();
ordersRouter.use(asyncHandler(requireAuth));

ordersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const orders = await listSaleSummaries();
    return res.json({
      orders,
    });
  })
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const sale = await getSyncedSaleById(orderId);
    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: 'Order not found.',
      });
    }

    return res.json({
      order: sale,
    });
  })
);
