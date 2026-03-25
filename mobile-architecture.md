# AKPOS Mobile Architecture

## Goal

Build `AKPOS` as an Android-first, offline-first POS app for:

- one admin device
- multiple manager/staff devices
- intermittent or no internet
- automatic sync to a central server when online

The current web app remains the product reference for behavior and UI.

## Recommended Stack

### Mobile

- Expo React Native
- TypeScript
- React Navigation
- `expo-sqlite`
- `@tanstack/react-query` for sync/network flows
- `expo-secure-store` for auth/session secrets
- `@react-native-community/netinfo` for online/offline detection

### Backend

- Node.js API
- PostgreSQL
- JWT auth with device-aware sessions
- incremental sync endpoints

### Build and release

- Expo EAS Build
- `.apk` for internal testing
- `.aab` for Play Store release

## Core Principle

The app must be **local-first**.

Every important action should:

1. save to local SQLite immediately
2. update UI immediately
3. append a row into `sync_queue`
4. sync to server later when online

Cashier flow must never depend on live internet.

## Multi-Device Strategy

Because multiple devices may sell at the same time, we should not sync final stock numbers directly.

Instead, sync **movements and transactions**:

- sales
- sale payments
- purchase vouchers
- supplier payments
- stock adjustments
- returns
- coupons

Then the server computes consolidated stock and reporting state.

## Source Of Truth

### On device

SQLite is the operational source of truth for the running device.

It stores:

- product snapshot
- customers
- suppliers
- local cart/session state
- unsynced transactions
- sync metadata

### On server

Postgres is the shared long-term source of truth across devices.

It stores:

- global product catalog
- users and roles
- all synced transactions
- consolidated stock
- central reports
- backups and audit trail

## Domain Boundaries

Split the current app into 4 layers.

### 1. UI layer

React Native screens and components only.

Examples:

- sale screen
- cart review
- orders
- products
- customers
- suppliers
- reports
- settings

### 2. Application layer

Use-case functions that express business actions.

Examples:

- add to cart
- complete sale
- receive customer payment
- save supplier voucher
- open day session
- apply coupon

### 3. Local data layer

SQLite repositories for reading and writing entities.

Examples:

- `salesRepository`
- `productsRepository`
- `customersRepository`
- `syncQueueRepository`

### 4. Sync layer

Responsible for:

- push local changes
- pull remote changes
- resolve conflicts
- update sync status

## Device Model

Each device should have:

- `device_id`
- `shop_id`
- `device_name`
- `platform`
- `app_version`
- `last_sync_at`
- `last_pulled_cursor`

This is required for troubleshooting, audit logs, and sync safety.

## Conflict Rules

Use different rules per entity type.

### Append-only or transaction-safe

- sales
- sale_items
- customer payments
- supplier payments
- stock movements

Rule:

- do not overwrite
- create immutable records
- server accepts once by stable id

### Editable master data

- products
- customers
- suppliers

Rule:

- last-write-wins with `updated_at`
- keep soft delete

### Settings and permissions

- app settings
- roles
- PIN / control settings

Rule:

- server/admin wins

## Stock Model

Do not trust `products.stock` as the final shared truth in a multi-device environment.

Use stock movement records like:

- `sale`
- `purchase`
- `adjustment`
- `return`

Server recomputes current stock from movements.

Device can still keep a cached `current_stock` for fast UI, but that value is just the last synced estimate.

## Sales And Credit Model

Current POS behavior already supports:

- cash sale
- partial payment
- credit sale for registered customers
- later payment records

For mobile, keep that same model:

- `amount_paid`
- `total`
- `balance_due`
- `payment_method`
- `payment_status`

Customer payments should be stored as separate records linked to the sale and customer.

## Sync Flow

### Push

Device sends all `pending` queue records in order.

Server:

- validates auth and device
- applies records idempotently
- returns ack list

Device:

- marks queue rows as `synced`

### Pull

Device requests all changes since last cursor.

Server returns:

- changed products
- changed customers
- changed suppliers
- changed users
- changed settings
- newly synced transactions relevant to the device or shop
- next cursor

Device writes them locally in a transaction.

## Sync Triggers

Run sync:

- after login
- when app becomes online
- when app returns to foreground
- every few minutes while online
- manually from settings if needed

## Failure Handling

If sync fails:

- local work stays safe
- queue remains pending
- user can continue selling
- admin can see sync health later

Add simple states:

- `pending`
- `syncing`
- `synced`
- `failed`

## Security

- use secure token storage
- never store plain passwords in SQLite
- protect price lock PIN and session tokens
- register devices explicitly
- allow server-side device revocation

## Suggested Migration Phases

### Phase 1

Create shared architecture and schema docs.

### Phase 2

Extract current business logic from the reducer into reusable use-case functions.

### Phase 3

Build backend auth and sync API.

### Phase 4

Scaffold Expo app and SQLite repositories.

### Phase 5

Port the sale flow first:

- login
- day session
- products grid
- cart review
- complete sale
- receipt view

### Phase 6

Port:

- orders
- customers
- suppliers
- payments
- coupons

### Phase 7

Add:

- reports
- gallery/export
- printer integrations
- production deployment

## First Implementation Deliverables

The first coding milestone should create:

- mobile app workspace
- SQLite migrations
- repositories for products/customers/sales/sync_queue
- sync client
- auth/device bootstrap
- sale flow shell

## Non-Goals For First Release

Avoid these in the first Android release:

- advanced live collaboration UX
- real-time websocket inventory locking
- deep analytics dashboards
- full printer hardware matrix support

The first release should prioritize:

- reliable offline sales
- customer credit
- supplier vouchers
- payment tracking
- safe sync
