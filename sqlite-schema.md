# AKPOS SQLite Schema

## Notes

- all ids should be string ids generated on device
- use `TEXT` ids to avoid server/device id mismatch
- use `deleted_at` soft delete for sync-safe removals
- use `updated_at` on editable records
- use `created_at` on all records

## Core Tables

### devices

```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  last_sync_at TEXT,
  last_pull_cursor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### settings

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### categories

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### units

```sql
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  allow_decimal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### customers

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### suppliers

```sql
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### products

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  wholesale_price REAL NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL DEFAULT 0,
  category_id TEXT,
  unit_id TEXT,
  supplier_id TEXT,
  sku TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  current_stock REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### product_variant_types

```sql
CREATE TABLE product_variant_types (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### product_variant_options

```sql
CREATE TABLE product_variant_options (
  id TEXT PRIMARY KEY,
  variant_type_id TEXT NOT NULL,
  label TEXT NOT NULL,
  price_adjust REAL NOT NULL DEFAULT 0,
  current_stock REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

## Session And Cart

### day_sessions

```sql
CREATE TABLE day_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  opening_cash REAL NOT NULL,
  closing_cash REAL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  opened_by TEXT NOT NULL,
  total_sales REAL NOT NULL DEFAULT 0,
  session_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### carts

```sql
CREATE TABLE carts (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  customer_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### cart_items

```sql
CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_type_id TEXT,
  variant_option_id TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  custom_price_override INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Sales

### sales

```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  receipt_no TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  session_id TEXT,
  customer_id TEXT,
  staff_id TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  amount_paid REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  change_amount REAL NOT NULL DEFAULT 0,
  coupon_id TEXT,
  coupon_code TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### sale_items

```sql
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL,
  created_at TEXT NOT NULL
);
```

### sale_payments

```sql
CREATE TABLE sale_payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  customer_id TEXT,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Supplier Vouchers

### supplier_vouchers

```sql
CREATE TABLE supplier_vouchers (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  voucher_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  total_amount REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### supplier_voucher_items

```sql
CREATE TABLE supplier_voucher_items (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  line_total REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### supplier_voucher_costs

```sql
CREATE TABLE supplier_voucher_costs (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### supplier_payments

```sql
CREATE TABLE supplier_payments (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Coupons

### coupons

```sql
CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  used INTEGER NOT NULL DEFAULT 0,
  source_sale_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

## Inventory

### stock_movements

```sql
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_option_id TEXT,
  movement_type TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  quantity_delta REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  effective_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Receipts

### receipt_gallery

```sql
CREATE TABLE receipt_gallery (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  receipt_no TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  total REAL NOT NULL,
  item_count INTEGER NOT NULL,
  customer_name TEXT,
  created_at TEXT NOT NULL
);
```

## Sync

### sync_queue

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  device_id TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);
```

### sync_state

```sql
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Suggested Indexes

```sql
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_session_id ON sales(session_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX idx_supplier_vouchers_supplier_id ON supplier_vouchers(supplier_id);
CREATE INDEX idx_supplier_payments_voucher_id ON supplier_payments(voucher_id);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_sync_queue_status_created_at ON sync_queue(status, created_at);
```

## Queue Operation Examples

Use small explicit operations like:

- `product.upsert`
- `customer.upsert`
- `customer.delete`
- `sale.create`
- `sale_payment.create`
- `voucher.create`
- `supplier_payment.create`
- `coupon.create`

This is easier to debug than one generic event name.
