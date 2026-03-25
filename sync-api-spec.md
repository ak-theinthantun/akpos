# AKPOS Sync API Spec

## Goal

Provide a simple, idempotent sync API for multiple offline Android devices.

The sync cycle should always be:

1. authenticate device
2. push pending local changes
3. pull remote changes since cursor

## Auth

### POST `/auth/login`

Use username/password to sign in and register the device session.

Request:

```json
{
  "username": "staff",
  "password": "1234",
  "deviceId": "device_123",
  "deviceName": "Samsung Tab A9 Front Desk",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

Response:

```json
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "u2",
    "name": "Staff One",
    "role": "staff"
  },
  "shop": {
    "id": "shop_1",
    "name": "AKPOS"
  },
  "device": {
    "id": "device_123",
    "lastPullCursor": null
  }
}
```

### POST `/auth/refresh`

Refresh access token.

## Push Sync

### POST `/sync/push`

Headers:

- `Authorization: Bearer <token>`

Request:

```json
{
  "deviceId": "device_123",
  "items": [
    {
      "queueId": "queue_1",
      "entityType": "sale",
      "entityId": "sale_1001",
      "operation": "sale.create",
      "createdAt": "2026-03-25T10:12:00.000Z",
      "payload": {
        "sale": {},
        "saleItems": [],
        "payments": [],
        "stockMovements": []
      }
    }
  ]
}
```

Response:

```json
{
  "acked": [
    {
      "queueId": "queue_1",
      "entityId": "sale_1001",
      "status": "synced"
    }
  ],
  "rejected": []
}
```

## Push Rules

- server must be idempotent by `entityId` and `operation`
- duplicate pushes must not create duplicate sales
- if one item fails, return it in `rejected` with reason
- do not reject the whole batch unless auth or payload is invalid

## Pull Sync

### GET `/sync/pull?cursor=<cursor>`

Headers:

- `Authorization: Bearer <token>`

Response:

```json
{
  "cursor": "cur_2026_03_25_001",
  "changes": {
    "users": [],
    "settings": [],
    "categories": [],
    "units": [],
    "customers": [],
    "suppliers": [],
    "products": [],
    "productVariantTypes": [],
    "productVariantOptions": [],
    "coupons": [],
    "daySessions": [],
    "sales": [],
    "salePayments": [],
    "supplierVouchers": [],
    "supplierVoucherItems": [],
    "supplierVoucherCosts": [],
    "supplierPayments": [],
    "stockMovements": []
  }
}
```

## Pull Rules

- return only changes after cursor
- include soft deletes with `deletedAt`
- include enough related rows to update local cache safely
- send stable timestamps/cursors from server

## Suggested Payload Shapes

Each returned record should be normalized and close to the SQLite schema.

Example product:

```json
{
  "id": "p1",
  "name": "Coca Cola",
  "price": 1200,
  "wholesalePrice": 1000,
  "costPrice": 800,
  "categoryId": "c1",
  "unitId": "un1",
  "supplierId": "s1",
  "sku": "COC-001",
  "image": "",
  "active": true,
  "currentStock": 14,
  "createdAt": "2026-03-20T00:00:00.000Z",
  "updatedAt": "2026-03-24T08:00:00.000Z",
  "deletedAt": null
}
```

## Admin Endpoints

### POST `/coupons`

Create one-time coupon.

### POST `/sales/:saleId/payments`

Receive customer credit payment.

### POST `/supplier-vouchers/:voucherId/payments`

Record supplier payment.

### POST `/day-sessions/open`

Open day session.

### POST `/day-sessions/:id/close`

Close day session.

## Conflict Policy

### Sales

- append-only
- if `sale.id` already exists, treat as duplicate and ack safely

### Customer payments

- append-only
- payment record id must be unique

### Products/customers/suppliers

- last-write-wins by `updatedAt`
- prefer server timestamps after write

### Settings

- admin/server wins

## Error Shape

Return structured errors:

```json
{
  "code": "COUPON_ALREADY_USED",
  "message": "Coupon is no longer available.",
  "details": {
    "couponId": "cp_1"
  }
}
```

## Recommended Server Modules

- `auth`
- `devices`
- `sync`
- `users`
- `products`
- `customers`
- `suppliers`
- `sales`
- `payments`
- `vouchers`
- `coupons`
- `reports`

## First Backend Deliverables

Build these first:

1. `POST /auth/login`
2. `POST /sync/push`
3. `GET /sync/pull`
4. `POST /sales/:saleId/payments`
5. `POST /supplier-vouchers/:voucherId/payments`

That is enough to support the first offline sale flow.
